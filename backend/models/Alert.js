const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  journey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Journey',
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  triggerType: {
    type: String,
    enum: ['manual_sos', 'geofence_breach', 'timeout', 'other'],
    default: 'manual_sos',
  },
  status: {
    type: String,
    enum: ['active', 'resolved'],
    default: 'active',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resolvedAt: {
    type: Date,
  },
});

module.exports = mongoose.model('Alert', AlertSchema);
