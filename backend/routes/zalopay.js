const express = require("express");
const router = express.Router();
const zalopayController = require("../controllers/zalopay");
const authMiddleware = require("../middleware/baoVe");

router.post("/payment", authMiddleware.authenticateToken, zalopayController.createOrder);
router.post("/callback", zalopayController.callback);
router.get("/order-status/:app_trans_id", authMiddleware.authenticateToken, zalopayController.checkOrderStatus);

module.exports = router;
