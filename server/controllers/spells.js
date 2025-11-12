const db = require('../db/database');

exports.getGlobalSpells = (req, res) => {
    db.all("SELECT name, data, source FROM spells", [], (err, rows) => { // Select source explicitly
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        const spellsWithSource = rows.map(row => {
            if (!row || !row.data || row.data.trim() === '') {
                return null;
            }
            const spellData = JSON.parse(row.data);
            spellData.Source = row.source;
            return spellData;
        }).filter(Boolean);
        res.json({
            "message": "success",
            "data": spellsWithSource
        })
    });
};

exports.batchUpdateSpells = (req, res) => {
    const spellsToUpload = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO spells (name, data, source) VALUES (?, ?, ?)");
    for (const spell of spellsToUpload) {
        const docId = spell['Spell Name'].replace(/[\s/]/g, '-').toLowerCase();
        const source = spell['Source'] || null; // Get source from spell object, default to null
        stmt.run(docId, JSON.stringify(spell), source);
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
    const source = newSpellData['Source'] || null; // Get source from newSpellData, default to null

    if (name !== newDocId) {
        db.run("DELETE FROM spells WHERE name = ?", [name]);
    }
    db.run("INSERT OR REPLACE INTO spells (name, data, source) VALUES (?, ?, ?)", [newDocId, JSON.stringify(newSpellData), source], function (err, result) {
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