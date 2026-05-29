const mongoose = require('mongoose');

const adminAccountSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['main', 'mini'],
    default: 'mini',
  },
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    default: null, // null for main admin
  },
}, { timestamps: true });

module.exports = mongoose.model('AdminAccount', adminAccountSchema);
