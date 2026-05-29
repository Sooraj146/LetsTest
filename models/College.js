const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  domain: {
    type: String, // e.g., "@gectcr.ac.in"
    required: true,
    unique: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('College', collegeSchema);
