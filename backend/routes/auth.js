const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'travel_safety_sos_jwt_secret_key_123!@#', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, phone, password, mpin } = req.body;

  try {
    if (!name || !email || !phone || !password || !mpin) {
      return res.status(400).json({ success: false, message: 'Please enter all fields' });
    }

    if (mpin.length !== 4 || isNaN(mpin)) {
      return res.status(400).json({ success: false, message: 'MPIN must be a 4-digit number' });
    }

    // Check if user exists
    const emailExists = await User.findOne({ email });
    const phoneExists = await User.findOne({ phone });

    if (emailExists || phoneExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email or phone number' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      password,
      mpin,
    });

    if (user) {
      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          token: generateToken(user._id),
        },
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter email and password' });
    }

    // Check for user email
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          token: generateToken(user._id),
        },
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Update user active location coordinates
// @route   PUT /api/auth/location
// @access  Private
router.put('/location', protect, async (req, res) => {
  const { latitude, longitude } = req.body;
  try {
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide GPS coordinates' });
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    user.location = {
      type: 'Point',
      coordinates: [longitude, latitude], // longitude, latitude order
    };
    await user.save();
    
    res.json({ success: true, message: 'Location updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Update user's FCM token
// @route   PUT /api/auth/fcm-token
// @access  Private
router.put('/fcm-token', protect, async (req, res) => {
  const { fcmToken } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.fcmToken = fcmToken;
    await user.save();
    res.json({ success: true, message: 'FCM token updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

