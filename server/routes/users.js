const express = require('express');
const router = express.Router();
const userController = require('../controllers/users');

router.get('/', userController.getAllUsers);
router.get('/:username', userController.getUser);
router.post('/', userController.createUser);
router.put('/:username', userController.updateUserPin);
router.delete('/:username', userController.deleteUser);

module.exports = router;