const sqlite3 = require('sqlite3').verbose();
const path = require('node:path');
const { sha256 } = require('js-sha256');

const dbPath = path.resolve(__dirname, 'spells.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the spells database.');
});

function hashPin(pin) {
    return sha256(pin);
}

// Helper function to add a column if it doesn't exist
function addColumnIfNotExists(dbInstance, tableName, columnName, columnType) {
    dbInstance.all(`PRAGMA table_info(${tableName})`, (err, columns) => { // Use dbInstance.all for PRAGMA
        if (err) {
            console.error(`Error checking table info for ${tableName}:`, err.message);
            return;
        }
        const columnExists = columns.some(col => col.name === columnName);
        if (!columnExists) {
            dbInstance.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`, (err) => {
                if (err) {
                    console.error(`Error adding column ${columnName} to ${tableName}:`, err.message);
                } else {
                    console.log(`Column ${columnName} added to ${tableName}.`);
                }
            });
        }
    });
}

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS spells (
            name TEXT PRIMARY KEY,
            data TEXT
        );
    `);
    // Conditionally add source column to spells table
    addColumnIfNotExists(db, 'spells', 'source', 'TEXT');

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            pinHash TEXT,
            role TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS personas (
            id TEXT PRIMARY KEY,
            data TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS pendingSpells (
            name TEXT PRIMARY KEY,
            data TEXT,
            submittedBy TEXT,
            status TEXT
        );
    `);
    // Conditionally add source column to pendingSpells table
    addColumnIfNotExists(db, 'pendingSpells', 'source', 'TEXT');

    // Seed initial admin user if not exists
    const adminUsername = 'admin';
    const adminPinHash = hashPin('0000'); // Default PIN is 0000

    db.get(`SELECT username FROM users WHERE username = ?`, [adminUsername], (err, row) => {
        if (err) {
            console.error("Error checking for admin user:", err.message);
            return;
        }
        if (!row) {
            db.run(`INSERT INTO users (username, pinHash, role) VALUES (?, ?, ?)`, [adminUsername, adminPinHash, 'admin'], (err) => {
                if (err) {
                    console.error("Error seeding admin user:", err.message);
                } else {
                    console.log('Initial admin user "admin" created with PIN "0000".');
                }
            });
        }
    });
});

module.exports = db;