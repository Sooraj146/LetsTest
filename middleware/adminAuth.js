/**
 * Admin authentication middleware.
 * Checks the x-admin-password header against the ADMIN_PASSWORD env variable.
 */
const adminAuth = (req, res, next) => {
  const password = req.headers['x-admin-password'];
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Unauthorized: Invalid admin password' });
  }
  next();
};

module.exports = adminAuth;
