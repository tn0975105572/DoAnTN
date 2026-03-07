const express = require("express");
const router = express.Router();
const tinnhanaiController = require("../controllers/tinnhanai");

// Định nghĩa các route
router.get("/getAll", tinnhanaiController.getAll);
router.get("/getById/:id", tinnhanaiController.getById);
router.post("/create", tinnhanaiController.insert);
router.put("/update/:id", tinnhanaiController.update);
router.delete("/delete/:id", tinnhanaiController.delete);

module.exports = router;