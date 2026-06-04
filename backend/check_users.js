const { pool } = require('./db/dbConfig');

async function run() {
  try {
    console.log('Connecting to PostgreSQL using dbConfig...');
    const client = await pool.connect();
    console.log('Connected successfully!');

    console.log('Fetching users...');
    const { rows } = await client.query('SELECT id, nom, email, role, deleted_at FROM users');
    console.log('Users in database:');
    console.table(rows);

    client.release();
  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    await pool.end();
  }
}

run();
