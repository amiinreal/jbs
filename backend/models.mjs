import { Pool } from 'pg';
import pool from './database.js';

/**
 * Creates database tables
 */
const createTables = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create tables and seed roles
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE
      );

      INSERT INTO roles (name) VALUES ('user') ON CONFLICT (name) DO NOTHING;
      INSERT INTO roles (name) VALUES ('admin') ON CONFLICT (name) DO NOTHING;

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE,
        password VARCHAR(255),
        email VARCHAR(100),
        role_id INT REFERENCES roles(id),
        is_company BOOLEAN DEFAULT FALSE,
        is_verified_company BOOLEAN DEFAULT FALSE,
        company_name VARCHAR(100),
        company_description TEXT,
        phone_number VARCHAR(50),
        logo_url TEXT NULL,
        logo_file_id INTEGER NULL
      );

      CREATE TABLE IF NOT EXISTS job_listings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        job_type VARCHAR(50) DEFAULT 'full-time',
        description TEXT,
        salary VARCHAR(100),
        experience_required VARCHAR(50),
        banner_image_url TEXT,
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        is_remote BOOLEAN DEFAULT FALSE,
        is_published BOOLEAN DEFAULT TRUE,
        views INTEGER DEFAULT 0,
        application_type VARCHAR(10) DEFAULT 'native',
        external_application_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS job_applications (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES job_listings(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        cover_letter TEXT,
        resume_path TEXT,
        phone VARCHAR(20),
        availability TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (job_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS job_custom_questions (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES job_listings(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        question_type VARCHAR(20) NOT NULL,
        options TEXT,
        is_required BOOLEAN DEFAULT FALSE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS job_application_custom_answers (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES job_applications(id) ON DELETE CASCADE,
        question_id INTEGER REFERENCES job_custom_questions(id) ON DELETE CASCADE,
        answer_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ads (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100),
        description TEXT,
        is_published BOOLEAN DEFAULT FALSE,
        user_id INT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS houses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        address VARCHAR(255),
        price NUMERIC,
        description TEXT,
        number_of_bedrooms INT,
        number_of_bathrooms INT,
        square_footage INT,
        is_published BOOLEAN DEFAULT FALSE,
        user_id INT REFERENCES users(id),
        image_url TEXT NULL,
        image_urls TEXT[] NULL,
        primary_image_id INTEGER NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cars (
        id SERIAL PRIMARY KEY,
        make VARCHAR(50),
        model VARCHAR(50),
        year INT,
        price NUMERIC,
        color VARCHAR(50),
        mileage INT,
        fuel_type VARCHAR(50),
        is_published BOOLEAN DEFAULT FALSE,
        user_id INT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE
      );

      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        description TEXT,
        price NUMERIC,
        is_published BOOLEAN DEFAULT FALSE,
        user_id INT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Unique constraint for items per user
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'items_name_user_id_key'
        ) THEN
          ALTER TABLE items ADD CONSTRAINT items_name_user_id_key UNIQUE (name, user_id);
        END IF;
      END
      $$;
    `);

    // Insert test user
    await client.query(`
      INSERT INTO users (username, password, email, role_id)
      VALUES ('testuser', 'hashedpassword', 'test@example.com', 1)
      ON CONFLICT (username) DO NOTHING;
    `);

    // Get test user ID
    const res = await client.query(`SELECT id FROM users WHERE username = 'testuser'`);
    const testUserId = res.rows[0]?.id;

    // Insert items linked to test user
    if (testUserId) {
      await client.query(`
        INSERT INTO items (name, description, price, is_published, user_id) VALUES
          ('Football Shoes', 'High-quality football shoes', 50.00, TRUE, $1),
          ('Bicycle', 'Mountain bike with 21 gears', 150.00, TRUE, $1),
          ('Lamp', 'LED desk lamp', 20.00, TRUE, $1)
        ON CONFLICT (name, user_id) DO NOTHING;
      `, [testUserId]);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS company_verification_requests (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        company_name VARCHAR(100),
        company_description TEXT,
        business_license_number VARCHAR(100),
        contact_email VARCHAR(100),
        contact_phone VARCHAR(50),
        status VARCHAR(20) DEFAULT 'pending',
        rejection_reason TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        participant1_id INT REFERENCES users(id),
        participant2_id INT REFERENCES users(id),
        subject VARCHAR(255),
        listing_id INT,
        listing_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id INT REFERENCES users(id),
        recipient_id INT REFERENCES users(id),
        content TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE OR REPLACE FUNCTION update_conversation_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE conversations
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.conversation_id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS update_conversation_updated_at ON messages;
      CREATE TRIGGER update_conversation_updated_at
        AFTER INSERT ON messages
        FOR EACH ROW
        EXECUTE FUNCTION update_conversation_timestamp();
    `);

    console.log('Tables created successfully');
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', err);
  } finally {
    client.release();
  }
};

export { createTables };

