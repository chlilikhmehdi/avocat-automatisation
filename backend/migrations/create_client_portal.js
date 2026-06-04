const { pool } = require('../db/dbConfig');

async function migrate() {
  const queries = [
    // Table messages client ↔ avocat
    `CREATE TABLE IF NOT EXISTS client_messages (
      id SERIAL PRIMARY KEY,
      case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
      sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      receiver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      content TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_client_messages_case_id ON client_messages(case_id)`,
    `CREATE INDEX IF NOT EXISTS idx_client_messages_receiver ON client_messages(receiver_id)`,
    // Table documents partagés avec le client (référence case_files)
    `CREATE TABLE IF NOT EXISTS client_shared_files (
      id SERIAL PRIMARY KEY,
      case_file_id INTEGER REFERENCES case_files(id) ON DELETE CASCADE,
      case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
      shared_by INTEGER REFERENCES users(id),
      shared_at TIMESTAMP DEFAULT NOW(),
      note TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_shared_files_case ON client_shared_files(case_id)`,
  ];

  console.log('🚀 Running client portal migrations...');
  for (const q of queries) {
    await pool.query(q);
  }
  console.log('✅ Client portal migrations complete.');
  await pool.end();
}

migrate().catch(err => { console.error('❌', err); process.exit(1); });
