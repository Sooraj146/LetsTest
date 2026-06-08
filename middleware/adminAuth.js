const AdminAccount = require('../models/AdminAccount');
const College = require('../models/College');

const adminAuth = async (req, res, next) => {
  const username = req.headers['x-admin-username'];
  const password = req.headers['x-admin-password'];

  if (!username || !password) {
    return res.status(401).json({ message: 'Unauthorized: Missing credentials' });
  }

  try {
    const admin = await AdminAccount.findOne({ username, password });
    if (!admin) {
      return res.status(401).json({ message: 'Unauthorized: Invalid credentials' });
    }

    // Attach admin info to request
    req.admin = admin;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

module.exports = adminAuth;
