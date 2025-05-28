import express from 'express';
import pool from './database.js';
import session from 'express-session';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { checkAuthMiddleware, checkAdminMiddleware, checkVerifiedCompanyMiddleware } from './middleware/auth.js';
import { upload, registerFile } from './services/fileStorage.js';
import { fileURLToPath } from 'url';
import jobsRouter from './routes/jobs.js';

const router = express.Router();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
// Create uploads/temp directory if it doesn't exist
const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Initialize multer with storage configuration
const uploadMiddleware = multer({ storage: storage });

// Middleware aliases for easier readability
const checkAuth = checkAuthMiddleware;
const isAdmin = checkAdminMiddleware;
const isVerifiedCompany = checkVerifiedCompanyMiddleware;

// Public routes for viewing listings (no auth required)
// Houses listing route - public access
router.get('/houses', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        h.*,
        CASE 
          WHEN h.primary_image_id IS NOT NULL THEN 
            '/api/files/' || h.primary_image_id
          ELSE 
            NULL 
        END AS primary_image_url
      FROM houses h
      WHERE h.is_published = TRUE 
      ORDER BY h.created_at DESC
    `);
    
    // Process the results to include image URLs
    const houses = result.rows.map(house => {
      // Ensure image_urls is an array
      if (!house.image_urls) {
        house.image_urls = [];
      } else if (!Array.isArray(house.image_urls)) {
        // If image_urls is not an array but exists, convert it
        try {
          if (typeof house.image_urls === 'string') {
            const parsed = JSON.parse(house.image_urls);
            house.image_urls = Array.isArray(parsed) ? parsed : [house.image_urls];
          } else {
            house.image_urls = [house.image_urls];
          }
        } catch (e) {
          house.image_urls = [house.image_urls];
        }
      }
      
      // Add primary image to image_urls if it exists and not already there
      if (house.primary_image_url && !house.image_urls.includes(house.primary_image_url)) {
        house.image_urls.unshift(house.primary_image_url);
      }
      
      // If image_url is set but not in image_urls, add it
      if (house.image_url && !house.image_urls.includes(house.image_url)) {
        house.image_urls.push(house.image_url);
      }
      
      return house;
    });
    
    res.json({ success: true, data: houses });
  } catch (err) {
    console.error('Error fetching houses:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch houses' });
  }
});

// Cars listing route - public access
router.get('/cars', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cars WHERE is_published = TRUE ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching cars:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch cars' });
  }
});

// Items listing route - public access
router.get('/items', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM items WHERE is_published = TRUE ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch items' });
  }
});

// Jobs listing for a user - requires auth
router.get('/user/listings', checkAuth, async (req, res) => {
  const userId = req.session.user.id;
  try {
    const client = await pool.connect();
    
    // Get all types of listings for the current user
    const jobsPromise = client.query('SELECT * FROM jobs WHERE user_id = $1', [userId]);
    const housesPromise = client.query('SELECT * FROM houses WHERE user_id = $1', [userId]);
    const carsPromise = client.query('SELECT * FROM cars WHERE user_id = $1', [userId]);
    const itemsPromise = client.query('SELECT * FROM items WHERE user_id = $1', [userId]);
    
    // Execute all queries in parallel
    const [jobsResult, housesResult, carsResult, itemsResult] = await Promise.all([
      jobsPromise, housesPromise, carsPromise, itemsPromise
    ]);
    
    client.release();
    return res.json({
      success: true,
      jobs: jobsResult.rows,
      houses: housesResult.rows,
      cars: carsResult.rows,
      items: itemsResult.rows
    });
  } catch (error) {
    console.error('Error fetching user listings:', error);
    return res.status(500).json({ 
      error: 'An error occurred while fetching your listings.' 
    });
  }
});

// Protected
// Create new house listing - requires auth
router.post('/houses', checkAuth, async (req, res) => {
  const { title, address, price, description, number_of_bedrooms, number_of_bathrooms, square_footage, is_published, image_url, image_urls } = req.body;
  const userId = req.user.id;
  
  try {
    const client = await pool.connect();
    try {
      // Convert image_urls to PostgreSQL array if provided
      let imageUrlsParam = null;
      
      if (image_urls) {
        // If image_urls is a string, try to parse it as JSON
        if (typeof image_urls === 'string') {
          try {
            imageUrlsParam = JSON.parse(image_urls);
          } catch (e) {
            console.error('Failed to parse image_urls as JSON:', e);
            // If parsing fails, use the original string
            imageUrlsParam = [image_urls];
          }
        } else if (Array.isArray(image_urls)) {
          // If it's already an array, use it directly
          imageUrlsParam = image_urls;
        }
      }
      
      // Insert new house listing
      const result = await client.query(
        `INSERT INTO houses 
          (title, address, price, description, number_of_bedrooms, number_of_bathrooms, square_footage, 
           is_published, user_id, image_url, image_urls) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
         RETURNING *`,
        [title, address, price, description, number_of_bedrooms, number_of_bathrooms, square_footage, 
         is_published || false, userId, image_url, imageUrlsParam]
      );
      
      res.status(201).json({ success: true, data: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error creating house listing:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// User's own house listings - requires auth
router.get('/houses/user', checkAuth, async (req, res) => {
  try { 
    const userId = req.session.user.id;
    const result = await pool.query('SELECT * FROM houses WHERE user_id = $1', [userId]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching user houses:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch houses' });
  }
});

// Messaging - requires auth
router.post('/messages', checkAuth, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { recipient_id, content, subject, listing_id, listing_type, listing_details, conversation_id } = req.body;
    
    if (!content) {
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }
    
    // Get or create conversation
    let conversationId = conversation_id;
    
    if (!conversationId) {
      // Check if this is about a listing
      let listingDetails = listing_details || null;
      
      if (listing_id && listing_type && !listingDetails) {
        // If listing details aren't provided but we have listing ID and type,
        // fetch basic listing information from the database
        try {
          const listingQuery = await pool.query(
            `SELECT * FROM ${listing_type}s WHERE id = $1`,
            [listing_id]
          );
          
          if (listingQuery.rows.length > 0) {
            const listing = listingQuery.rows[0];
            
            listingDetails = { 
              id: listing_id,
              type: listing_type,
              title: listing_type === 'house' ? listing.address : 
                    listing_type === 'car' ? `${listing.make} ${listing.model}` : 
                    listing.title || listing.name,
              price: listing.price
            };
            
            // Try to get the main image URL if available
            if (listing.image_url) {
              listingDetails.image_url = listing.image_url;
            } else if (listing.primary_image_id) {
              // If we have a primary image ID, get the file path
              const imageQuery = await pool.query(
                'SELECT storage_path FROM files WHERE id = $1',
                [listing.primary_image_id]
              );
              
              if (imageQuery.rows.length > 0) {
                listingDetails.image_url = `/api/files/${listing.primary_image_id}`;
              }
            }
          }
        } catch (listingErr) {
          console.error('Error fetching listing details:', listingErr);
          // Continue without listing details if there's an error
        }
      }
      
      // Create new conversation
      const conversationResult = await pool.query(
        `INSERT INTO conversations 
         (participant1_id, participant2_id, listing_id, listing_type, subject, listing_details) 
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [senderId, recipient_id, listing_id, listing_type, subject, 
         listingDetails ? JSON.stringify(listingDetails) : null]
      );
      
      conversationId = conversationResult.rows[0].id;
    }
    
    // Add message to the conversation
    const messageResult = await pool.query(
      `INSERT INTO messages 
       (conversation_id, sender_id, recipient_id, content, listing_details) 
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [conversationId, senderId, recipient_id, content, 
       listing_details ? JSON.stringify(listing_details) : null]
    );
    
    res.status(201).json({ 
      success: true, 
      data: messageResult.rows[0],
      conversation_id: conversationId
    });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// Get user's conversations - requires auth
router.get('/messages/conversations', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT c.id, c.created_at, c.updated_at, c.subject, c.listing_id, c.listing_type,
         (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND recipient_id = $1 AND read = false) as unread_count,
         CASE 
           WHEN c.participant1_id = $1 THEN 
             json_build_object('id', c.participant2_id, 'role', (SELECT name FROM roles WHERE id = (SELECT role_id FROM users WHERE id = c.participant2_id)))
           ELSE 
             json_build_object('id', c.participant1_id, 'role', (SELECT name FROM roles WHERE id = (SELECT role_id FROM users WHERE id = c.participant1_id)))
         END as other_user
       FROM conversations c
       WHERE c.participant1_id = $1 OR c.participant2_id = $1
       ORDER BY c.updated_at DESC`,
      [userId]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ success: false, error: 'Failed to load conversations' });
  }
});

