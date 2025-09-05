import express from "express";
import { isAuthenticated } from "../middleware/auth.js";
import {
  bookRideForHourlyRental,
  bookRideForOutstation,
  getChargesForHourlyRental,
  getChargesForOutstation,
  verifyPaymentToken,
  verifyRidePayment,
  getUserBookings,
  getBookingById,
  cancelBookingById,
} from "../controllers/bookingController.js";

const bookingRouter = express.Router();

bookingRouter.post(
  "/charges/hourly-rental",
  isAuthenticated,
  getChargesForHourlyRental
);
bookingRouter.post(
  "/charges/outstation",
  isAuthenticated,
  getChargesForOutstation
);
bookingRouter.post(
  "/order/hourly-rental",
  isAuthenticated,
  bookRideForHourlyRental
);
bookingRouter.post("/order/outstation", isAuthenticated, bookRideForOutstation);
bookingRouter.post(
  "/verify-payment/:bookingId",
  isAuthenticated,
  verifyRidePayment
);
bookingRouter.post(
  "/verify-payment-token",
  isAuthenticated,
  verifyPaymentToken
);

// User booking management routes
bookingRouter.get("/", isAuthenticated, getUserBookings);
bookingRouter.get("/:bookingId", isAuthenticated, getBookingById);
bookingRouter.put("/cancel/:bookingId", isAuthenticated, cancelBookingById);

export default bookingRouter;
