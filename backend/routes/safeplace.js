const express = require('express');
const router = express.Router();
const SafePlace = require('../models/SafePlace');
const { protect } = require('../middleware/auth');

// @desc    Get all safe places for a user
// @route   GET /api/safeplaces
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const safePlaces = await SafePlace.find({ user: req.user.id });
    res.json({ success: true, count: safePlaces.length, data: safePlaces });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Create a new safe place (geofence)
// @route   POST /api/safeplaces
// @access  Private
router.post('/', protect, async (req, res) => {
  const { name, latitude, longitude, radius } = req.body;

  try {
    if (!name || latitude === undefined || longitude === undefined || !radius) {
      return res.status(400).json({ success: false, message: 'Please provide name, coordinates, and radius' });
    }

    const safePlace = await SafePlace.create({
      user: req.user.id,
      name,
      latitude,
      longitude,
      radius,
    });

    res.status(201).json({ success: true, data: safePlace });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Update a safe place
// @route   PUT /api/safeplaces/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  const { name, latitude, longitude, radius } = req.body;

  try {
    let safePlace = await SafePlace.findById(req.params.id);

    if (!safePlace) {
      return res.status(404).json({ success: false, message: 'Safe place not found' });
    }

    // Check ownership
    if (safePlace.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to update this safe place' });
    }

    safePlace = await SafePlace.findByIdAndUpdate(
      req.params.id,
      { name, latitude, longitude, radius },
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: safePlace });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Delete a safe place
// @route   DELETE /api/safeplaces/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const safePlace = await SafePlace.findById(req.params.id);

    if (!safePlace) {
      return res.status(404).json({ success: false, message: 'Safe place not found' });
    }

    // Check ownership
    if (safePlace.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this safe place' });
    }

    await safePlace.deleteOne();

    res.json({ success: true, message: 'Safe place removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
