const express = require("express");
const router = express.Router();
const tonkhoController = require("../controllers/tonkho");

// Định nghĩa các route
router.get("/getAll", tonkhoController.getAll);
router.get("/getById/:id", tonkhoController.getById);
router.post("/create", tonkhoController.insert);
router.put("/update/:id", tonkhoController.update);
router.delete("/delete/:id", tonkhoController.delete);

module.exports = router;