// Get messages for a specific conversation
router.get('/messages/conversation/:id', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    
    // Check if user is part of the conversation
    const conversationCheck = await pool.query(
      `SELECT id FROM conversations 
       WHERE id = $1 AND (participant1_id = $2 OR participant2_id = $2)`,
      [conversationId, userId]
    );
    
    if (conversationCheck.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this conversation' });
    }
    
    // Mark messages as read
    await pool.query(
      `UPDATE messages 
       SET read = true 
       WHERE conversation_id = $1 AND recipient_id = $2 AND read = false`,
      [conversationId, userId]
    );
    
    // Get messages
    const messagesResult = await pool.query(
      `SELECT * FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC`,
      [conversationId]
    );
    
    res.json({ success: true, data: messagesResult.rows });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ success: false, error: 'Failed to load messages' });
  }
});

// Get count of unread messages
router.get('/messages/unread/count', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM messages 
       WHERE recipient_id = $1 AND read = false`,
      [userId]
    );
    
    res.json({ success: true, count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ success: false, error: 'Failed to get unread message count' });
  }
});

// Public routes for viewing listings
router.get('/houses/public', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM houses WHERE is_published = TRUE ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching houses:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch houses' });
  }
});

router.get('/cars/public', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cars WHERE is_published = TRUE ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching cars:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch cars' });
  }
});

router.get('/items/public', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM items WHERE is_published = TRUE ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch items' });
  }
});

// Public route for viewing individual house details
router.get('/houses/public/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
        h.*,
        CASE 
          WHEN h.primary_image_id IS NOT NULL THEN 
            '/api/files/' || h.primary_image_id
          ELSE 
            NULL 
        END AS primary_image_url
       FROM houses h
       WHERE h.id = $1 AND h.is_published = TRUE`, 
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'House listing not found or not published' });
    }
    
    // Process house data
    const house = result.rows[0];
    
    // Ensure image_urls is an array
    if (!house.image_urls) {
      house.image_urls = [];
    } else if (!Array.isArray(house.image_urls)) {
      // If image_urls is not an array but exists, convert it
      try {
        if (typeof house.image_urls === 'string') {
          const parsed = JSON.parse(house.image_urls);
          house.image_urls = Array.isArray(parsed) ? parsed : [house.image_urls];
        } else {
          house.image_urls = [house.image_urls];
        }
      } catch (e) {
        house.image_urls = [house.image_urls];
      }
    }
    
    // Add primary image to image_urls if it exists and not already there
    if (house.primary_image_url && !house.image_urls.includes(house.primary_image_url)) {
      house.image_urls.unshift(house.primary_image_url);
    }
    
    // If image_url is set but not in image_urls, add it
    if (house.image_url && !house.image_urls.includes(house.image_url)) {
      house.image_urls.push(house.image_url);
    }
    
    res.json({ success: true, data: house });
  } catch (err) {
    console.error('Error fetching house details:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch house details' });
  }
});

