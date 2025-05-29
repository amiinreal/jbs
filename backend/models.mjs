import { Pool } from 'pg';
import pool from './database.js';

// Define models for jobs, houses, cars, and everyday items

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
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
        company_description TEXT
      );
      -- Add phone_number column to users if it doesn't exist
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
      
      -- Job Listings Table (depends on users)
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
        -- image_url TEXT, -- This was in ensureJobTable in controller, consider if still needed
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        is_remote BOOLEAN DEFAULT FALSE,
        is_published BOOLEAN DEFAULT TRUE,
        views INTEGER DEFAULT 0,
        application_type VARCHAR(10) DEFAULT 'native', -- 'native' or 'external'
        external_application_url TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      -- Ensure new columns for application options are added if table already exists
      ALTER TABLE job_listings ADD COLUMN IF NOT EXISTS application_type VARCHAR(10) DEFAULT 'native';
      ALTER TABLE job_listings ADD COLUMN IF NOT EXISTS external_application_url TEXT DEFAULT NULL;

      -- Job Applications Table (depends on job_listings, users)
      CREATE TABLE IF NOT EXISTS job_applications (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES job_listings(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        cover_letter TEXT,
        resume_path TEXT,
        phone VARCHAR(20),
        availability TEXT,
        status VARCHAR(20) DEFAULT 'pending', -- e.g., pending, viewed, shortlisted, rejected
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (job_id, user_id)
      );

      -- Job Custom Questions Table (depends on job_listings)
      CREATE TABLE IF NOT EXISTS job_custom_questions (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES job_listings(id) ON DELETE CASCADE NOT NULL,
        question_text TEXT NOT NULL,
        question_type VARCHAR(20) NOT NULL, -- 'text', 'textarea', 'select', 'radio', 'checkbox'
        options TEXT DEFAULT NULL, -- JSON string array for 'select', 'radio', 'checkbox'
        is_required BOOLEAN DEFAULT FALSE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Job Application Custom Answers Table (depends on job_applications, job_custom_questions)
      CREATE TABLE IF NOT EXISTS job_application_custom_answers (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES job_applications(id) ON DELETE CASCADE NOT NULL,
        question_id INTEGER REFERENCES job_custom_questions(id) ON DELETE CASCADE NOT NULL,
        answer_text TEXT NOT NULL, -- Could be JSON for multiple selections from checkbox
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
        title VARCHAR(255), -- Add new title field
        address VARCHAR(255),
        price NUMERIC,
        description TEXT,
        number_of_bedrooms INT,
        number_of_bathrooms INT,
        square_footage INT,
        is_published BOOLEAN DEFAULT FALSE,
        user_id INT REFERENCES users(id),
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
        name VARCHAR(100) UNIQUE,
        description TEXT,
        price NUMERIC,
        is_published BOOLEAN DEFAULT FALSE,
        user_id INT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO items (name, description, price, is_published) VALUES
        ('Football Shoes', 'High-quality football shoes', 50.00, TRUE),
        ('Bicycle', 'Mountain bike with 21 gears', 150.00, TRUE),
        ('Lamp', 'LED desk lamp', 20.00, TRUE),
        ('Backpack', 'Waterproof backpack', 30.00, TRUE),
        ('Smartphone', 'Latest model smartphone', 700.00, TRUE),
        ('Laptop', '15-inch laptop with 8GB RAM', 1000.00, TRUE),
        ('Headphones', 'Noise-cancelling headphones', 100.00, TRUE),
        ('Watch', 'Smartwatch with fitness tracking', 200.00, TRUE),
        ('Sunglasses', 'Polarized sunglasses', 25.00, TRUE),
        ('Jacket', 'Windproof jacket', 60.00, TRUE),
        ('Tent', '4-person camping tent', 120.00, TRUE),
        ('Sleeping Bag', 'Warm sleeping bag', 40.00, TRUE),
        ('Cookware Set', 'Non-stick cookware set', 80.00, TRUE),
        ('Camera', 'Digital camera with zoom lens', 300.00, TRUE),
        ('Tablet', '10-inch tablet with stylus', 400.00, TRUE),
        ('Printer', 'Wireless color printer', 150.00, TRUE),
        ('Coffee Maker', 'Automatic coffee maker', 50.00, TRUE),
        ('Blender', 'High-speed blender', 70.00, TRUE),
        ('Microwave', 'Compact microwave oven', 90.00, TRUE),
        ('Vacuum Cleaner', 'Bagless vacuum cleaner', 120.00, TRUE)
        ON CONFLICT (name) DO NOTHING; -- Added ON CONFLICT to prevent errors on re-runs
      
      CREATE TABLE IF NOT EXISTS company_verification_requests (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        company_name VARCHAR(100),
        company_description TEXT,
        business_license_number VARCHAR(100),
        contact_email VARCHAR(100),
        contact_phone VARCHAR(50),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Add conversations and messages tables
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
      
      -- Add trigger to update conversation's updated_at when a new message is added
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

    // Add trigger function to enforce job posting restrictions
    // Update tables to add image support
    await client.query(`
      -- Create files table to store file metadata
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        original_name VARCHAR(255) NOT NULL,
        storage_path VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size INT NOT NULL,
        user_id INT REFERENCES users(id),
        entity_type VARCHAR(50), -- 'house', 'car', 'item', 'user'
        entity_id INT,           -- ID of the related entity
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Add columns to reference primary images
      ALTER TABLE users ADD COLUMN IF NOT EXISTS logo_file_id INT REFERENCES files(id) ON DELETE SET NULL;
      ALTER TABLE houses ADD COLUMN IF NOT EXISTS primary_image_id INT REFERENCES files(id) ON DELETE SET NULL;
      ALTER TABLE cars ADD COLUMN IF NOT EXISTS primary_image_id INT REFERENCES files(id) ON DELETE SET NULL;
      ALTER TABLE items ADD COLUMN IF NOT EXISTS primary_image_id INT REFERENCES files(id) ON DELETE SET NULL;
      
      -- Add image URL columns
      ALTER TABLE houses ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);
      ALTER TABLE houses ADD COLUMN IF NOT EXISTS image_urls TEXT[]; -- Add missing array column
      ALTER TABLE cars ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);
      ALTER TABLE cars ADD COLUMN IF NOT EXISTS image_urls TEXT[];
      ALTER TABLE items ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);
      ALTER TABLE items ADD COLUMN IF NOT EXISTS image_urls TEXT[];
      ALTER TABLE users ADD COLUMN IF NOT EXISTS logo_url VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS logo_urls TEXT[];
      ALTER TABLE users ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS image_urls TEXT[];
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(255);

      -- Add tables for linking entities to multiple images
      CREATE TABLE IF NOT EXISTS house_images (
        id SERIAL PRIMARY KEY,
        house_id INT REFERENCES houses(id) ON DELETE CASCADE,
        file_id INT REFERENCES files(id) ON DELETE CASCADE,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS car_images (
        id SERIAL PRIMARY KEY,
        car_id INT REFERENCES cars(id) ON DELETE CASCADE,
        file_id INT REFERENCES files(id) ON DELETE CASCADE,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS item_images (
        id SERIAL PRIMARY KEY,
        item_id INT REFERENCES items(id) ON DELETE CASCADE,
        file_id INT REFERENCES files(id) ON DELETE CASCADE,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Tables updated with secure file storage');
    
    // Update conversations and messages tables to include listing details
    await client.query(`
      -- Add listing_details column to conversations table if it doesn't exist
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS listing_details JSONB;
      
      -- Add listing_details column to messages table if it doesn't exist
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS listing_details JSONB;
    `);
    console.log('Conversations and messages tables updated with listing details');
    
    // Update company_verification_requests table to include rejection_reason
    await client.query(`
      -- Add rejection_reason column to company_verification_requests if it doesn't exist
      ALTER TABLE company_verification_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    `);
    console.log('Company verification requests table updated with rejection reason');

    // Create session table for persistent sessions
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user_sessions" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      )
    `);
    // The console log for custom questions will be removed as they are now part of the main block.
    // console.log('Custom job question tables created or already exist.'); 
    
    await client.query('COMMIT');
    console.log('All table creations and modifications committed.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', err);
    throw err;
  } finally {
    client.release();
  }
};

export { createTables };