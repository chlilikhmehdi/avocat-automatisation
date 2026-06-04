-- SQL migration for creating the notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'hearing', 'document', 'deadline', 'invoice'
  entity_type VARCHAR(50),    -- 'hearings', 'case_files', 'legal_deadlines', 'invoices'
  entity_id INTEGER,          -- ID de l'entité liée pour éviter les doublons
  link VARCHAR(255),          -- Lien de redirection
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
