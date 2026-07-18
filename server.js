// Force Google public DNS for reliable SRV resolution on all platforms
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { seedInitialAdmin } = require('./controllers/authController');

dotenv.config();
connectDB().then(() => {
  seedInitialAdmin();
});

const app = express();

const corsOptions = {
  origin: process.env.CLIENT_ORIGIN || 'https://lets-test.onrender.com'
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const userRoutes = require('./routes/userRoutes');
const questionRoutes = require('./routes/questionRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/admin', adminRoutes);

// Explicit HTML page routes
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/test', (req, res) => res.sendFile(path.join(__dirname, 'public', 'test.html')));
app.get('/result', (req, res) => res.sendFile(path.join(__dirname, 'public', 'result.html')));

// Fallback → index
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
