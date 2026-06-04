const { pool } = require('../db/dbConfig');

async function createTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS document_templates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      file_path VARCHAR(255) NOT NULL,
      type VARCHAR(100) DEFAULT 'general',
      tags JSONB DEFAULT '[]',
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  try {
    await pool.query(query);
    console.log("✅ Table 'document_templates' created successfully.");
  } catch (err) {
    console.error("❌ Error creating table 'document_templates':", err);
  } finally {
    await pool.end();
  }
}

createTable();
