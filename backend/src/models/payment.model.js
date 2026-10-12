const mongoose = require("mongoose");
const { PAYMENT_STATUS } = require("../constants");

const paymentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },

    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },

    provider: { type: String, default: "razorpay" }, // razorpay | stripe | mock
    providerOrderId: { type: String, default: "" },
    providerPaymentId: { type: String, default: "" },

    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.PENDING },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
