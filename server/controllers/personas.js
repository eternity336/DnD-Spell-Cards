const db = require('../db/database');

exports.getPersonas = (req, res) => {
    db.get("SELECT data FROM personas WHERE id = 'personas'", [], (err, row) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": row ? JSON.parse(row.data) : {}
        })
    });
};

exports.savePersonas = (req, res) => {
    const personasData = req.body;
    db.run(`INSERT OR REPLACE INTO personas (id, data) VALUES (?, ?)`, ['personas', JSON.stringify(personasData)], function (err, result) {
        if (err) {
            res.status(400).json({ "error": err.message })
            return;
        }
        res.json({ message: "success" })
    });
};