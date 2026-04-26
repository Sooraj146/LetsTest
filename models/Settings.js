const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    startTime: {
        type: Date,
        default: null
    },
    endTime: {
        type: Date,
        default: null
    }
});

module.exports = mongoose.model('Settings', settingsSchema);
