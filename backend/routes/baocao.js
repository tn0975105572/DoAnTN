const express = require("express");
const router = express.Router();
const baocaoController = require("../controllers/baocao");

// Định nghĩa các route
router.get("/getAll", baocaoController.getAll);
router.get("/getById/:id", baocaoController.getById);
router.post("/create", baocaoController.insert);
router.put("/update/:id", baocaoController.update);
router.delete("/delete/:id", baocaoController.delete);

module.exports = router;