// Also add a route to get public user info
router.get('/users/:id/public', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, username, email, company_name, is_company, is_verified_company FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error fetching user details:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch user details' });
  }
});

// Proper authentication endpoints
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log(`Login attempt for user: ${username}`);
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }
    
    // Find user
    const userResult = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username.trim()]
    );
    
    if (userResult.rows.length === 0) {
      console.log(`User not found: ${username}`);
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
    
    const user = userResult.rows[0];
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.log(`Invalid password for user: ${username}`);
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
    
    // Fetch role name
    const roleResult = await pool.query('SELECT name FROM roles WHERE id = $1', [user.role_id]);
    const roleName = roleResult.rows.length > 0 ? roleResult.rows[0].name : 'user';
    
    // Set session with user data
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: roleName,
      isCompany: user.is_company || false,
      isVerifiedCompany: user.is_verified_company || false
    };
    
    console.log(`User ${username} logged in successfully`);
    
    res.json({ 
      success: true, 
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: roleName,
        isCompany: user.is_company || false,
        isVerifiedCompany: user.is_verified_company || false
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Login failed: ' + (err.message || 'Server error') });
  }
});

router.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: 'Username, email and password are required' });
    }
    
    // Check if username or email already exists
    const checkExistingUser = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    if (checkExistingUser.rows.length > 0) {
      const existingField = checkExistingUser.rows[0].username === username ? 'username' : 'email';
      return res.status(400).json({ success: false, error: `This ${existingField} is already taken` });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert new user
    const newUserResult = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );
    
    const newUser = newUserResult.rows[0];
    
    // Set session with new user data
    req.session.user = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email
    };
    
    res.status(201).json({ success: true, message: 'Registration successful', user: newUser });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// Add logout endpoint
