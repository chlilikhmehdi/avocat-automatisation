const { pool } = require('../db/dbConfig');

async function migrate() {
  const query = `
    CREATE TABLE IF NOT EXISTS email_history (
      id SERIAL PRIMARY KEY,
      to_email VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      body TEXT,
      case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
      type VARCHAR(50), -- invoice_reminder, hearing_notice, document_share, custom
      status VARCHAR(50) DEFAULT 'SENT', -- SENT, FAILED
      sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL, -- ID of the lawyer who triggered it (or null if system)
      sent_at TIMESTAMP DEFAULT NOW(),
      error_msg TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_email_history_case_id ON email_history(case_id);
  `;
  try {
    await pool.query(query);
    console.log('✅ Table email_history created successfully.');
  } catch (err) {
    console.error('❌ Error creating email_history:', err);
  } finally {
    await pool.end();
  }
}

migrate();
