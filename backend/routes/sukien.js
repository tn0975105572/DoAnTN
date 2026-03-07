const express = require("express");
const router = express.Router();
const sukienController = require("../controllers/sukien");

// Định nghĩa các route
router.get("/getAll", sukienController.getAll);
router.get("/getById/:id", sukienController.getById);
router.post("/create", sukienController.insert);
router.put("/update/:id", sukienController.update);
router.delete("/delete/:id", sukienController.delete);

module.exports = router;