const { pool } = require('../db/dbConfig');

async function createTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS document_ocr (
      id SERIAL PRIMARY KEY,
      case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
      original_name VARCHAR(255) NOT NULL,
      mimetype VARCHAR(100),
      file_size INTEGER,
      ocr_text TEXT,
      langue VARCHAR(10) DEFAULT 'fr',
      type_document VARCHAR(100),
      resume TEXT,
      parties JSONB DEFAULT '{}',
      dates_extraites JSONB DEFAULT '[]',
      montants_extraits JSONB DEFAULT '[]',
      mots_cles JSONB DEFAULT '[]',
      niveau_urgence VARCHAR(20),
      juridiction VARCHAR(200),
      timeline JSONB DEFAULT '[]',
      faits_principaux JSONB DEFAULT '[]',
      delais_legaux JSONB DEFAULT '[]',
      model VARCHAR(100) DEFAULT 'Moteur Analytique Local (Déterministe)',
      chars_count INTEGER DEFAULT 0,
      processed_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_document_ocr_case_id ON document_ocr(case_id);
  `;

  try {
    await pool.query(query);
    console.log("✅ Table 'document_ocr' created successfully.");
  } catch (err) {
    console.error("❌ Error creating table 'document_ocr':", err);
  } finally {
    await pool.end();
  }
}

createTable();
