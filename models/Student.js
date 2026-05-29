const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  rollNumber: {
    type: Number,
    required: true,
    unique: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
