const express = require('express');
const path = require('node:path');
const db = require('./db/database');
const usersRouter = require('./routes/users');
const personasRouter = require('./routes/personas');
const spellsRouter = require('./routes/spells');
const pendingSpellsRouter = require('./routes/pendingSpells');
const logger = require('./middleware/logger');

const app = express();
const port = 3000;

app.use(logger); // Use the logger middleware for all requests
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../')));

// API routes
app.use('/api/users', usersRouter);
app.use('/api/personas', personasRouter);
app.use('/api/spells', spellsRouter);
app.use('/api/pending-spells', pendingSpellsRouter);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});