const express = require('express');
const router = express.Router();
const pendingSpellController = require('../controllers/pendingSpells');

router.get('/', pendingSpellController.getPendingSpells);
router.post('/', pendingSpellController.submitSpellForApproval);
router.post('/approve', pendingSpellController.approveSpell);
router.post('/reject', pendingSpellController.rejectSpell);

module.exports = router;