const express = require('express');
const router = express.Router();
const Journey = require('../models/Journey');
const Alert = require('../models/Alert');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Haversine formula to compute geodesic distance in meters
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// @desc    Start a new journey
// @route   POST /api/journey/start
// @access  Private
router.post('/start', protect, async (req, res) => {
  const {
    destinationName,
    destinationLatitude,
    destinationLongitude,
    destinationRadius,
    travelMode,
    vehicleNumber,
    expectedReachTime, // ISO string or timestamp
    currentLatitude,
    currentLongitude,
  } = req.body;

  try {
    if (
      !destinationName ||
      destinationLatitude === undefined ||
      destinationLongitude === undefined ||
      !destinationRadius ||
      !travelMode ||
      !expectedReachTime
    ) {
      return res.status(400).json({ success: false, message: 'Please provide all journey parameters' });
    }

    // Check if there's already an active journey
    const activeJourney = await Journey.findOne({
      user: req.user.id,
      status: { $in: ['active', 'grace_period', 'check_in_requested'] },
    });

    if (activeJourney) {
      return res.status(400).json({ success: false, message: 'You already have an active journey running' });
    }

    const reachTime = new Date(expectedReachTime);
    const graceEnds = new Date(reachTime.getTime() + 15 * 60 * 1000); // 15 mins grace
    const checkInEnds = new Date(graceEnds.getTime() + 5 * 60 * 1000); // 5 mins check-in

    const breadcrumbs = [];
    if (currentLatitude !== undefined && currentLongitude !== undefined) {
      breadcrumbs.push({ latitude: currentLatitude, longitude: currentLongitude });
    }

    const journey = await Journey.create({
      user: req.user.id,
      destinationName,
      destinationLatitude,
      destinationLongitude,
      destinationRadius,
      travelMode,
      vehicleNumber,
      currentLatitude: currentLatitude || destinationLatitude,
      currentLongitude: currentLongitude || destinationLongitude,
      breadcrumbs,
      status: 'active',
      expectedReachTime: reachTime,
      gracePeriodEndsAt: graceEnds,
      checkInEndsAt: checkInEnds,
    });

    // Broadcast WebSocket event via global socket.io instance
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.emit('journey_started', {
        journeyId: journey._id,
        user: { id: req.user.id, name: req.user.name },
        destinationName,
        travelMode,
        vehicleNumber,
        expectedReachTime: reachTime,
      });
    }

    res.status(201).json({ success: true, data: journey });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// @desc    Get current active journey
// @route   GET /api/journey/active
// @access  Private
router.get('/active', protect, async (req, res) => {
  try {
    const journey = await Journey.findOne({
      user: req.user.id,
      status: { $in: ['active', 'grace_period', 'check_in_requested', 'sos_triggered'] },
    });

    if (!journey) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: journey });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Update journey location breadcrumbs
// @route   POST /api/journey/update-location
// @access  Private
router.post('/update-location', protect, async (req, res) => {
  const { latitude, longitude } = req.body;

  try {
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide coordinates' });
    }

    const journey = await Journey.findOne({
      user: req.user.id,
      status: { $in: ['active', 'grace_period', 'check_in_requested'] },
    });

    if (!journey) {
      return res.status(404).json({ success: false, message: 'No active journey found' });
    }

    journey.currentLatitude = latitude;
    journey.currentLongitude = longitude;
    journey.breadcrumbs.push({ latitude, longitude });

    // Check if user is entering the destination geofence safe zone
    const distToDest = getDistance(
      latitude,
      longitude,
      journey.destinationLatitude,
      journey.destinationLongitude
    );

    let reached = false;
    // If inside destination geofence radius, auto-trigger a recommendation to end travel
    if (distToDest <= journey.destinationRadius) {
      reached = true;
    }

    await journey.save();

    // Broadcast WebSocket updates
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.emit('journey_updated', {
        journeyId: journey._id,
        userId: req.user.id,
        latitude,
        longitude,
        reached,
        distanceRemaining: distToDest,
      });
    }

    res.json({ success: true, data: journey, reached, distanceRemaining: distToDest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Validate MPIN and either extend or complete journey
// @route   POST /api/journey/check-in
// @access  Private
router.post('/check-in', protect, async (req, res) => {
  const { mpin, action } = req.body; // action: 'extend' or 'complete'

  try {
    if (!mpin || !action) {
      return res.status(400).json({ success: false, message: 'Please provide MPIN and action' });
    }

    const journey = await Journey.findOne({
      user: req.user.id,
      status: { $in: ['active', 'grace_period', 'check_in_requested', 'sos_triggered'] },
    });

    if (!journey) {
      return res.status(404).json({ success: false, message: 'No active journey found to check in' });
    }

    // Verify MPIN against user record
    const user = await User.findById(req.user.id);
    const isMatch = await user.matchMPIN(mpin);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect MPIN' });
    }

    const io = req.app.get('io');

    if (action === 'complete') {
      journey.status = 'completed';
      journey.completedAt = new Date();
      await journey.save();

      // If active SOS is linked to this journey, resolve it
      await Alert.updateMany(
        { user: req.user.id, journey: journey._id, status: 'active' },
        { status: 'resolved', resolvedAt: new Date() }
      );

      if (io) {
        io.emit('journey_completed', { journeyId: journey._id, userId: req.user.id });
        io.emit('sos_resolved', { userId: req.user.id });
      }

      return res.json({ success: true, message: 'Journey completed successfully', data: journey });
    } else if (action === 'extend') {
      // Extend journey reach time by 15 mins
      const newReachTime = new Date(Date.now() + 15 * 60 * 1000);
      const newGraceTime = new Date(newReachTime.getTime() + 15 * 60 * 1000);
      const newCheckInTime = new Date(newGraceTime.getTime() + 5 * 60 * 1000);

      journey.status = 'active';
      journey.expectedReachTime = newReachTime;
      journey.gracePeriodEndsAt = newGraceTime;
      journey.checkInEndsAt = newCheckInTime;
      await journey.save();

      if (io) {
        io.emit('journey_extended', {
          journeyId: journey._id,
          userId: req.user.id,
          expectedReachTime: newReachTime,
        });
      }

      return res.json({ success: true, message: 'Journey extended by 15 minutes', data: journey });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action parameter' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Force complete/end journey manually (without MPIN, or if arrived)
// @route   POST /api/journey/complete
// @access  Private
router.post('/complete', protect, async (req, res) => {
  try {
    const journey = await Journey.findOne({
      user: req.user.id,
      status: { $in: ['active', 'grace_period', 'check_in_requested', 'sos_triggered'] },
    });

    if (!journey) {
      return res.status(404).json({ success: false, message: 'No active journey found' });
    }

    journey.status = 'completed';
    journey.completedAt = new Date();
    await journey.save();

    // Resolve any alerts
    await Alert.updateMany(
      { user: req.user.id, journey: journey._id, status: 'active' },
      { status: 'resolved', resolvedAt: new Date() }
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('journey_completed', { journeyId: journey._id, userId: req.user.id });
      io.emit('sos_resolved', { userId: req.user.id });
    }

    res.json({ success: true, message: 'Journey ended', data: journey });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get user journey history
// @route   GET /api/journey/history
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const journeys = await Journey.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, count: journeys.length, data: journeys });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
