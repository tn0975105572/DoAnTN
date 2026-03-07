const express = require("express");
const router = express.Router();
const zalopayController = require("../controllers/zalopay");

router.post("/payment", zalopayController.createOrder);
router.post("/callback", zalopayController.callback);
router.get("/order-status/:app_trans_id", zalopayController.checkOrderStatus);

module.exports = router;
