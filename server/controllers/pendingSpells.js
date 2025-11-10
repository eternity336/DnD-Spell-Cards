const db = require('../db/database');

exports.getPendingSpells = (req, res) => {
    db.all("SELECT * FROM pendingSpells", [], (err, rows) => {
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

exports.submitSpellForApproval = (req, res) => {
    const { spellData, submitterId } = req.body;
    const docId = spellData['Spell Name'].replace(/[\s/]/g, '-').toLowerCase();
    db.run(`INSERT INTO pendingSpells (name, data, submittedBy, status) VALUES (?, ?, ?, 'pending')`, [docId, JSON.stringify(spellData), submitterId], function (err, result) {
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
    
    const globalSpellData = { ...pendingSpell };
    delete globalSpellData.id;
    delete globalSpellData.submittedBy;
    delete globalSpellData.status;
    
    db.serialize(() => {
        db.run("INSERT OR REPLACE INTO spells (name, data) VALUES (?, ?)", [docId, JSON.stringify(globalSpellData)]);
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