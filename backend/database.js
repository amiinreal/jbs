import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connection retry configuration
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

// Create a connection pool with better error handling
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:amiinreal-12@localhost:5433/jbs',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Add these connection resilience settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if a connection cannot be established
});

// Test the database connection with retry capability
const connectWithRetry = async (retries = MAX_RETRIES) => {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to PostgreSQL database');
    client.release();
    return true;
  } catch (err) {
    if (retries > 0) {
      console.warn(`Database connection attempt failed. Retrying in ${RETRY_DELAY_MS}ms... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return connectWithRetry(retries - 1);
    } else {
      console.error('Database connection error after multiple attempts:', err);
      return false;
    }
  }
};

// Initial connection attempt
connectWithRetry().catch(console.error);

// Improved pool error handling to prevent application crashes
pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err);
  
  // Don't exit process on connection errors, so the app can retry
  if (err.code === '57P01') { // Administrator command termination code
    console.log('Database connection was terminated by administrator command. Will attempt to reconnect on next query.');
  } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    console.log('Database connection was lost. Will attempt to reconnect on next query.');
  } else {
    // For other unexpected errors, we might still want to exit in some cases
    // but it's often better to keep the app running and handle reconnection
    console.error('Unexpected database error. Application will attempt to continue.');
  }
});

export default pool;