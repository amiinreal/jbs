import pool from './database.js';

/**
 * Creates all triggers for the database
 */
const createTriggers = async () => {
  try {
    // Update timestamp trigger for various tables
    await pool.query(`
      -- Create function to update timestamp
      CREATE OR REPLACE FUNCTION update_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Apply to houses table
      DROP TRIGGER IF EXISTS update_houses_timestamp ON houses;
      CREATE TRIGGER update_houses_timestamp
        BEFORE UPDATE ON houses
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
      
      -- Apply to conversations table
      DROP TRIGGER IF EXISTS update_conversations_timestamp ON conversations;
      CREATE TRIGGER update_conversations_timestamp
        BEFORE UPDATE ON conversations
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
        
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
    
    console.log('Database triggers created successfully');
  } catch (err) {
    console.error('Error creating triggers:', err);
    throw err;
  }
};

export { createTriggers };
