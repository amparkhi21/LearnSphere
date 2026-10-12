const Payment = require("../models/payment.model");
const Course = require("../models/course.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const paymentService = require("../services/payment.service");
const { PAYMENT_STATUS } = require("../constants");

// @route POST /api/v1/payments/create-order   body: { courseId }
const createOrder = asyncHandler(async (req, res) => {
  const { courseId } = req.body;

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");

  const amount = course.discountPrice > 0 ? course.discountPrice : course.price;
  if (amount <= 0) throw new ApiError(400, "This course is free, no payment needed. Enroll directly.");

  const order = await paymentService.createOrder({
    amount,
    receipt: `course_${course._id}_${req.user._id}`,
  });

  const payment = await Payment.create({
    student: req.user._id,
    course: course._id,
    amount,
    provider: order.provider,
    providerOrderId: order.id,
    status: PAYMENT_STATUS.PENDING,
  });

  res.status(201).json(new ApiResponse(201, { order, paymentId: payment._id }, "Order created"));
});

// @route POST /api/v1/payments/verify   body: { paymentId, providerOrderId, providerPaymentId, signature }
const verifyPayment = asyncHandler(async (req, res) => {
  const { paymentId, providerOrderId, providerPaymentId, signature } = req.body;

  const payment = await Payment.findById(paymentId);
  if (!payment) throw new ApiError(404, "Payment record not found");

  const isValid = paymentService.verifyPayment({
    orderId: providerOrderId,
    paymentId: providerPaymentId,
    signature,
  });

  if (!isValid) {
    payment.status = PAYMENT_STATUS.FAILED;
    await payment.save();
    throw new ApiError(400, "Payment verification failed");
  }

  payment.status = PAYMENT_STATUS.SUCCESS;
  payment.providerPaymentId = providerPaymentId || "";
  await payment.save();

  res.status(200).json(new ApiResponse(200, payment, "Payment verified successfully"));
});

// @route GET /api/v1/payments/mine
const getMyPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ student: req.user._id }).populate("course", "title thumbnail").sort("-createdAt");
  res.status(200).json(new ApiResponse(200, payments, "Your payments fetched"));
});

module.exports = { createOrder, verifyPayment, getMyPayments };
