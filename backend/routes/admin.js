import express from 'express';
import pool from '../database.js';
import { checkAdminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get online users from the user_sessions table
router.get('/online-users', checkAdminMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT u.id, u.username, u.email, u.is_company, u.is_verified_company, 
             s.expire as session_expires, r.name as role
      FROM "user_sessions" s
      JOIN users u ON (s.sess->'user'->>'id')::integer = u.id
      JOIN roles r ON u.role_id = r.id
      WHERE s.expire > NOW()
      ORDER BY s.expire DESC
    `;
    
    const result = await pool.query(query);
    res.json({ success: true, users: result.rows });
  } catch (err) {
    console.error('Error fetching online users:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch online users' });
  }
});

export default router;