router.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ success: false, error: 'Failed to logout' });
    }
    
    res.clearCookie('connect.sid'); // Clear the session cookie
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Session check endpoint - improved to handle unauthenticated users
router.get('/auth/check', checkAuthMiddleware, async (req, res) => {
  // If user is null (not authenticated), return isAuthenticated: false
  if (!req.user) {
    return res.json({
      isAuthenticated: false
    });
  }
  
  try {
    // Get the latest user data from the database to ensure sync
    const userResult = await pool.query(
      'SELECT id, username, email, role_id, is_company, is_verified_company, company_name FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length > 0) {
      const userData = userResult.rows[0];
      
      // Get role name
      const roleResult = await pool.query(
        'SELECT name FROM roles WHERE id = $1',
        [userData.role_id]
      );
      
      const role = roleResult.rows.length > 0 ? roleResult.rows[0].name : 'user';
      
      // Update session with latest data
      req.session.user = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        role: role,
        isCompany: userData.is_company,
        isVerifiedCompany: userData.is_verified_company
      };
      
      // Return updated user data
      res.json({
        isAuthenticated: true,
        id: userData.id,
        username: userData.username,
        email: userData.email,
        role: role,
        isCompany: userData.is_company,
        isVerifiedCompany: userData.is_verified_company,
        company_name: userData.company_name
      });
    } else {
      // User not found in database but has a session
      req.session.destroy();
      res.json({ isAuthenticated: false });
    }
  } catch (err) {
    console.error('Error in auth check:', err);
    res.json({
      isAuthenticated: true,
      ...req.user
    });
  }
});

// Route to get a single house by ID - for editing (requires auth and ownership)
router.get('/houses/:id', checkAuth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  
  try {
    // Use function scope instead of block scope for the client
    let client;
    try {
      client = await pool.connect();
      
      // Check if the house exists and belongs to the user
      const result = await client.query(
        'SELECT * FROM houses WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'House listing not found or you do not have permission to edit it' 
        });
      }
      
      res.json({ success: true, data: result.rows[0] });
    } finally {
      // Make sure to release the client back to the pool
      if (client) {
        client.release();
      }
    }
  } catch (err) {
    console.error('Error fetching house details:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch house details' });
  }
});

// Route to update a house listing (requires auth and ownership)
router.put('/houses/:id', checkAuth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { 
    title,
    address, 
    price, 
    description, 
    number_of_bedrooms, 
    number_of_bathrooms, 
    square_footage, 
    is_published, 
    image_url, 
    image_urls 
  } = req.body;
  
  try {
    const client = await pool.connect();
    
    try {
      // Check if the house exists and belongs to the user
      const checkResult = await client.query(
        'SELECT * FROM houses WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'House listing not found or you do not have permission to edit it' 
        });
      }
      
      // Process image_urls
      let imageUrlsParam = null;
      
      if (image_urls) {
        // If image_urls is a string, try to parse it as JSON
        if (typeof image_urls === 'string') {
          try {
            imageUrlsParam = JSON.parse(image_urls);
          } catch (e) {
            console.error('Failed to parse image_urls as JSON:', e);
            // If parsing fails, use the original string
            imageUrlsParam = [image_urls];
          }
        } else if (Array.isArray(image_urls)) {
          // If it's already an array, use it directly
          imageUrlsParam = image_urls;
        }
      }
      
      // Update the house listing, including the title field
      const updateResult = await client.query(
        `UPDATE houses 
         SET title = $1, address = $2, price = $3, description = $4, number_of_bedrooms = $5, 
             number_of_bathrooms = $6, square_footage = $7, is_published = $8, 
             image_url = $9, image_urls = $10, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $11 AND user_id = $12 
         RETURNING *`,
        [title, address, price, description, number_of_bedrooms, number_of_bathrooms, 
         square_footage, is_published || false, image_url, imageUrlsParam, id, userId]
      );
      
      res.json({ success: true, data: updateResult.rows[0] });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error updating house listing:', err);
    res.status(500).json({ success: false, error: 'Failed to update house listing' });
  }
});

