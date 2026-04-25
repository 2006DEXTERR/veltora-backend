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
// Create table if it doesn't exist
pool.query(`
  CREATE TABLE IF NOT EXISTS enquiries (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    city VARCHAR(100),
    interested_in VARCHAR(255),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch(err => console.log('Table might already exist:', err.message));
// Create users table
pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch(err => console.log('Users table:', err.message));

// Create projects table
pool.query(`
  CREATE TABLE IF NOT EXISTS projects (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    price VARCHAR(100),
    description TEXT,
    image_url VARCHAR(500),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch(err => console.log('Projects table:', err.message));

// Create bookings table
pool.query(`
  CREATE TABLE IF NOT EXISTS bookings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    project_id BIGINT REFERENCES projects(id),
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    amount VARCHAR(100),
    status VARCHAR(50)
  )
`).catch(err => console.log('Bookings table:', err.message));

// Create payments table
pool.query(`
  CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    enquiry_id BIGINT REFERENCES enquiries(id),
    amount DECIMAL(10,2),
    razorpay_order_id VARCHAR(100),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch(err => console.log('Payments table:', err.message));

// Create reviews table
pool.query(`
  CREATE TABLE IF NOT EXISTS reviews (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES projects(id),
    user_id BIGINT REFERENCES users(id),
    rating INT,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch(err => console.log('Reviews table:', err.message));

// Create admin_users table
pool.query(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch(err => console.log('Admin users table:', err.message));

// Create messages table
pool.query(`
  CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    subject VARCHAR(255),
    message TEXT,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch(err => console.log('Messages table:', err.message));

// Create wishlist table
pool.query(`
  CREATE TABLE IF NOT EXISTS wishlist (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    project_id BIGINT REFERENCES projects(id),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch(err => console.log('Wishlist table:', err.message));
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