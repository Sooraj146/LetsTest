const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'danger'],
    default: 'info',
  },
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
