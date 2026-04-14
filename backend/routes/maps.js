const express = require('express');
const router = express.Router();
const mapsController = require('../controllers/maps');

router.get('/search', mapsController.searchPlaces);
router.get('/reverse', mapsController.reversePlace);

module.exports = router;
