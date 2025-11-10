const db = require('../db/database');

exports.getAllUsers = (req, res) => {
    db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        })
    });
};

exports.getUser = (req, res) => {
    db.get("SELECT * FROM users WHERE username = ?", [req.params.username], (err, row) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": row || null // Return null if row is undefined
        })
    });
};

exports.createUser = (req, res) => {
    const { username, pinHash, role } = req.body;
    db.run(`INSERT INTO users (username, pinHash, role) VALUES (?, ?, ?)`, [username, pinHash, role], function (err, result) {
        if (err) {
            res.status(400).json({ "error": err.message })
            return;
        }
        res.json({
            "message": "success",
            "data": { username, pinHash, role },
            "id": this.lastID
        })
    });
};

exports.updateUserPin = (req, res) => {
    const { pinHash } = req.body;
    const username = req.params.username;
    console.log(`Attempting to update PIN for user: ${username}`);
    console.log(`New PIN Hash: ${pinHash}`);
    db.run(`UPDATE users SET pinHash = ? WHERE username = ?`, [pinHash, username], function (err, result) {
        if (err) {
            console.error(`Error updating PIN for user ${username}:`, err.message);
            res.status(400).json({ "error": err.message })
            return;
        }
        console.log(`PIN update for user ${username} successful. Rows affected: ${this.changes}`);
        res.json({ message: "success", changes: this.changes })
    });
};

exports.deleteUser = (req, res) => {
    db.run(`DELETE FROM users WHERE username = ?`, req.params.username, function (err, result) {
        if (err) {
            res.status(400).json({ "error": err.message })
            return;
        }
        res.json({ message: "deleted", changes: this.changes })
    });
};