const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const Journey = require('../models/Journey');
const Contact = require('../models/Contact');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendEmergencyNotifications } = require('../utils/notification');
const { sendPushNotification } = require('../utils/pushNotification');

// @desc    Trigger a new SOS Alert
// @route   POST /api/alerts/trigger
// @access  Private
router.post('/trigger', protect, async (req, res) => {
  const { latitude, longitude, triggerType } = req.body;

  try {
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide GPS coordinates' });
    }

    // Find any active journey
    const journey = await Journey.findOne({
      user: req.user.id,
      status: { $in: ['active', 'grace_period', 'check_in_requested'] },
    });

    if (journey) {
      journey.status = 'sos_triggered';
      await journey.save();
    }

    // Create active SOS alert record
    const alert = await Alert.create({
      user: req.user.id,
      journey: journey ? journey._id : undefined,
      latitude,
      longitude,
      triggerType: triggerType || 'manual_sos',
      status: 'active',
    });

    // Fetch user emergency contacts to return and notify
    const contacts = await Contact.find({ user: req.user.id });

    // Send actual emergency alerts to guardians (Email/SMS)
    sendEmergencyNotifications(req.user, alert, contacts).catch(err => {
      console.error('Error triggering emergency alerts:', err);
    });

    // Find nearby neighbors (within 1 km) to notify
    let nearbyNeighbors = [];
    try {
      nearbyNeighbors = await User.find({
        _id: { $ne: req.user.id },
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: 1000,
          },
        },
      });
    } catch (err) {
      console.error('Error finding nearby neighbors:', err);
    }

    // Broadcast real-time emergency alert via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('sos_triggered', {
        alertId: alert._id,
        user: {
          id: req.user.id,
          name: req.user.name,
          phone: req.user.phone,
          email: req.user.email,
        },
        journey: journey ? {
          destinationName: journey.destinationName,
          travelMode: journey.travelMode,
          vehicleNumber: journey.vehicleNumber,
        } : null,
        latitude,
        longitude,
        triggerType: alert.triggerType,
        contacts: contacts.map(c => ({ name: c.name, phone: c.phone, email: c.email })),
        createdAt: alert.createdAt,
      });

      // Send direct alerts to each nearby neighbor
      nearbyNeighbors.forEach(neighbor => {
        io.to(neighbor._id.toString()).emit('nearby_sos_alert', {
          alertId: alert._id,
          user: {
            id: req.user.id,
            name: req.user.name,
            phone: req.user.phone,
          },
          latitude,
          longitude,
          createdAt: alert.createdAt,
        });

        // Send push notification to neighbor
        if (neighbor.fcmToken) {
          sendPushNotification(
            neighbor.fcmToken,
            '🚨 NEIGHBOR EMERGENCY ALERT',
            `${req.user.name} is in danger nearby! Tap to see their location.`,
            {
              type: 'nearby_sos',
              alertId: alert._id.toString(),
              latitude: latitude.toString(),
              longitude: longitude.toString(),
            }
          );
        }
      });

      // Send push notification to user themselves
      if (req.user.fcmToken) {
        sendPushNotification(
          req.user.fcmToken,
          '🚨 SOS ALERT TRIGGERED',
          'An emergency alert has been sent to your guardians and nearby neighbors.',
          {
            type: 'sos_escalated',
            alertId: alert._id.toString(),
          }
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'SOS Alert triggered successfully',
      data: alert,
      contacts: contacts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// @desc    Resolve an SOS Alert
// @route   POST /api/alerts/resolve
// @access  Private
router.post('/resolve', protect, async (req, res) => {
  try {
    // Find active alert for this user
    const alert = await Alert.findOne({
      user: req.user.id,
      status: 'active',
    });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'No active SOS alert found for this user' });
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    await alert.save();

    // If there was a journey in SOS state, resolve its status to completed
    if (alert.journey) {
      const journey = await Journey.findById(alert.journey);
      if (journey && journey.status === 'sos_triggered') {
        journey.status = 'completed';
        journey.completedAt = new Date();
        await journey.save();
      }
    }

    // Broadcast WebSocket event
    const io = req.app.get('io');
    if (io) {
      io.emit('sos_resolved', {
        alertId: alert._id,
        userId: req.user.id,
      });
    }

    res.json({ success: true, message: 'SOS Alert resolved', data: alert });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get all active SOS Alerts (for Dashboard)
// @route   GET /api/alerts/active
// @access  Private
router.get('/active', protect, async (req, res) => {
  try {
    const alerts = await Alert.find({ status: 'active' })
      .populate('user', 'name phone email')
      .populate('journey', 'destinationName travelMode vehicleNumber')
      .populate('responders.user', 'name phone email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Respond to an SOS Alert (as a neighbor)
// @route   POST /api/alerts/:id/respond
// @access  Private
router.post('/:id/respond', protect, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    if (alert.status === 'resolved') {
      return res.status(400).json({ success: false, message: 'Alert has already been resolved' });
    }

    // Check if already responding
    const alreadyResponding = alert.responders.some(r => r.user.toString() === req.user.id);
    if (alreadyResponding) {
      return res.json({ success: true, message: 'Already marked as responding', data: alert });
    }

    alert.responders.push({ user: req.user.id, status: 'responding' });
    await alert.save();

    // Fetch updated alert with responder details populated
    const updatedAlert = await Alert.findById(req.params.id)
      .populate('user', 'name phone email')
      .populate('responders.user', 'name phone email');

    // Broadcast WebSocket event
    const io = req.app.get('io');
    if (io) {
      // Notify the user in danger that someone is responding
      io.to(alert.user.toString()).emit('responder_updated', {
        alertId: alert._id,
        responder: {
          id: req.user.id,
          name: req.user.name,
          phone: req.user.phone,
        },
        status: 'responding',
      });

      // Notify all dashboard rooms
      io.emit('dashboard_responder_updated', {
        alertId: alert._id,
        responders: updatedAlert.responders,
      });

      // Send push notification to user in danger
      User.findById(alert.user).then(userInDanger => {
        if (userInDanger && userInDanger.fcmToken) {
          sendPushNotification(
            userInDanger.fcmToken,
            '🛡️ Responder is on the way!',
            `${req.user.name} has responded to your SOS and is on their way to help you.`,
            {
              type: 'responder_responding',
              alertId: alert._id.toString(),
              responderName: req.user.name,
              responderPhone: req.user.phone,
            }
          );
        }
      }).catch(err => console.error('Error fetching user in danger for responder notification:', err));
    }

    res.json({ success: true, message: 'Marked as responding', data: updatedAlert });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

