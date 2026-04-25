// Force Google public DNS for reliable SRV resolution on all platforms
// (fixes Windows ISP DNS blocks in dev AND ensures consistency on Render/Linux in prod)
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const userRoutes = require('./routes/userRoutes');
const questionRoutes = require('./routes/questionRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/admin', adminRoutes);

// Explicit page routes — prevents the catch-all from swallowing /admin, /test, /result
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/test',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'test.html')));
app.get('/result',(req, res) => res.sendFile(path.join(__dirname, 'public', 'result.html')));

// Fallback to registration/entry page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
