// NEW: Import dotenv to read .env file
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs'); // NEW: Added for one-time data import

// NEW: Import node-postgres Pool
const { Pool } = require('pg');

// NEW: Create a connection pool.
// It automatically reads the environment variables
const pool = new Pool();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '')));

// NEW: Function to create tables and import data on startup
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // 1. Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS spells (
        id SERIAL PRIMARY KEY,
        data JSONB NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS pending_spells (
        id SERIAL PRIMARY KEY,
        data JSONB NOT NULL
      )
    `);
    console.log('Database tables are ready.');

    // 2. Check if 'spells' table is empty. If so, migrate data.
    const res = await client.query('SELECT COUNT(*) FROM spells');
    if (res.rows[0].count === '0') {
      console.log('Empty database detected. Migrating data from JSON files...');
      
      // Migrate spells.json
      try {
        const spellsData = fs.readFileSync(path.join(__dirname, 'spells.json'), 'utf8');
        const spells = JSON.parse(spellsData);
        
        // Use a transaction for bulk insert
        await client.query('BEGIN');
        for (const spell of spells) {
          await client.query('INSERT INTO spells (data) VALUES ($1)', [spell]);
        }
        await client.query('COMMIT');
        console.log(`Successfully migrated ${spells.length} spells.`);
      } catch (err) {
        console.error('Error migrating spells.json:', err.message);
        await client.query('ROLLBACK');
      }

      // Migrate pending-spells.json
      try {
        const pendingData = fs.readFileSync(path.join(__dirname, 'pending-spells.json'), 'utf8');
        const pendingSpells = JSON.parse(pendingData);

        // Use a transaction for bulk insert
        await client.query('BEGIN');
        for (const spell of pendingSpells) {
          await client.query('INSERT INTO pending_spells (data) VALUES ($1)', [spell]);
        }
        await client.query('COMMIT');
        console.log(`Successfully migrated ${pendingSpells.length} pending spells.`);
      } catch (err) {
        console.error('Error migrating pending-spells.json:', err.message);
        await client.query('ROLLBACK');
      }

    } else {
      console.log('Database already contains data. Skipping migration.');
    }

  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    client.release();
  }
}

// === REFACTORED API ENDPOINTS ===

// API endpoint to get spells
app.get('/api/spells', async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM spells');
    // Map the result rows to just return the JSON data object
    res.json(result.rows.map(row => row.data));
  } catch (err) {
    console.error(err);
    res.status(500).send('Error reading spells data');
  }
});

// API endpoint to get pending spells
app.get('/api/pending-spells', async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM pending_spells');
    res.json(result.rows.map(row => row.data));
  } catch (err) {
    console.error(err);
    res.status(500).send('Error reading pending spells data');
  }
});

// API endpoint to submit a spell for approval
app.post('/api/pending-spells', async (req, res) => {
  const newSpell = req.body;
  try {
    // $1 is a parameterized query to prevent SQL injection
    const result = await pool.query(
      'INSERT INTO pending_spells (data) VALUES ($1) RETURNING data',
      [newSpell]
    );
    res.status(201).json(result.rows[0].data);
  } catch (err)
 {
    console.error(err);
    res.status(500).send('Error saving pending spell');
  }
});

// API endpoint to approve a spell
app.post('/api/pending-spells/approve', async (req, res) => {
  const spellToApprove = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Start transaction

    // 1. Insert into main spells table
    await client.query('INSERT INTO spells (data) VALUES ($1)', [spellToApprove]);

    // 2. Delete from pending table using the spell name inside the JSON
    const spellName = spellToApprove['Spell Name'];
    await client.query(
      'DELETE FROM pending_spells WHERE data->>\'Spell Name\' = $1',
      [spellName]
    );

    await client.query('COMMIT'); // Commit transaction
    res.status(200).json(spellToApprove);
  } catch (err) {
    await client.query('ROLLBACK'); // Rollback on error
    console.error(err);
    res.status(500).send('Error approving spell');
  } finally {
    client.release(); // Release client back to pool
  }
});

// API endpoint to reject a spell
app.post('/api/pending-spells/reject', async (req, res) => {
  const spellToReject = req.body;
  try {
    const spellName = spellToReject['Spell Name'];
    await pool.query(
      'DELETE FROM pending_spells WHERE data->>\'Spell Name\' = $1',
      [spellName]
    );
    res.status(200).json(spellToReject);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error rejecting spell');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  // Initialize the database tables and migrate data
  initializeDatabase();
});