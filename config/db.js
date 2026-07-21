const mongoose = require('mongoose');
const dns = require('dns');

// Fix for Windows systems where the default DNS server fails to resolve
// MongoDB Atlas SRV records, causing ECONNREFUSED errors.
// Forces Node.js to use Google's reliable public DNS servers.
dns.setServers(['8.8.8.8', '8.8.4.4']);

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
