const db = require('../db/database');

exports.getPendingSpells = (req, res) => {
    db.all("SELECT name, data, submittedBy, status, source FROM pendingSpells", [], (err, rows) => { // Select source explicitly
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        const pendingSpellsWithSource = rows.map(row => {
            if (!row || !row.data || row.data.trim() === '') {
                return null;
            }
            const spellData = JSON.parse(row.data);
            spellData.id = row.name;
            spellData.submittedBy = row.submittedBy;
            spellData.status = row.status;
            spellData.Source = row.source;
            return spellData;
        }).filter(Boolean);
        res.json({
            "message": "success",
            "data": pendingSpellsWithSource
        })
    });
};

exports.submitSpellForApproval = (req, res) => {
    const { spellData, submitterId } = req.body;
    const docId = spellData['Spell Name'].replace(/[\s/]/g, '-').toLowerCase();
    const source = spellData['Source'] || null; // Get source from spellData, default to null
    db.run(`INSERT INTO pendingSpells (name, data, submittedBy, status, source) VALUES (?, ?, ?, 'pending', ?)`, [docId, JSON.stringify(spellData), submitterId, source], function (err, result) {
        if (err) {
            res.status(400).json({ "error": err.message })
            return;
        }
        res.json({ message: "success" })
    });
};

exports.approveSpell = (req, res) => {
    const pendingSpell = req.body;
    const docId = pendingSpell['Spell Name'].replace(/[\s/]/g, '-').toLowerCase();
    const source = pendingSpell['Source'] || null; // Get source from pendingSpell, default to null
    
    const globalSpellData = { ...pendingSpell };
    delete globalSpellData.id;
    delete globalSpellData.submittedBy;
    delete globalSpellData.status;
    delete globalSpellData.Source; // Also delete Source from globalSpellData as it's stored separately

    db.serialize(() => {
        db.run("INSERT OR REPLACE INTO spells (name, data, source) VALUES (?, ?, ?)", [docId, JSON.stringify(globalSpellData), source]);
        db.run("DELETE FROM pendingSpells WHERE name = ?", [pendingSpell.id], function (err, result) {
            if (err) {
                res.status(400).json({ "error": err.message })
                return;
            }
            res.json({ message: "success" })
        });
    });
};

exports.rejectSpell = (req, res) => {
    const pendingSpell = req.body;
    console.log(`Attempting to reject pending spell with ID: ${pendingSpell.id}`);
    db.run(`DELETE FROM pendingSpells WHERE name = ?`, pendingSpell.id, function (err, result) {
        if (err) {
            console.error(`Error rejecting pending spell ${pendingSpell.id}:`, err.message);
            res.status(400).json({ "error": err.message })
            return;
        }
        console.log(`Pending spell ${pendingSpell.id} rejected. Rows affected: ${this.changes}`);
        res.json({ message: "deleted", changes: this.changes })
    });
};