require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../db/dbConfig');

async function migrate() {
  const query = `
    CREATE TABLE IF NOT EXISTS hearings (
      id SERIAL PRIMARY KEY,
      case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
      lawyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      hearing_date DATE NOT NULL,
      hearing_time TIME,
      location VARCHAR(255),
      status VARCHAR(50) DEFAULT 'scheduled',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS legal_deadlines (
      id SERIAL PRIMARY KEY,
      case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
      lawyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      deadline_date DATE NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_hearings_case_id ON hearings(case_id);
    CREATE INDEX IF NOT EXISTS idx_hearings_lawyer_id ON hearings(lawyer_id);
    CREATE INDEX IF NOT EXISTS idx_legal_deadlines_case_id ON legal_deadlines(case_id);
    CREATE INDEX IF NOT EXISTS idx_legal_deadlines_lawyer_id ON legal_deadlines(lawyer_id);
  `;
  try {
    await pool.query(query);
    console.log('✅ Tables hearings et legal_deadlines créées avec succès.');
  } catch (err) {
    console.error('❌ Erreur:', err);
  } finally {
    await pool.end();
  }
}
migrate();
