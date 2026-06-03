/**
 * adminAuth.js — Simple password-based middleware.
 *
 * The admin panel sends the password via the "x-admin-password" header.
 * We compare it against ADMIN_PASSWORD in .env (falls back to a default).
 * No database lookup required — no AdminAccount model needed.
 */

const adminAuth = (req, res, next) => {
  const password = req.headers['x-admin-password'];
  const expected = process.env.ADMIN_PASSWORD || process.env.MAIN_ADMIN_PASSWORD;

  if (!password) {
    return res.status(401).json({ message: 'Unauthorized: No password provided' });
  }

  if (password !== expected) {
    return res.status(401).json({ message: 'Unauthorized: Incorrect password' });
  }

  next();
};

module.exports = adminAuth;
