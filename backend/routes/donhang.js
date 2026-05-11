const express = require("express");
const router = express.Router();
const donhangController = require("../controllers/donhang");
const authMiddleware = require("../middleware/baoVe");

router.get(
  "/getAll",
  authMiddleware.authenticateToken,
  donhangController.getAll
);
router.get(
  "/my",
  authMiddleware.authenticateToken,
  donhangController.getMyOrders
);
router.get(
  "/user/:userId",
  authMiddleware.authenticateToken,
  donhangController.getByUserId
);
router.get(
  "/transaction/:transactionId",
  authMiddleware.authenticateToken,
  donhangController.getByTransactionId
);
router.get(
  "/getById/:id",
  authMiddleware.authenticateToken,
  donhangController.getById
);

module.exports = router;