// Company registration endpoint
router.post('/company/register', checkAuth, async (req, res) => {
  try {
    // First verify user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const userId = req.user.id;
    const { 
      company_name, 
      company_description, 
      business_license_number, 
      contact_email, 
      contact_phone, 
      logo_url,
      logo_file_id
    } = req.body;
    
    // Check if user already has a pending request
    const existingRequest = await pool.query(
      'SELECT * FROM company_verification_requests WHERE user_id = $1 AND status = $2',
      [userId, 'pending']
    );
    
    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'You already have a pending verification request' 
      });
    }
    
    // Update user as a company (unverified)
    await pool.query(
      'UPDATE users SET is_company = TRUE, company_name = $1, company_description = $2, logo_url = $3, logo_file_id = $4 WHERE id = $5',
      [company_name, company_description, logo_url, logo_file_id, userId]
    );
    
    // Create verification request
    await pool.query(
      `INSERT INTO company_verification_requests 
        (user_id, company_name, company_description, business_license_number, contact_email, contact_phone)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, company_name, company_description, business_license_number, contact_email, contact_phone]
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'Company registration successful. Verification request submitted.' 
    });
  } catch (err) {
    console.error('Error registering company:', err);
    res.status(500).json({ success: false, error: 'Failed to register company' });
  }
});

// Get verification status
router.get('/company/verification-status', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user info
    const userResult = await pool.query(
      'SELECT is_company, is_verified_company, company_name FROM users WHERE id = $1',
      [userId]
    );
    
    const user = userResult.rows[0];
    
    // If not even registered as a company, return appropriate status
    if (!user.is_company) {
      return res.json({
        requested: false,
        isCompany: false,
        isVerified: false
      });
    }
    
    // If already verified, return verified status
    if (user.is_verified_company) {
      return res.json({
        requested: true,
        status: 'approved',
        isCompany: true,
        isVerified: true,
        companyName: user.company_name
      });
    }
    
    // Check for verification requests
    const requestResult = await pool.query(
      'SELECT * FROM company_verification_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    
    if (requestResult.rows.length === 0) {
      return res.json({
        requested: false,
        isCompany: true,
        isVerified: false
      });
    }
    
    const request = requestResult.rows[0];
    
    res.json({
      requested: true,
      status: request.status,
      isCompany: true,
      isVerified: user.is_verified_company,
      companyName: request.company_name,
      submittedAt: request.created_at,
      reviewedAt: request.updated_at !== request.created_at ? request.updated_at : null,
      rejectionReason: request.status === 'rejected' ? request.rejection_reason : null
    });
  } catch (err) {
    console.error('Error fetching verification status:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch verification status' });
  }
});

// Admin endpoints for company verification
router.get('/admin/verification-requests', checkAdminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cvr.*, u.username, u.email, u.logo_url
      FROM company_verification_requests cvr
      JOIN users u ON cvr.user_id = u.id
      ORDER BY 
        CASE WHEN cvr.status = 'pending' THEN 0 ELSE 1 END,
        cvr.created_at DESC
    `);
    
    res.json({ success: true, requests: result.rows });
  } catch (err) {
    console.error('Error fetching verification requests:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch verification requests' });
  }
});

// Update verification request status
router.post('/admin/verification-requests/update', checkAdminMiddleware, async (req, res) => {
  try {
    const { requestId, action, rejectionReason } = req.body;
    
    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }
    
    // Get request info to get the user ID
    const requestResult = await pool.query(
      'SELECT user_id FROM company_verification_requests WHERE id = $1',
      [requestId]
    );
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Verification request not found' });
    }
    
    const userId = requestResult.rows[0].user_id;
    
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update the request status
      if (action === 'approve') {
        await client.query(
          'UPDATE company_verification_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['approved', requestId]
        );
        
        // Update user as verified company
        await client.query(
          'UPDATE users SET is_verified_company = TRUE WHERE id = $1',
          [userId]
        );
      } else {
        await client.query(
          'UPDATE company_verification_requests SET status = $1, rejection_reason = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          ['rejected', rejectionReason || 'No reason provided', requestId]
        );
      }
      
      await client.query('COMMIT');
      
      res.json({ 
        success: true, 
        message: `Verification request ${action === 'approve' ? 'approved' : 'rejected'} successfully` 
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error updating verification request:', err);
    res.status(500).json({ success: false, error: 'Failed to update verification request' });
  }
});

