const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  rollNumber: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  answers: {
    type: Map,
    of: String, // Question ID -> Answer Option
    default: {}
  },
  sectionScores: {
    type: Map,
    of: Number,
    default: {}
  },
  totalScore: {
    type: Number,
    default: 0
  },
  isSubmitted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
