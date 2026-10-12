const express = require("express");
const { createOrder, verifyPayment, getMyPayments } = require("../controllers/payment.controller");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(protect);

router.post("/create-order", createOrder);
router.post("/verify", verifyPayment);
router.get("/mine", getMyPayments);

module.exports = router;
