import config from "../utils/config.js";
import ErrorHandler from "../middleware/error.js";
import { logger } from "../utils/logger.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import jwt from "jsonwebtoken";


console.log("Using Razorpay Key ID:", config.RAZORPAY_KEY_ID ? "[loaded]" : "[missing]");
console.log("Using Razorpay Secret Key:", config.RAZORPAY_SECRET_KEY ? "[loaded]" : "[missing]");


const instance = new Razorpay({
  key_id: "rzp_test_RBfBrjKn6LO023",
  key_secret: "FrMfQPgnniykRetiRXMKcJnI",
});


export const createOrder = async (userId, bookingId, fare) => {
  try {
    // you can add any additional notes you want to pass with the order by fetching from db using userId or bookingId

    const notes = {
      isTest: process.env.NODE_ENV === "development" ? false : true,
      userId: userId.toString(),
      bookingId: bookingId.toString(),
    };

    const options = {
      amount: Math.round(Number(fare)), // convert to paise
      currency: "INR",
      receipt: `test_${Date.now().toString()}`,
      notes: {
        ...notes,
      },
    };
    // Create the order
    const order = await instance.orders.create(options);
    if (!order) {
      throw new ErrorHandler("Order creation failed", 500);
    }

    return order;
  } catch (error) {
    logger.error("Payment processing failed:", error);
    throw new ErrorHandler(
      error.error?.description || "Payment processing failed",
      error.statusCode || 500
    );
  }
};

export const verifyPayment = async (
  razorpay_payment_id,
  razorpay_order_id,
  razorpay_signature,
  userId
) => {
  try {
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", config.RAZORPAY_SECRET_KEY)
      .update(body.toString())
      .digest("hex");

    const isSignatureValid = expectedSignature === razorpay_signature;
    if (!isSignatureValid) {
      throw new ErrorHandler("Invalid payment signature", 400);
    }

    // send a success response to frontend via JWT redirect
    const paymentToken = jwt.sign(
      { razorpay_payment_id, razorpay_order_id, userId },
      config.JWT_SECRET_KEY,
      { expiresIn: "5m" } // short-lived
    );

    return paymentToken;
  } catch (error) {
    logger.error("Payment verification failed:", error);
    throw new ErrorHandler(
      error.error?.description || "Payment verification failed",
      error.statusCode || 500
    );
  }
};
