const express = require('express');
const router = express.Router();
const spellController = require('../controllers/spells');

router.get('/', spellController.getGlobalSpells);
router.post('/', spellController.batchUpdateSpells);
router.put('/:name', spellController.updateSpell);
router.delete('/:name', spellController.deleteSpell);

module.exports = router;