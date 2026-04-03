const express = require("express");
const router = express.Router();
const tonkhoController = require("../controllers/tonkho");

// Định nghĩa các route
router.get("/getAll", tonkhoController.getAll);
router.get("/getById/:id", tonkhoController.getById);
router.get("/by-post/:postId", tonkhoController.getByPostId);
router.post("/create", tonkhoController.insert);
router.put("/update/:id", tonkhoController.update);
router.put("/upsert/by-post/:postId", tonkhoController.upsertByPostId);
router.delete("/delete/:id", tonkhoController.delete);

module.exports = router;