// Admin dashboard stats
router.get('/admin/stats', checkAdminMiddleware, async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      // Get user count
      const userCountResult = await client.query('SELECT COUNT(*) as count FROM users');
      
      // Get verification requests counts
      const verificationResult = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
        FROM company_verification_requests
      `);
      
      // Get listing counts
      const listingsResult = await client.query(`
        SELECT
          (SELECT COUNT(*) FROM houses) as houses,
          (SELECT COUNT(*) FROM cars) as cars,
          (SELECT COUNT(*) FROM jobs) as jobs,
          (SELECT COUNT(*) FROM items) as items
      `);
      
      // Fix the recent activity query - check if columns exist first
      let recentActivity = [];
      
      try {
        // Get recent user registrations if users table has created_at
        const usersHaveCreatedAt = await client.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'created_at'
        `);
        
        if (usersHaveCreatedAt.rows.length > 0) {
          const userActivity = await client.query(`
            SELECT 'user_created' as type, 'New user registered: ' || username as description, created_at as timestamp
            FROM users
            ORDER BY created_at DESC
            LIMIT 5
          `);
          recentActivity = [...recentActivity, ...userActivity.rows];
        }
        
        // Get recent verification requests if that table has created_at
        const verificationsHaveCreatedAt = await client.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'company_verification_requests' AND column_name = 'created_at'
        `);
        
        if (verificationsHaveCreatedAt.rows.length > 0) {
          const verificationActivity = await client.query(`
            SELECT 'verification_request' as type, 'Company verification request: ' || company_name as description, created_at as timestamp
            FROM company_verification_requests
            ORDER BY created_at DESC
            LIMIT 5
          `);
          recentActivity = [...recentActivity, ...verificationActivity.rows];
        }
        
        // Get recent conversation activity if that table has created_at
        const conversationsHaveCreatedAt = await client.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'conversations' AND column_name = 'created_at'
        `);
        
        if (conversationsHaveCreatedAt.rows.length > 0) {
          const conversationActivity = await client.query(`
            SELECT 
              CASE 
                WHEN listing_type = 'house' THEN 'house_listing' 
                WHEN listing_type = 'car' THEN 'car_listing'
                WHEN listing_type = 'job' THEN 'job_listing'
                ELSE 'item_listing'
              END as type,
              COALESCE('New message about ' || listing_type || ': ' || subject, 'New conversation') as description,
              created_at as timestamp
            FROM conversations
            WHERE listing_id IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 5
          `);
          recentActivity = [...recentActivity, ...conversationActivity.rows];
        }
        
        // Sort combined activity by timestamp
        recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        // Limit to 10 items
        recentActivity = recentActivity.slice(0, 10);
        
      } catch (activityErr) {
        console.error('Error fetching activity data:', activityErr);
        // Continue with empty activity array
      }
      
      res.json({
        users: parseInt(userCountResult.rows[0].count),
        verificationRequests: {
          total: parseInt(verificationResult.rows[0].total),
          pending: parseInt(verificationResult.rows[0].pending)
        },
        listings: {
          houses: parseInt(listingsResult.rows[0].houses),
          cars: parseInt(listingsResult.rows[0].cars),
          jobs: parseInt(listingsResult.rows[0].jobs),
          items: parseInt(listingsResult.rows[0].items)
        },
        recentActivity: recentActivity
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch admin statistics' });
  }
});

// Admin user management endpoints
router.get('/admin/users', checkAdminMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY id ASC');
    res.json({ success: true, users: result.rows });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

router.put('/admin/users/:id', checkAdminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, is_company, is_verified_company, company_name, company_description } = req.body;
    
    // Update user
    await pool.query(
      `UPDATE users 
       SET username = $1, email = $2, is_company = $3, is_verified_company = $4, 
           company_name = $5, company_description = $6
       WHERE id = $7`,
      [username, email, is_company, is_verified_company, company_name, company_description, id]
    );
    
    res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

router.post('/admin/users/:id/role', checkAdminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { role_id } = req.body;
    
    // Update user role
    await pool.query(
      'UPDATE users SET role_id = $1 WHERE id = $2',
      [role_id, id]
    );
    
    res.json({ success: true, message: 'User role updated successfully' });
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ success: false, error: 'Failed to update user role' });
  }
});

router.post('/admin/users/:id/verify', checkAdminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_verified } = req.body;
    
    // Update company verification status
    await pool.query(
      'UPDATE users SET is_verified_company = $1 WHERE id = $2',
      [is_verified, id]
    );
    
    res.json({ success: true, message: `Company ${is_verified ? 'verified' : 'unverified'} successfully` });
  } catch (err) {
    console.error('Error updating company verification:', err);
    res.status(500).json({ success: false, error: 'Failed to update company verification' });
  }
});

router.delete('/admin/users/:id', checkAdminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// Admin listings management endpoint
router.get('/admin/listings', checkAdminMiddleware, async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      // Get all listings from all categories
      const housesResult = await client.query(`
        SELECT h.*, 'house' as type, u.username as owner_username
        FROM houses h
        JOIN users u ON h.user_id = u.id
      `);
      
      const carsResult = await client.query(`
        SELECT c.*, 'car' as type, u.username as owner_username
        FROM cars c
        JOIN users u ON c.user_id = u.id
      `);
      
      const jobsResult = await client.query(`
        SELECT j.*, 'job' as type, u.username as owner_username
        FROM jobs j
        JOIN users u ON j.user_id = u.id
      `);
      
      const itemsResult = await client.query(`
        SELECT i.*, 'item' as type, u.username as owner_username
        FROM items i
        JOIN users u ON i.user_id = u.id
      `);
      
      res.json({
        success: true,
        listings: {
          houses: housesResult.rows,
          cars: carsResult.rows,
          jobs: jobsResult.rows,
          items: itemsResult.rows
        }
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error fetching listings:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch listings' });
  }
});

// Delete listing endpoint
router.delete('/admin/listings/:type/:id', checkAdminMiddleware, async (req, res) => {
  try {
    const { type, id } = req.params;
    
    // Validate listing type
    const validTypes = ['house', 'car', 'job', 'item'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid listing type' });
    }
    
    // Delete the listing
    await pool.query(`DELETE FROM ${type}s WHERE id = $1`, [id]);
    
    res.json({ success: true, message: `${type} listing deleted successfully` });
  } catch (err) {
    console.error('Error deleting listing:', err);
    res.status(500).json({ success: false, error: 'Failed to delete listing' });
  }
});

// Company profile endpoint
router.get('/company/profile', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user company data
    const result = await pool.query(
      'SELECT company_name, company_description, logo_url, is_verified_company FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    // Get profile views (if we track them)
    const viewsResult = await pool.query(
      'SELECT COUNT(*) as profile_views FROM profile_views WHERE profile_user_id = $1',
      [userId]
    ).catch(() => ({ rows: [{ profile_views: 0 }] })); // Default if table doesn't exist
    
    // Get total job applications
    const applicationsResult = await pool.query(
      'SELECT COUNT(*) as total_applications FROM job_applications WHERE job_id IN (SELECT id FROM jobs WHERE user_id = $1)',
      [userId]
    ).catch(() => ({ rows: [{ total_applications: 0 }] })); // Default if table doesn't exist
    
    res.json({
      success: true,
      ...user,
      profile_views: parseInt(viewsResult.rows[0].profile_views) || 0,
      total_applications: parseInt(applicationsResult.rows[0].total_applications) || 0
    });
  } catch (err) {
    console.error('Error fetching company profile:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch company profile' });
  }
});

