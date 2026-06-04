const { pool } = require('../db/dbConfig');

async function migrate() {
  const query = `
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'todo', -- todo | in_progress | review | done
      priority VARCHAR(20) DEFAULT 'medium', -- low | medium | high
      assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      due_date DATE,
      position INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_case_id ON tasks(case_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  `;
  try {
    await pool.query(query);
    console.log('✅ Table tasks créée avec succès.');
  } catch (err) {
    console.error('❌ Erreur:', err);
  } finally {
    await pool.end();
  }
}
migrate();
