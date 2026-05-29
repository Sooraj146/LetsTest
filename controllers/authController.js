const AdminAccount = require('../models/AdminAccount');
const College = require('../models/College');

// @desc  Seed initial main admin and college if not exists
exports.seedInitialAdmin = async () => {
  try {
    let gec = await College.findOne({ domain: '@gectcr.ac.in' });
    if (!gec) {
      gec = await College.create({ name: 'GEC Thrissur', domain: '@gectcr.ac.in' });
      console.log('Seeded default college: GEC Thrissur');
    }

    const mainAdmin = await AdminAccount.findOne({ username: 'Sooraj2004' });
    if (!mainAdmin) {
      await AdminAccount.create({
        username: 'Sooraj2004',
        password: 'McaAdminSooraj',
        role: 'main',
        collegeId: null // Main admin has no specific college binding by default, but handles all
      });
      console.log('Seeded main admin: Sooraj2004');
    }
  } catch (error) {
    console.error('Seeding error:', error);
  }
};

// @desc  Admin Login
// @route POST /api/admin/login
exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const admin = await AdminAccount.findOne({ username, password }).populate('collegeId');
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });
    
    res.status(200).json({
      username: admin.username,
      role: admin.role,
      college: admin.collegeId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Create a new college (Main Admin only)
// @route POST /api/admin/colleges
exports.createCollege = async (req, res) => {
  if (req.admin.role !== 'main') return res.status(403).json({ message: 'Main admin access required' });
  try {
    const { name, domain } = req.body;
    const college = await College.create({ name, domain });
    res.status(201).json(college);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get all colleges (Main Admin only)
// @route GET /api/admin/colleges
exports.getColleges = async (req, res) => {
  if (req.admin.role !== 'main') return res.status(403).json({ message: 'Main admin access required' });
  try {
    const colleges = await College.find();
    res.status(200).json(colleges);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get all admin accounts (Main Admin only)
// @route GET /api/admin/accounts
exports.getAdminAccounts = async (req, res) => {
  if (req.admin.role !== 'main') return res.status(403).json({ message: 'Main admin access required' });
  try {
    const accounts = await AdminAccount.find({ role: 'mini' }).populate('collegeId');
    res.status(200).json(accounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Create a mini admin (Main Admin only)
// @route POST /api/admin/accounts
exports.createAdminAccount = async (req, res) => {
  if (req.admin.role !== 'main') return res.status(403).json({ message: 'Main admin access required' });
  try {
    const { username, password, collegeId } = req.body;
    const account = await AdminAccount.create({ username, password, collegeId, role: 'mini' });
    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
