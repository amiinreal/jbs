import pool from './database.js';
import bcrypt from 'bcrypt';

const createAdminUser = async () => {
  // Use hardcoded values instead of environment variables
  const adminUsername = 'admin';
  const adminPassword = 'adminpassword'; // Change this in production!
  const adminEmail = 'admin@example.com';

  try {
    const client = await pool.connect();
    
    // Check if roles table exists and has the admin role
    try {
      // Check if admin role exists
      const roleCheck = await client.query('SELECT * FROM roles WHERE name = $1', ['admin']);
      
      // If no admin role exists, insert it
      if (roleCheck.rows.length === 0) {
        console.log('Creating admin role...');
        await client.query('INSERT INTO roles (name) VALUES ($1)', ['admin']);
        console.log('Admin role created.');
      }
      
      // Get admin role ID
      const roleResult = await client.query('SELECT id FROM roles WHERE name = $1', ['admin']);
      const adminRoleId = roleResult.rows[0].id;

      // Check if admin user already exists
      const userCheck = await client.query('SELECT id FROM users WHERE username = $1', [adminUsername]);
      if (userCheck.rows.length > 0) {
        console.log(`Admin user '${adminUsername}' already exists.`);
        
        // Ensure the existing user has admin role
        await client.query('UPDATE users SET role_id = $1 WHERE username = $2', [adminRoleId, adminUsername]);
        console.log(`Ensured '${adminUsername}' has admin role.`);
      } else {
        // Hash password and create admin user
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const result = await client.query(
          'INSERT INTO users (username, password, email, role_id) VALUES ($1, $2, $3, $4) RETURNING id',
          [adminUsername, hashedPassword, adminEmail, adminRoleId]
        );
        
        if (result.rows.length > 0) {
          console.log(`Admin user '${adminUsername}' created successfully with ID: ${result.rows[0].id}`);
        } else {
          console.error('Failed to create admin user.');
        }
      }
    } catch (error) {
      // The tables might not exist yet
      console.error('Error working with roles table:', error);
      console.log('Make sure to run database initialization first.');
    }

    client.release();
  } catch (error) {
    console.error('Database connection error:', error);
  }
};

// Execute the function directly when script is run
createAdminUser().catch(console.error);