const db = require('../db/database');

exports.getGlobalSpells = (req, res) => {
    db.all("SELECT * FROM spells", [], (err, rows) => {
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

exports.batchUpdateSpells = (req, res) => {
    const spellsToUpload = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO spells (name, data) VALUES (?, ?)");
    for (const spell of spellsToUpload) {
        const docId = spell['Spell Name'].replace(/[\s/]/g, '-').toLowerCase();
        stmt.run(docId, JSON.stringify(spell));
    }
    stmt.finalize((err) => {
        if (err) {
            res.status(400).json({ "error": err.message })
            return;
        }
        res.json({ message: "success" })
    });
};

exports.updateSpell = (req, res) => {
    const { name } = req.params;
    const newSpellData = req.body;
    const newDocId = newSpellData['Spell Name'].replace(/[\s/]/g, '-').toLowerCase();

    if (name !== newDocId) {
        db.run("DELETE FROM spells WHERE name = ?", [name]);
    }
    db.run("INSERT OR REPLACE INTO spells (name, data) VALUES (?, ?)", [newDocId, JSON.stringify(newSpellData)], function (err, result) {
        if (err) {
            res.status(400).json({ "error": err.message })
            return;
        }
        res.json({ message: "success" })
    });
};

exports.deleteSpell = (req, res) => {
    const { name } = req.params;
    db.run(`DELETE FROM spells WHERE name = ?`, name, function (err, result) {
        if (err) {
            res.status(400).json({ "error": err.message })
            return;
        }
        res.json({ message: "deleted", changes: this.changes })
    });
};