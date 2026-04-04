const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin");

router.get("/dashboard/:userId", adminController.getDashboard);

module.exports = router;