// Update company profile
router.put('/company/profile', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { company_name, company_description, logo_url } = req.body;
    
    // Ensure user is a company
    const userCheck = await pool.query(
      'SELECT is_company FROM users WHERE id = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0 || !userCheck.rows[0].is_company) {
      return res.status(403).json({ success: false, error: 'User is not registered as a company' });
    }
    
    // Update company information
    await pool.query(
      'UPDATE users SET company_name = $1, company_description = $2' + 
      (logo_url ? ', logo_url = $3' : '') + 
      ' WHERE id = $' + (logo_url ? '4' : '3'),
      logo_url 
        ? [company_name, company_description, logo_url, userId]
        : [company_name, company_description, userId]
    );
    
    res.json({ 
      success: true, 
      message: 'Company profile updated successfully' 
    });
  } catch (err) {
    console.error('Error updating company profile:', err);
    res.status(500).json({ success: false, error: 'Failed to update company profile' });
  }
});

// Company jobs endpoint
router.get('/jobs/company', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all jobs for this company
    const result = await pool.query(
      'SELECT * FROM jobs WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching company jobs:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch jobs' });
  }
});

// Add a new route for job image uploads
router.post('/upload/jobs', checkAuth, async (req, res) => {
  try {
    // Use the upload middleware from fileStorage service
    upload.array('images', 5)(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'No files uploaded' });
      }
      
      const userId = req.user.id;
      
      // Check if user is a verified company
      const userCheck = await pool.query(
        'SELECT is_verified_company FROM users WHERE id = $1',
        [userId]
      );
      
      if (userCheck.rows.length === 0 || !userCheck.rows[0].is_verified_company) {
        return res.status(403).json({ success: false, error: 'Only verified companies can upload job banners' });
      }
      
      // Register files in database
      const fileIds = [];
      const urls = [];
      
      for (const file of req.files) {
        try {
          const fileId = await registerFile(file, userId, 'job');
          fileIds.push(fileId);
          
          // Create URL for client
          const url = `/api/files/${fileId}`;
          urls.push(url);
        } catch (fileErr) {
          console.error('Error registering file:', fileErr);
        }
      }
      
      res.json({ success: true, fileIds, urls });
    });
  } catch (err) {
    console.error('Error uploading job images:', err);
    res.status(500).json({ success: false, error: 'Failed to upload images' });
  }
});

