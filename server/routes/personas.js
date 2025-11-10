const express = require('express');
const router = express.Router();
const personaController = require('../controllers/personas');

router.get('/', personaController.getPersonas);
router.post('/', personaController.savePersonas);

module.exports = router;