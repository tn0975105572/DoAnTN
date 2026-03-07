const express = require("express");
const router = express.Router();
const thanhtoanController = require("../controllers/thanhtoan");

// Định nghĩa các route
router.get("/getAll", thanhtoanController.getAll);
router.get("/getById/:id", thanhtoanController.getById);
router.post("/create", thanhtoanController.insert);
router.put("/update/:id", thanhtoanController.update);
router.delete("/delete/:id", thanhtoanController.delete);

module.exports = router;