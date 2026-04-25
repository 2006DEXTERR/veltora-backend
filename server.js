require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: false }
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.log('Database connection failed:', err.message);
  } else {
    console.log('✓ Database connected successfully');
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running' });
});

// Enquiries endpoint
app.post('/api/enquiries', async (req, res) => {
  try {
    const { full_name, email, phone, city, interested_in, message } = req.body;

    if (!full_name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    await pool.query(
      'INSERT INTO enquiries (full_name, email, phone, city, interested_in, message) VALUES ($1, $2, $3, $4, $5, $6)',
      [full_name, email, phone, city || '', interested_in || 'General', message || '']
    );

    res.json({ success: true, message: 'Enquiry saved successfully' });
  } catch (err) {
    console.error('Error saving enquiry:', err);
    res.status(500).json({ success: false, message: 'Failed to save enquiry' });
  }
});

// Get enquiries (admin only)
app.get('/api/enquiries', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 100');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching enquiries:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch enquiries' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});