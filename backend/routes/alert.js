const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const Journey = require('../models/Journey');
const Contact = require('../models/Contact');
const { protect } = require('../middleware/auth');

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
      .sort({ createdAt: -1 });

    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
