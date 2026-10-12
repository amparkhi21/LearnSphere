const crypto = require("crypto");

/**
 * Payment Service
 * ----------------
 * Uses Razorpay TEST MODE keys if configured (https://razorpay.com - free to sign up,
 * test mode has no cost and no real money moves).
 * Falls back to a "mock" provider that instantly marks payments as successful,
 * so the full purchase flow (enrollment, dashboards, etc.) can be demoed with zero setup.
 */

const isRazorpayConfigured = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const createOrder = async ({ amount, currency = "INR", receipt }) => {
  if (!isRazorpayConfigured()) {
    // Mock order - instantly "created"
    return {
      provider: "mock",
      id: `mock_order_${crypto.randomBytes(8).toString("hex")}`,
      amount: amount * 100,
      currency,
      receipt,
      status: "created",
    };
  }

  // Lazy-require so the app doesn't crash if razorpay package isn't installed/needed
  const Razorpay = require("razorpay");
  const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  const order = await instance.orders.create({
    amount: amount * 100, // paise
    currency,
    receipt,
  });
  return { provider: "razorpay", ...order };
};

const verifyPayment = ({ orderId, paymentId, signature }) => {
  if (!isRazorpayConfigured()) {
    // Mock mode: always verified
    return true;
  }
  const generated = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return generated === signature;
};

module.exports = { createOrder, verifyPayment, isRazorpayConfigured };
