/**
 * SQL for creating and managing the jobs table
 */
export const createJobsTable = `
  CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    salary VARCHAR(100),
    location VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    experience_required VARCHAR(50),
    is_remote BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT,
    banner_image_url TEXT,
    applications_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;
