
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '')));

// API endpoint to get spells
app.get('/api/spells', (req, res) => {
  fs.readFile(path.join(__dirname, 'spells.json'), 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading spells data');
      return;
    }
    if (!data) {
      return res.json([]);
    }
    res.json(JSON.parse(data));
  });
});

// API endpoint to get pending spells
app.get('/api/pending-spells', (req, res) => {
  fs.readFile(path.join(__dirname, 'pending-spells.json'), 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading pending spells data');
      return;
    }
    if (!data) {
      return res.json([]);
    }
    res.json(JSON.parse(data));
  });
});

// API endpoint to submit a spell for approval
app.post('/api/pending-spells', (req, res) => {
  const newSpell = req.body;
  fs.readFile(path.join(__dirname, 'pending-spells.json'), 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading pending spells data');
      return;
    }
    const spells = data ? JSON.parse(data) : [];
    spells.push(newSpell);
    fs.writeFile(path.join(__dirname, 'pending-spells.json'), JSON.stringify(spells, null, 2), (err) => {
      if (err) {
        res.status(500).send('Error saving pending spell');
        return;
      }
      res.status(201).json(newSpell);
    });
  });
});

// API endpoint to approve a spell
app.post('/api/pending-spells/approve', (req, res) => {
  const spellToApprove = req.body;
  fs.readFile(path.join(__dirname, 'spells.json'), 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading spells data');
      return;
    }
    const spells = data ? JSON.parse(data) : [];
    spells.push(spellToApprove);
    fs.writeFile(path.join(__dirname, 'spells.json'), JSON.stringify(spells, null, 2), (err) => {
      if (err) {
        res.status(500).send('Error saving spell');
        return;
      }
      fs.readFile(path.join(__dirname, 'pending-spells.json'), 'utf8', (err, data) => {
        if (err) {
          res.status(500).send('Error reading pending spells data');
          return;
        }
        const pendingSpells = data ? JSON.parse(data) : [];
        const updatedPendingSpells = pendingSpells.filter(spell => spell['Spell Name'] !== spellToApprove['Spell Name']);
        fs.writeFile(path.join(__dirname, 'pending-spells.json'), JSON.stringify(updatedPendingSpells, null, 2), (err) => {
          if (err) {
            res.status(500).send('Error removing pending spell');
            return;
          }
          res.status(200).json(spellToApprove);
        });
      });
    });
  });
});

// API endpoint to reject a spell
app.post('/api/pending-spells/reject', (req, res) => {
  const spellToReject = req.body;
  fs.readFile(path.join(__dirname, 'pending-spells.json'), 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading pending spells data');
      return;
    }
    const pendingSpells = data ? JSON.parse(data) : [];
    const updatedPendingSpells = pendingSpells.filter(spell => spell['Spell Name'] !== spellToReject['Spell Name']);
    fs.writeFile(path.join(__dirname, 'pending-spells.json'), JSON.stringify(updatedPendingSpells, null, 2), (err) => {
      if (err) {
        res.status(500).send('Error removing pending spell');
        return;
      }
      res.status(200).json(spellToReject);
    });
  });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
