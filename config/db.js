const mongoose = require('mongoose');

// Fix for Windows local systems where default DNS fails to resolve MongoDB Atlas SRV records.
if (process.env.NODE_ENV !== 'production') {
  try {
    const dns = require('dns');
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  } catch (e) {
    console.warn('Custom DNS override failed, using default system DNS');
  }
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    const Student = require('../models/Student');
    await Student.syncIndexes();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
