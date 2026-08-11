const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { protect } = require('../middleware/auth');

// @desc    Get all emergency contacts for a user
// @route   GET /api/contacts
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const contacts = await Contact.find({ user: req.user.id });
    res.json({ success: true, count: contacts.length, data: contacts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Create a new emergency contact
// @route   POST /api/contacts
// @access  Private
router.post('/', protect, async (req, res) => {
  const { name, phone, email, relationship } = req.body;

  try {
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Please provide name and phone number' });
    }

    const contact = await Contact.create({
      user: req.user.id,
      name,
      phone,
      email,
      relationship,
    });

    res.status(201).json({ success: true, data: contact });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Update an emergency contact
// @route   PUT /api/contacts/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  const { name, phone, email, relationship } = req.body;

  try {
    let contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    // Check ownership
    if (contact.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to update this contact' });
    }

    contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { name, phone, email, relationship },
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: contact });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Delete an emergency contact
// @route   DELETE /api/contacts/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    // Check ownership
    if (contact.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this contact' });
    }

    await contact.deleteOne();

    res.json({ success: true, message: 'Contact removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
