const AdminAccount = require('../models/AdminAccount');
const College = require('../models/College');
const Student = require('../models/Student');
const Exam = require('../models/Exam');
const { logActivity } = require('./adminController');

// @desc  Seed initial main admin and college if not exists
exports.seedInitialAdmin = async () => {
  try {
    let gec = await College.findOne({ domain: '@gectcr.ac.in' });
    if (!gec) {
      gec = await College.create({ name: 'GEC Thrissur', domain: '@gectcr.ac.in' });
      console.log('Seeded default college: GEC Thrissur');
    }

    const username = process.env.MAIN_ADMIN_USERNAME || 'Sooraj2004';
    const password = process.env.MAIN_ADMIN_PASSWORD || 'McaAdminSooraj';

    const mainAdmin = await AdminAccount.findOne({ role: 'main' });
    if (!mainAdmin) {
      await AdminAccount.create({
        username,
        password,
        role: 'main',
        collegeId: null
      });
      console.log(`Seeded main admin: ${username}`);
    } else {
      // Update existing main admin credentials if they changed in .env
      mainAdmin.username = username;
      mainAdmin.password = password;
      await mainAdmin.save();
    }

    // Automatically migrate legacy string options in MongoDB to the new object schema format
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    if (db) {
      const rawQuestions = await db.collection('questions').find({}).toArray();
      let migratedCount = 0;
      for (const rawQ of rawQuestions) {
        let changed = false;
        if (Array.isArray(rawQ.options)) {
          const newOptions = rawQ.options.map(opt => {
            if (typeof opt === 'string') {
              changed = true;
              return { text: opt, image: '' };
            }
            return opt;
          });
          if (changed) {
            await db.collection('questions').updateOne(
              { _id: rawQ._id },
              { $set: { options: newOptions } }
            );
            migratedCount++;
          }
        }
      }
      if (migratedCount > 0) {
        console.log(`Migrated ${migratedCount} questions options from String to Object format.`);
      }
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
      password: admin.password // Returning password for header-based auth in subsequent requests
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
    const cleanDomain = domain.trim();
    const college = await College.create({ name, domain: cleanDomain });
    await logActivity(`Added college: ${name} (${cleanDomain})`, 'info', null, req.admin?.username);
    res.status(201).json(college);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Update a college (Main Admin only)
// @route PUT /api/admin/colleges/:id
exports.updateCollege = async (req, res) => {
  if (req.admin.role !== 'main') return res.status(403).json({ message: 'Main admin access required' });
  try {
    const { name, domain } = req.body;
    const cleanDomain = domain ? domain.trim() : undefined;
    const updateData = { name };
    if (cleanDomain) updateData.domain = cleanDomain;

    const college = await College.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!college) return res.status(404).json({ message: 'College not found' });
    await logActivity(`Updated college: ${name} (${college.domain})`, 'info', null, req.admin?.username);
    res.status(200).json(college);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Delete a college (Main Admin only)
// @route DELETE /api/admin/colleges/:id
exports.deleteCollege = async (req, res) => {
  if (req.admin.role !== 'main') return res.status(403).json({ message: 'Main admin access required' });
  try {
    const college = await College.findByIdAndDelete(req.params.id);
    if (!college) return res.status(404).json({ message: 'College not found' });
    await logActivity(`Removed college node: ${college.name}`, 'danger', null, req.admin?.username);
    res.status(200).json({ message: 'College deleted' });
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
    const results = await Promise.all(colleges.map(async (college) => {
      const studentCount = await Student.countDocuments({ collegeId: college._id });
      const examCount = await Exam.countDocuments({ collegeId: college._id });
      return {
        ...college.toObject(),
        studentCount,
        examCount
      };
    }));
    res.status(200).json(results);
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
    const college = await College.findById(collegeId);
    await logActivity(`Created College Admin: ${username} mapped to ${college ? college.name : 'Unknown college'}`, 'info', collegeId, req.admin?.username);
    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Update a mini admin (Main Admin only)
// @route PUT /api/admin/accounts/:id
exports.updateAdminAccount = async (req, res) => {
  if (req.admin.role !== 'main') return res.status(403).json({ message: 'Main admin access required' });
  try {
    const { username, password, collegeId } = req.body;
    const account = await AdminAccount.findByIdAndUpdate(req.params.id, { username, password, collegeId }, { new: true });
    if (!account) return res.status(404).json({ message: 'Account not found' });
    const college = await College.findById(collegeId);
    await logActivity(`Updated College Admin: ${username} mapped to ${college ? college.name : 'Unknown college'}`, 'info', collegeId, req.admin?.username);
    res.status(200).json(account);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Delete a mini admin (Main Admin only)
// @route DELETE /api/admin/accounts/:id
exports.deleteAdminAccount = async (req, res) => {
  if (req.admin.role !== 'main') return res.status(403).json({ message: 'Main admin access required' });
  try {
    const account = await AdminAccount.findByIdAndDelete(req.params.id);
    if (!account) return res.status(404).json({ message: 'Account not found' });
    await logActivity(`Revoked admin access for user: ${account.username}`, 'warning', account.collegeId, req.admin?.username);
    res.status(200).json({ message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