// Add a route to serve files by ID
router.get('/files/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    
    // Get file info from database
    const result = await pool.query(
      'SELECT storage_path, mime_type, original_name FROM files WHERE id = $1',
      [fileId]
    );
    
    if (result.rows.length === 0) {
      console.log(`File not found in database: ${fileId}`);
      
      // Check if we can handle this as a direct URL path
      // Try to find the file in the uploads directory directly
      const uploadsDir = path.join(path.resolve(), 'uploads');
      const potentialPaths = [
        path.join(uploadsDir, `${fileId}.jpg`),
        path.join(uploadsDir, `${fileId}.png`),
        path.join(uploadsDir, `${fileId}.jpeg`),
        path.join(uploadsDir, `${fileId}.gif`),
        path.join(uploadsDir, `${fileId}`)
      ];
      
      // Try each potential path
      for (const potentialPath of potentialPaths) {
        if (fs.existsSync(potentialPath)) {
          // Determine mime type based on file extension
          const ext = path.extname(potentialPath).toLowerCase();
          let mimeType = 'application/octet-stream'; // default
          
          if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
          else if (ext === '.png') mimeType = 'image/png';
          else if (ext === '.gif') mimeType = 'image/gif';
          
          res.setHeader('Content-Type', mimeType);
          return fs.createReadStream(potentialPath).pipe(res);
        }
      }
      
      // If file not found in database or uploads, send a default placeholder
      res.setHeader('Content-Type', 'image/jpeg');
      return res.status(404).send(Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      ));
    }
    
    const fileInfo = result.rows[0];
    // Use path.resolve() since we're in ES modules
    const filePath = path.resolve(fileInfo.storage_path);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`File not found on server: ${filePath}`);
      
      // Serve a simple placeholder instead
      res.setHeader('Content-Type', 'image/jpeg');
      return res.status(404).send(Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      ));
    }
    
    // Set content type header
    res.setHeader('Content-Type', fileInfo.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${fileInfo.original_name}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (err) {
    console.error('Error serving file:', err);
    
    // Send a simple error placeholder
    res.setHeader('Content-Type', 'image/jpeg');
    res.status(500).send(Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    ));
  }
});

// Add a route for house image uploads
router.post('/upload/houses', checkAuth, async (req, res) => {
  try {
    // Use the upload middleware from fileStorage service
    upload.array('images', 5)(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'No files uploaded' });
      }
      
      const userId = req.user.id;
      
      // Register files in database
      const fileIds = [];
      const urls = [];
      
      for (const file of req.files) {
        try {
          const fileId = await registerFile(file, userId, 'house');
          fileIds.push(fileId);
          
          // Create URL for client
          const url = `/api/files/${fileId}`;
          urls.push(url);
        } catch (fileErr) {
          console.error('Error registering file:', fileErr);
        }
      }
      
      res.json({ success: true, fileIds, urls });
    });
  } catch (err) {
    console.error('Error uploading house images:', err);
    res.status(500).json({ success: false, error: 'Failed to upload images' });
  }
});

// Add a route for item image uploads
router.post('/upload/items', checkAuth, async (req, res) => {
  try {
    // Use the upload middleware to handle multiple images (max 5)
    upload.array('images', 5)(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'No files uploaded' });
      }
      
      const userId = req.user.id;
      
      // Register files in database
      const fileIds = [];
      const urls = [];
      
      for (const file of req.files) {
        try {
          const fileId = await registerFile(file, userId, 'item');
          fileIds.push(fileId);
          
          // Create URL for client
          const url = `/api/files/${fileId}`;
          urls.push(url);
        } catch (fileErr) {
          console.error('Error registering file:', fileErr);
        }
      }
      
      res.json({ success: true, fileIds, urls });
    });
  } catch (err) {
    console.error('Error uploading item images:', err);
    res.status(500).json({ success: false, error: 'Failed to upload images' });
  }
});

// Get all images for a specific house
router.get('/houses/:id/images', async (req, res) => {
  try {
    const houseId = req.params.id;
    
    // First check if house exists
    const houseCheck = await pool.query(
      'SELECT id FROM houses WHERE id = $1',
      [houseId]
    );
    
    if (houseCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'House not found' 
      });
    }
    
    // Get all images associated with this house
    const result = await pool.query(
      `SELECT f.id, f.original_name, f.mime_type, f.created_at
       FROM files f
       JOIN house_images hi ON f.id = hi.file_id
       WHERE hi.house_id = $1
       ORDER BY hi.display_order`,
      [houseId]
    );
    
    // Also get the primary image if not in house_images
    const primaryResult = await pool.query(
      `SELECT f.id, f.original_name, f.mime_type, f.created_at
       FROM files f
       JOIN houses h ON f.id = h.primary_image_id
       WHERE h.id = $1`,
      [houseId]
    );
    
    // Combine results and add URLs
    let allImages = [...result.rows];
    
    // Only add primary image if not already in the list
    if (primaryResult.rows.length > 0) {
      const primaryImage = primaryResult.rows[0];
      if (!allImages.some(img => img.id === primaryImage.id)) {
        allImages.unshift(primaryImage); // Add primary image to the beginning
      }
    }
    
    // Add URLs to each image
    allImages = allImages.map(img => ({
      ...img,
      url: `/api/files/${img.id}`
    }));
    
    res.json({ success: true, data: allImages });
  } catch (err) {
    console.error('Error fetching house images:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch house images' });
  }
});

// System health check routes
router.get('/system/db-check', async (req, res) => {
  try {
    // Test database connection by running a simple query
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    res.json({ success: true, connected: true });
  } catch (err) {
    console.error('Database connection check failed:', err);
    res.status(500).json({ success: false, connected: false, error: err.message });
  }
});

router.use('/jobs', jobsRouter);

export default router;