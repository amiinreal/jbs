/**
 * Database connection module
 * 
 * This file serves as a compatibility layer to redirect imports from db.js to database.js
 * Many modules in the application may reference this file, so we maintain it for compatibility.
 */

// Simply re-export everything from database.js
import pool from './database.js';
export default pool;
