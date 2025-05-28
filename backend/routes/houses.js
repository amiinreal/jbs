import express from 'express';
import pool from '../database.js';
import { checkAuthMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all published houses
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM houses WHERE is_published = TRUE ORDER BY created_at DESC'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching houses:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get all houses by authenticated user (for user's dashboard)
router.get('/user', checkAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM houses WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching user houses:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get house by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM houses WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'House not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(`Error fetching house ${req.params.id}:`, err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Create new house listing
router.post('/', checkAuthMiddleware, async (req, res) => {
  try {
    const { 
      title,
      address, 
      price, 
      description, 
      number_of_bedrooms, 
      number_of_bathrooms, 
      square_footage,
      is_published
    } = req.body;
    
    const userId = req.user.id;
    
    const result = await pool.query(
      `INSERT INTO houses 
        (title, address, price, description, number_of_bedrooms, number_of_bathrooms, square_footage, is_published, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [title, address, price, description, number_of_bedrooms, number_of_bathrooms, square_footage, is_published || false, userId]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error creating house listing:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Update house listing
router.put('/:id', checkAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title,
      address, 
      price, 
      description, 
      number_of_bedrooms, 
      number_of_bathrooms, 
      square_footage,
      is_published
    } = req.body;
    
    const userId = req.user.id;
    
    // Check if user owns the listing
    const checkOwnership = await pool.query(
      'SELECT user_id FROM houses WHERE id = $1',
      [id]
    );
    
    if (checkOwnership.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'House listing not found' });
    }
    
    if (checkOwnership.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to update this listing' });
    }
    
    const result = await pool.query(
      `UPDATE houses 
       SET title = $1, address = $2, price = $3, description = $4, number_of_bedrooms = $5, 
           number_of_bathrooms = $6, square_footage = $7, is_published = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [title, address, price, description, number_of_bedrooms, number_of_bathrooms, square_footage, is_published, id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'House listing not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(`Error updating house ${req.params.id}:`, err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Update just the publication status
router.patch('/:id', checkAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_published } = req.body;
    
    if (is_published === undefined) {
      return res.status(400).json({ success: false, error: 'Publication status required' });
    }
    
    const userId = req.user.id;
    
    // Check if user owns the listing
    const checkOwnership = await pool.query(
      'SELECT user_id FROM houses WHERE id = $1',
      [id]
    );
    
    if (checkOwnership.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'House listing not found' });
    }
    
    if (checkOwnership.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to update this listing' });
    }
    
    const result = await pool.query(
      `UPDATE houses 
       SET is_published = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [is_published, id, userId]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(`Error updating publication status for house ${req.params.id}:`, err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Delete house listing
router.delete('/:id', checkAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check if user owns the listing
    const checkOwnership = await pool.query(
      'SELECT user_id FROM houses WHERE id = $1',
      [id]
    );
    
    if (checkOwnership.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'House listing not found' });
    }
    
    if (checkOwnership.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to delete this listing' });
    }
    
    await pool.query(
      'DELETE FROM houses WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    res.json({ success: true, message: 'House listing deleted successfully' });
  } catch (err) {
    console.error(`Error deleting house ${req.params.id}:`, err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
