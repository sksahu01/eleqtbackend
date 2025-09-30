import { catchAsyncError } from "../middleware/catchAsyncError.js";
import nodemailer from "nodemailer";
import ErrorHandler from "../middleware/error.js";
import {
  CalculateFareHourly,
  CalculateFareOutstation,
  calculateHaversine,
  getCarType,
} from "../utils/booking.js";
import { validateLocation, validateAddOns } from "../utils/validation.js";
import { HourlyBooking, OutstationBooking ,LuxuryBooking } from "../models/bookingModel.js";
import { createOrder, verifyPayment } from "../services/payment.js";
import config from "../utils/config.js";
import { logger } from "../utils/logger.js";
import { encryptOptions } from "../utils/encryption.js";
import jwt from "jsonwebtoken";

import crypto from "crypto";
import { Car } from "../models/cars.js";
import {LuxuryCar} from "../models/luxurycars.js";
import Razorpay from "razorpay";

// 🔑 Directly use your Razorpay keys
const razorpay = new Razorpay({
  key_id: "rzp_test_RIOlnYq6PptoUd",
  key_secret: "eBpBYbQIAGNBimqT2p6Vvy3J",
});
// Common validation function
const validateCommonFields = (req, next) => {
  const {
    pickUp,
    dropOff,
    stops = [],
    passengerCount,
    luggageCount,
    startTime,
    addOns,
  } = req.body;

  // Validate required fields
  if (
    passengerCount === null ||
    passengerCount === undefined ||
    luggageCount === null ||
    luggageCount === undefined
  ) {
    return next(
      new ErrorHandler("Passenger and luggage counts are required", 400)
    );
  }

  // Validate required addresses
  if (!pickUp?.address || pickUp.address.trim() === "") {
    return next(new ErrorHandler("Pickup address is required", 400));
  }

  if (!dropOff?.address || dropOff.address.trim() === "") {
    return next(new ErrorHandler("Dropoff address is required", 400));
  }

  // Validate startTime
  if (!startTime || isNaN(new Date(startTime).getTime())) {
    return next(new ErrorHandler("Valid start time is required", 400));
  }

  const now = new Date();
  const minStartTime = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  if (new Date(startTime) < minStartTime) {
    return next(
      new ErrorHandler("startTime must be at least 48 hours in the future", 400)
    );
  }

  // Validate stops array
  if (!Array.isArray(stops)) {
    return next(new ErrorHandler("Stops must be an array", 400));
  }

  if (stops.length > 5) {
    return next(new ErrorHandler("Maximum 5 stops allowed", 400));
  }

  // Validate addOns structure
  if (addOns && typeof addOns !== "object") {
    return next(new ErrorHandler("AddOns must be an object", 400));
  }

  // Validate location objects
  const pickUpError = validateLocation(pickUp?.location, "Pickup");
  if (pickUpError) return next(new ErrorHandler(pickUpError, 400));

  const dropOffError = validateLocation(dropOff?.location, "Dropoff");
  if (dropOffError) return next(new ErrorHandler(dropOffError, 400));

  // Validate all stops
  for (let i = 0; i < stops.length; i++) {
    const stopError = validateLocation(stops[i]?.location, `Stop ${i + 1}`);
    if (stopError) {
      return next(new ErrorHandler(stopError, 400));
    }
  }

  // Validate passenger and luggage counts
  if (passengerCount <= 0 || passengerCount > 5) {
    return next(
      new ErrorHandler("Passenger count must be between 1 and 5", 400)
    );
  }

  if (luggageCount < 0 || luggageCount > 4) {
    return next(new ErrorHandler("Luggage count must be between 0 and 4", 400));
  }

  // Get suitable car type
  const carType = getCarType(passengerCount, luggageCount);
  if (!carType) {
    return next(
      new ErrorHandler(
        `No vehicle available for ${passengerCount} passengers and ${luggageCount} luggage items`,
        400
      )
    );
  }

  // console.log("Car type determined:", carType);

  // Validate addOns using utility function
  const addOnsError = validateAddOns(addOns);
  if (addOnsError) {
    return next(new ErrorHandler(addOnsError, 400));
  }

  return {
    pickUp,
    dropOff,
    stops,
    passengerCount,
    luggageCount,
    startTime,
    addOns,
    carType,
  };
};

// Hourly Rental Controller
export const getChargesForHourlyRental = catchAsyncError(
  async (req, res, next) => {
    try {
      // Common validation
      const validationResult = validateCommonFields(req, next);
      if (!validationResult) return; // Error already handled by validateCommonFields

      const { stops, addOns, carType } = validationResult;
      const { hours } = req.body;

      // Hourly-specific validation
      if (hours === null || hours === undefined) {
        return next(
          new ErrorHandler("Hours are required for hourly rental", 400)
        );
      }

      if (typeof hours !== "number" || hours < 1 || hours > 12) {
        return next(
          new ErrorHandler("Hours must be a number between 1 and 12", 400)
        );
      }

      // Calculate fare
      const fare = CalculateFareHourly(hours, carType, addOns);

      return res.status(200).json({
        success: true,
        message: "Charges for hourly rental service calculated successfully",
        data: {
          fare,
          fareInRupees: (fare / 100).toFixed(2),
          carType,
          serviceType: "hourly-rental",
          stopsCount: stops.length,
          duration: hours,
        },
        meta: {
          currency: "INR",
          amountUnit: "paise (₹1 = 100 paise)",
        },
      });
    } catch (error) {
      return next(
        new ErrorHandler(
          "Error calculating hourly rental charges: " + error.message,
          500
        )
      );
    }
  }
);

export const bookRideForHourlyRental = catchAsyncError(
  async (req, res, next) => {
    try {
      // Common validation
      const validationResult = validateCommonFields(req, next);
      if (!validationResult) return; // Error already handled by validateCommonFields

      const {
        pickUp,
        dropOff,
        stops,
        passengerCount,
        luggageCount,
        startTime,
        addOns,
        carType,
      } = validationResult;
      const { hours } = req.body;

      // Hourly-specific validation
      if (hours === null || hours === undefined) {
        return next(
          new ErrorHandler("Hours are required for hourly rental", 400)
        );
      }

      if (typeof hours !== "number" || hours < 1 || hours > 12) {
        return next(
          new ErrorHandler("Hours must be a number between 1 and 12", 400)
        );
      }

      // Calculate fare
      const fare = CalculateFareHourly(hours, carType, addOns);
      // const { guestCount } = req.body;
      const userId = req.user.id;

      // Validate userId (should come from auth middleware in production)
      if (!userId) {
        return next(new ErrorHandler("User ID is required", 400));
      }

      // Validate guestCount
      // if (guestCount === null || guestCount === undefined || guestCount < 0) {
      //   return next(
      //     new ErrorHandler(
      //       "Guest count is required and must be non-negative",
      //       400
      //     )
      //   );
      // }

      // Validate Razorpay configuration
      if (!config.RAZORPAY_KEY_ID) {
        return next(
          new ErrorHandler("Payment gateway configuration error", 500)
        );
      }

      // Prepare booking data for database
      const bookingData = {
        userId,
        rideType: "hourly",
        carType,
        passengerCount,
        luggageCount,
        pickUp: {
          address: pickUp.address,
          location: pickUp.location,
        },
        dropOff: {
          address: dropOff.address,
          location: dropOff.location,
        },
        stops: stops.map((stop) => ({
          address: stop.address || "",
          location: stop.location,
        })),
        // guestCount,
        addOns: {
          airportToll: addOns?.airportToll || false,
          placard: {
            required: addOns?.placard?.required || false,
            text: addOns?.placard?.text || "",
          },
          pets: {
            dogs: addOns?.pets?.dogs || false,
            cats: addOns?.pets?.cats || false,
          },
          bookForOther: {
            isBooking: addOns?.bookForOther?.isBooking || false,
            otherGuestInfo: addOns?.bookForOther?.otherGuestInfo || "",
          },
          childSeat: addOns?.childSeat || false,
        },
        payment: {
          paymentMethod: "razorpay",
          amount: fare,
          paymentStatus: "pending",
        },
        startTime: new Date(startTime),
        durationHrs: hours,
      };

      // Create booking in database first
      const booking = new HourlyBooking(bookingData);
      await booking.save();

      let order;
      try {
        // Create Razorpay order
        order = await createOrder(userId, booking._id, fare);

        // Update booking with order details (only update specific fields)
        booking.payment.orderId = order.id;
        booking.payment.receipt = order.receipt;
        booking.payment.amount = order.amount;

        // Save updated booking
        await booking.save();
      } catch (orderError) {
        // Rollback: Delete the booking if order creation fails
        await HourlyBooking.findByIdAndDelete(booking._id);
        return next(
          new ErrorHandler(
            "Failed to create payment order: " + orderError.message,
            500
          )
        );
      }

      // Prepare payment options for frontend
      const paymentOptions = {
        key: config.RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Eleqt Rides",
        description: `Hourly Rental Booking - ${hours} hours`,
        order_id: order.id,
        callback_url: `${
          config.BACKEND_URL
        }/api/v1/bookings/verify-payment/${booking._id.toString()}`,

        // Prefill user details
        prefill: {
          userId: userId.toString(),
          bookingId: booking._id.toString(),
        },
        notes: {
          bookingType: "hourly-rental",
          duration: `${hours} hours`,
          carType: carType,
        },
        theme: {
          color: "#eded42ff",
        },
      };

      const encrypted = await encryptOptions(paymentOptions);

      return res.status(201).json({
        success: true,
        message: "Hourly rental booking created successfully",
        data: {
          bookingId: booking.id,
          fare,
          fareInRupees: (fare / 100).toFixed(2),
          carType,
          serviceType: "hourly-rental",
          stopsCount: stops.length,
          duration: hours,
          status: booking.status,
          createdAt: booking.createdAt,
        },
        options: encrypted, // Razorpay payment options encrypted
        meta: {
          currency: "INR",
          amountUnit: "paise (₹1 = 100 paise)",
        },
      });
    } catch (error) {
      return next(
        new ErrorHandler(
          "Error creating hourly rental booking: " + error.message,
          500
        )
      );
    }
  }
);


export const getChargesForOutstation = catchAsyncError(
  async (req, res, next) => {
    try {
      const {
        pickup,
        dropOff,
        stops,
        passengerCount,
        luggageCount,
        carType,
        startTime,
        addOns,
        returnTime,
        isRoundTrip = false,
      } = req.body;

      
      if (!pickup || typeof pickup !== "object") {
        return next(new ErrorHandler("Pickup information is required", 400));
      }
      if (!pickup.address || pickup.address.trim() === "") {
        return next(new ErrorHandler("Pickup address is required", 400));
      }
      if (
        !pickup.location ||
        !pickup.location.coordinates ||
        !Array.isArray(pickup.location.coordinates) ||
        pickup.location.coordinates.length !== 2
      ) {
        return next(new ErrorHandler("Valid pickup location coordinates are required", 400));
      }

      if (!dropOff || typeof dropOff !== "object") {
        return next(new ErrorHandler("Drop-off information is required", 400));
      }
      if (!dropOff.address || dropOff.address.trim() === "") {
        return next(new ErrorHandler("Drop-off address is required", 400));
      }
      if (
        !dropOff.location ||
        !dropOff.location.coordinates ||
        !Array.isArray(dropOff.location.coordinates) ||
        dropOff.location.coordinates.length !== 2
      ) {
        return next(new ErrorHandler("Valid drop-off location coordinates are required", 400));
      }

      if (!Number.isInteger(passengerCount) || passengerCount <= 0) {
        return next(new ErrorHandler("Passenger count is required and must be a positive integer", 400));
      }
      if (!Number.isInteger(luggageCount) || luggageCount < 0) {
        return next(new ErrorHandler("Luggage count is required and must be zero or more", 400));
      }

      if (!carType || typeof carType !== "string") {
        return next(new ErrorHandler("Car type is required", 400));
      }

      if (!startTime || isNaN(new Date(startTime).getTime())) {
        return next(new ErrorHandler("Valid start time is required", 400));
      }

      if (!stops || !Array.isArray(stops)) {
        return next(new ErrorHandler("Stops must be an array", 400));
      }

      if (!addOns || typeof addOns !== "object") {
        return next(new ErrorHandler("Add-ons information is required", 400));
      }

      const pickupCoords = pickup.location.coordinates;
      const dropOffCoords = dropOff.location.coordinates;

      const [pickupLon, pickupLat] = pickupCoords;
      const [dropOffLon, dropOffLat] = dropOffCoords;

      const toRad = (val) => (val * Math.PI) / 180;
      const R = 6371; 

      const dLat = toRad(dropOffLat - pickupLat);
      const dLon = toRad(dropOffLon - pickupLon);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(pickupLat)) *
          Math.cos(toRad(dropOffLat)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const totalDistance = R * c;

      if (totalDistance <= 0) {
        return next(new ErrorHandler("Calculated distance must be greater than 0 km", 400));
      }

      const MAX_DISTANCE_KM = 350;
      if (totalDistance > MAX_DISTANCE_KM) {
        return next(
          new ErrorHandler(
            `Outstation trips cannot exceed ${MAX_DISTANCE_KM} km. Your trip is ${totalDistance.toFixed(2)} km.`,
            400
          )
        );
      }

      if (isRoundTrip) {
        if (!returnTime) {
          return next(new ErrorHandler("Return time is required for round trips", 400));
        }
        if (isNaN(new Date(returnTime).getTime())) {
          return next(new ErrorHandler("Valid return time is required for round trips", 400));
        }
        if (new Date(returnTime) <= new Date(startTime)) {
          return next(new ErrorHandler("Return time must be after start time", 400));
        }
      }

      const fare = CalculateFareOutstation(
        totalDistance,
        carType,
        isRoundTrip,
        startTime,
        returnTime,
        addOns
      );

      return res.status(200).json({
        success: true,
        message: "Charges for outstation service calculated successfully",
        data: {
          fare,
          fareInRupees: (fare / 100).toFixed(2),
          carType,
          serviceType: "outstation",
          stopsCount: stops.length,
          distance: totalDistance.toFixed(2),
          isRoundTrip,
        },
        meta: {
          currency: "INR",
          amountUnit: "paise (₹1 = 100 paise)",
        },
      });
    } catch (error) {
      return next(
        new ErrorHandler("Error calculating outstation charges: " + error.message, 500)
      );
    }
  }
);










// export const bookRideForOutstation = catchAsyncError(async (req, res, next) => {
//   try {
//     const {
//       pickup,
//       dropOff,
//       stops = [],
//       passengerCount,
//       luggageCount,
//       startTime,
//       addOns = {},
//       carType,
//       returnTime,
//       isRoundTrip = false,
//     } = req.body;

//     // ---------------- VALIDATIONS ----------------
//     if (
//       !pickup ||
//       typeof pickup.address !== "string" ||
//       !pickup.location ||
//       !Array.isArray(pickup.location.coordinates) ||
//       pickup.location.coordinates.length !== 2
//     )
//       return next(new ErrorHandler("Pickup address and valid coordinates are required", 400));

//     if (
//       !dropOff ||
//       typeof dropOff.address !== "string" ||
//       !dropOff.location ||
//       !Array.isArray(dropOff.location.coordinates) ||
//       dropOff.location.coordinates.length !== 2
//     )
//       return next(new ErrorHandler("Drop-off address and valid coordinates are required", 400));

//     if (typeof passengerCount !== "number" || passengerCount <= 0)
//       return next(new ErrorHandler("Valid passengerCount is required", 400));

//     if (typeof luggageCount !== "number" || luggageCount < 0)
//       return next(new ErrorHandler("Valid luggageCount is required", 400));

//     if (!startTime || isNaN(new Date(startTime).getTime()))
//       return next(new ErrorHandler("Valid startTime is required", 400));

//     if (!carType || typeof carType !== "string")
//       return next(new ErrorHandler("carType is required", 400));

//     if (isRoundTrip) {
//       if (!returnTime) return next(new ErrorHandler("Return time is required for round trips", 400));
//       if (isNaN(new Date(returnTime).getTime()))
//         return next(new ErrorHandler("Valid return time is required for round trips", 400));
//       if (new Date(returnTime) <= new Date(startTime))
//         return next(new ErrorHandler("Return time must be after start time", 400));
//     }

//     // ---------------- DISTANCE CALCULATION ----------------
//     const [pickupLon, pickupLat] = pickup.location.coordinates;
//     const [dropOffLon, dropOffLat] = dropOff.location.coordinates;

//     const toRad = (val) => (val * Math.PI) / 180;
//     const R = 6371; // Earth radius km
//     const dLat = toRad(dropOffLat - pickupLat);
//     const dLon = toRad(dropOffLon - pickupLon);

//     const a =
//       Math.sin(dLat / 2) ** 2 +
//       Math.cos(toRad(pickupLat)) * Math.cos(toRad(dropOffLat)) * Math.sin(dLon / 2) ** 2;
//     const totalDistance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//     if (totalDistance <= 0)
//       return next(new ErrorHandler("Calculated distance must be greater than 0 km", 400));

//     const MAX_DISTANCE_KM = 350;
//     if (totalDistance > MAX_DISTANCE_KM)
//       return next(
//         new ErrorHandler(
//           `Outstation trips cannot exceed ${MAX_DISTANCE_KM} km. Your trip is ${totalDistance.toFixed(
//             2
//           )} km.`,
//           400
//         )
//       );

//     // ---------------- FARE CALCULATION ----------------
//     const fare = CalculateFareOutstation(totalDistance, carType, isRoundTrip, startTime, returnTime, addOns);

//     const userId = req.user?.id;
//     if (!userId) return next(new ErrorHandler("User ID is required", 400));

//     if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_SECRET_KEY)
//       return next(new ErrorHandler("Payment gateway configuration error", 500));

//     // ---------------- CAR & DRIVER ALLOCATION ----------------
//     const allocatedCar = await Car.findOneAndUpdate(
//       { carType, isAvailable: true },
//       { isAvailable: false },
//       { new: true }
//     );

//     if (!allocatedCar)
//       return next(new ErrorHandler(`No available ${carType} cars at the moment`, 400));

//     // ---------------- BOOKING CREATION ----------------
//     const bookingData = {
//       userId,
//       rideType: "outstation",
//       carType,
//       passengerCount,
//       luggageCount,
//       allocatedCar: allocatedCar._id,
//       driver: allocatedCar.driverId || null, // Save driver reference if available
//       pickUp: {
//         address: pickup.address,
//         location: pickup.location,
//       },
//       dropOff: {
//         address: dropOff.address,
//         location: dropOff.location,
//       },
//       stops: stops.map((stop) => ({
//         address: stop.address || "",
//         location: stop.location,
//       })),
//       addOns,
//       payment: {
//         paymentMethod: "razorpay",
//         amount: fare,
//         paymentStatus: "pending",
//       },
//       startTime: new Date(startTime),
//       isRoundTrip,
//       returnTime: isRoundTrip ? new Date(returnTime) : undefined,
//       totalDistance: totalDistance.toFixed(2),
//     };

//     const booking = new OutstationBooking(bookingData);
//     await booking.save();

//     // ---------------- PAYMENT ORDER ----------------
//     let order;
//     try {
//       order = await createOrder(userId, booking._id, fare);
//       booking.payment.orderId = order.id;
//       booking.payment.receipt = order.receipt;
//       booking.payment.amount = order.amount;
//       await booking.save();
//     } catch (orderError) {
//       logger.error("Order creation error:", orderError);
//       await OutstationBooking.findByIdAndDelete(booking._id);
//       await Car.findByIdAndUpdate(allocatedCar._id, { isAvailable: true });
//       return next(new ErrorHandler("Failed to create payment order", 500));
//     }

//     // ---------------- EMAIL NOTIFICATION ----------------
//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: { user: "eleqtmobility@gmail.com", pass: "htza ihnh gjko wlzn" },
//     });

//     const mailOptions = {
//       from: `"Eleqt Mobility" <eleqtmobility@gmail.com>`,
//       to: `${req.user.email}, eleqtmobility@gmail.com`,
//       subject: "Outstation Ride Booking Confirmation",
//       html: `
//         <h2>Booking Confirmed ✅</h2>
//         <p>Dear ${req.user.name}, your outstation booking is confirmed.</p>
//         <p><strong>Booking ID:</strong> ${booking._id}</p>
//         <p><strong>Car Allocated:</strong> ${allocatedCar.carModel || allocatedCar.model} (${allocatedCar.carType})</p>
//         <p><strong>Regd. Number:</strong> ${allocatedCar.carNumber || "N/A"}</p>
//         <p><strong>Driver Name:</strong> ${allocatedCar.driverName || "N/A"}</p>
//         <p><strong>Driver Number:</strong> ${allocatedCar.driverNumber || "N/A"}</p>
//         <p><strong>Pickup:</strong> ${pickup.address}</p>
//         <p><strong>Drop-off:</strong> ${dropOff.address}</p>
//         <p><strong>Start Time:</strong> ${new Date(startTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
//         ${
//           isRoundTrip
//             ? `<p><strong>Return Time:</strong> ${new Date(returnTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>`
//             : ""
//         }
//         <p><strong>Total Distance:</strong> ${totalDistance.toFixed(2)} km</p>
//         <p><strong>Fare:</strong> ₹ ${(fare / 100).toFixed(2)}</p>
//         <br/>
//         <p>Thank you for choosing Eleqt Mobility 🚖</p>
//       `,
//     };

//     await transporter.sendMail(mailOptions);

//     // ---------------- AUTO MAKE CAR AVAILABLE AGAIN ----------------
//     const releaseTime = isRoundTrip ? new Date(returnTime) : new Date(startTime);
//     const delay = releaseTime.getTime() - Date.now();
//     if (delay > 0) {
//       setTimeout(async () => {
//         await Car.findByIdAndUpdate(allocatedCar._id, { isAvailable: true });
//         logger.info(`Car ${allocatedCar._id} marked available again`);
//       }, delay);
//     }

//     // ---------------- RESPONSE ----------------
//     const paymentOptions = {
//       key: config.RAZORPAY_KEY_ID,
//       amount: order.amount,
//       currency: order.currency,
//       name: "Eleqt Rides",
//       description: `Outstation Booking - ${totalDistance.toFixed(2)}km ${
//         isRoundTrip ? "(Round Trip)" : "(One Way)"
//       }`,
//       order_id: order.id,
//       callback_url: `${config.BACKEND_URL}/api/v1/bookings/verify-payment/${booking._id}`,
//       prefill: { userId: userId.toString(), bookingId: booking._id.toString() },
//       notes: {
//         bookingType: "outstation",
//         distance: `${totalDistance.toFixed(2)}km`,
//         tripType: isRoundTrip ? "round-trip" : "one-way",
//         carType,
//       },
//       theme: { color: "#eded42ff" },
//     };

//     const encrypted = await encryptOptions(paymentOptions);

//     return res.status(201).json({
//       success: true,
//       message: "Outstation booking created successfully",
//       data: {
//         bookingId: booking.id,
//         fare,
//         fareInRupees: (fare / 100).toFixed(2),
//         carType,
//         allocatedCar: allocatedCar.model,
//         serviceType: "outstation",
//         stopsCount: stops.length,
//         distance: totalDistance.toFixed(2),
//         isRoundTrip,
//         status: booking.status,
//         createdAt: booking.createdAt,
//       },
//       options: encrypted,
//       meta: { currency: "INR", amountUnit: "paise (₹1 = 100 paise)" },
//     });
//   } catch (error) {
//     logger.error("Error booking outstation ride:", error);
//     return next(new ErrorHandler("Error booking outstation ride: " + error.message, 500));
//   }
// });






// export const bookRideForOutstation = catchAsyncError(async (req, res, next) => {
//   try {
//     const {
//       pickup,
//       dropOff,
//       stops = [],
//       passengerCount,
//       luggageCount,
//       startTime,
//       addOns = {},
//       carType,
//       returnTime,
//       isRoundTrip = false,
//     } = req.body;

//     // ---------------- VALIDATIONS ----------------
//     if (
//       !pickup ||
//       typeof pickup.address !== "string" ||
//       !pickup.location ||
//       !Array.isArray(pickup.location.coordinates) ||
//       pickup.location.coordinates.length !== 2
//     )
//       return next(new ErrorHandler("Pickup address and valid coordinates are required", 400));

//     if (
//       !dropOff ||
//       typeof dropOff.address !== "string" ||
//       !dropOff.location ||
//       !Array.isArray(dropOff.location.coordinates) ||
//       dropOff.location.coordinates.length !== 2
//     )
//       return next(new ErrorHandler("Drop-off address and valid coordinates are required", 400));

//     if (typeof passengerCount !== "number" || passengerCount <= 0)
//       return next(new ErrorHandler("Valid passengerCount is required", 400));

//     if (typeof luggageCount !== "number" || luggageCount < 0)
//       return next(new ErrorHandler("Valid luggageCount is required", 400));

//     if (!startTime || isNaN(new Date(startTime).getTime()))
//       return next(new ErrorHandler("Valid startTime is required", 400));

//     if (!carType || typeof carType !== "string")
//       return next(new ErrorHandler("carType is required", 400));

//     if (isRoundTrip) {
//       if (!returnTime) return next(new ErrorHandler("Return time is required for round trips", 400));
//       if (isNaN(new Date(returnTime).getTime()))
//         return next(new ErrorHandler("Valid return time is required for round trips", 400));
//       if (new Date(returnTime) <= new Date(startTime))
//         return next(new ErrorHandler("Return time must be after start time", 400));
//     }

//     // ---------------- DISTANCE CALCULATION ----------------
//     const [pickupLon, pickupLat] = pickup.location.coordinates;
//     const [dropOffLon, dropOffLat] = dropOff.location.coordinates;

//     const toRad = (val) => (val * Math.PI) / 180;
//     const R = 6371; // Earth radius km
//     const dLat = toRad(dropOffLat - pickupLat);
//     const dLon = toRad(dropOffLon - pickupLon);

//     const a =
//       Math.sin(dLat / 2) ** 2 +
//       Math.cos(toRad(pickupLat)) * Math.cos(toRad(dropOffLat)) * Math.sin(dLon / 2) ** 2;
//     const totalDistance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//     if (totalDistance <= 0)
//       return next(new ErrorHandler("Calculated distance must be greater than 0 km", 400));

//     const MAX_DISTANCE_KM = 350;
//     if (totalDistance > MAX_DISTANCE_KM)
//       return next(
//         new ErrorHandler(
//           `Outstation trips cannot exceed ${MAX_DISTANCE_KM} km. Your trip is ${totalDistance.toFixed(
//             2
//           )} km.`,
//           400
//         )
//       );

//     // ---------------- FARE CALCULATION ----------------
//     const fare = CalculateFareOutstation(totalDistance, carType, isRoundTrip, startTime, returnTime, addOns);

//     const userId = req.user?.id;
//     if (!userId) return next(new ErrorHandler("User ID is required", 400));

//     if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_SECRET_KEY)
//       return next(new ErrorHandler("Payment gateway configuration error", 500));

//     // ---------------- CAR & DRIVER ALLOCATION ----------------
//     const allocatedCar = await Car.findOneAndUpdate(
//       { carType, isAvailable: true },
//       { isAvailable: false },
//       { new: true }
//     );

//     if (!allocatedCar)
//       return next(new ErrorHandler(`No available ${carType} cars at the moment`, 400));

//     // ---------------- BOOKING CREATION ----------------
//     const bookingData = {
//       userId,
//       rideType: "outstation",
//       carType,
//       passengerCount,
//       luggageCount,
//       allocatedCar: allocatedCar._id,
//       driver: allocatedCar.driverId || null, // Save driver reference
//       driverName: allocatedCar.driverName || null, // Save driver name
//       driverNumber: allocatedCar.driverNumber || null,
//       carNo:allocatedCar.carNumber || null, // Save car number
//       carModel:allocatedCar.carModel || null,// Save car model
//       pickUp: {
//         address: pickup.address,
//         location: pickup.location,
//       },
//       dropOff: {
//         address: dropOff.address,
//         location: dropOff.location,
//       },
//       stops: stops.map((stop) => ({
//         address: stop.address || "",
//         location: stop.location,
//       })),
//       addOns,
//       payment: {
//         paymentMethod: "razorpay",
//         amount: fare,
//         paymentStatus: "pending",
//       },
//       startTime: new Date(startTime),
//       isRoundTrip,
//       returnTime: isRoundTrip ? new Date(returnTime) : undefined,
//       totalDistance: totalDistance.toFixed(2),
//     };

//     const booking = new OutstationBooking(bookingData);
//     await booking.save();

//     // ---------------- PAYMENT ORDER ----------------
//     let order;
//     try {
//       order = await createOrder(userId, booking._id, fare);
//       booking.payment.orderId = order.id;
//       booking.payment.receipt = order.receipt;
//       booking.payment.amount = order.amount;
//       await booking.save();
//     } catch (orderError) {
//       logger.error("Order creation error:", orderError);
//       await OutstationBooking.findByIdAndDelete(booking._id);
//       await Car.findByIdAndUpdate(allocatedCar._id, { isAvailable: true });
//       return next(new ErrorHandler("Failed to create payment order", 500));
//     }

//     // ---------------- EMAIL NOTIFICATION ----------------
//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: { user: "eleqtmobility@gmail.com", pass: "htza ihnh gjko wlzn" },
//     });

//     const mailOptions = {
//       from: `"Eleqt Mobility" <eleqtmobility@gmail.com>`,
//       to: `${req.user.email}, eleqtmobility@gmail.com`,
//       subject: "Outstation Ride Booking Confirmation",
//       html: `
//         <h2>Booking Confirmed ✅</h2>
//         <p>Dear ${req.user.name}, your outstation booking is confirmed.</p>
//         <p><strong>Booking ID:</strong> ${booking._id}</p>
//         <p><strong>Car Allocated:</strong> ${allocatedCar.carModel || allocatedCar.model} (${allocatedCar.carType})</p>
//         <p><strong>Regd. Number:</strong> ${allocatedCar.carNumber || "N/A"}</p>
//         <p><strong>Driver Name:</strong> ${booking.driverName || "N/A"}</p>
//         <p><strong>Driver Number:</strong> ${booking.driverNumber || "N/A"}</p>
//         <p><strong>Pickup:</strong> ${pickup.address}</p>
//         <p><strong>Drop-off:</strong> ${dropOff.address}</p>
//         <p><strong>Start Time:</strong> ${new Date(startTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
//         ${
//           isRoundTrip
//             ? `<p><strong>Return Time:</strong> ${new Date(returnTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>`
//             : ""
//         }
//         <p><strong>Total Distance:</strong> ${totalDistance.toFixed(2)} km</p>
//         <p><strong>Fare:</strong> ₹ ${(fare / 100).toFixed(2)}</p>
//         <br/>
//         <p>Thank you for choosing Eleqt Mobility 🚖</p>
//       `,
//     };

//     await transporter.sendMail(mailOptions);

//     // ---------------- AUTO MAKE CAR AVAILABLE AGAIN ----------------
//     const releaseTime = isRoundTrip ? new Date(returnTime) : new Date(startTime);
//     const delay = releaseTime.getTime() - Date.now();
//     if (delay > 0) {
//       setTimeout(async () => {
//         await Car.findByIdAndUpdate(allocatedCar._id, { isAvailable: true });
//         logger.info(`Car ${allocatedCar._id} marked available again`);
//       }, delay);
//     }

//     // ---------------- RESPONSE ----------------
//     const paymentOptions = {
//       key: config.RAZORPAY_KEY_ID,
//       amount: order.amount,
//       currency: order.currency,
//       name: "Eleqt Rides",
//       description: `Outstation Booking - ${totalDistance.toFixed(2)}km ${
//         isRoundTrip ? "(Round Trip)" : "(One Way)"
//       }`,
//       order_id: order.id,
//       callback_url: `${config.BACKEND_URL}/api/v1/bookings/verify-payment/${booking._id}`,
//       prefill: { userId: userId.toString(), bookingId: booking._id.toString() },
//       notes: {
//         bookingType: "outstation",
//         distance: `${totalDistance.toFixed(2)}km`,
//         tripType: isRoundTrip ? "round-trip" : "one-way",
//         carType,
//       },
//       theme: { color: "#eded42ff" },
//     };

//     const encrypted = await encryptOptions(paymentOptions);

//     return res.status(201).json({
//       success: true,
//       message: "Outstation booking created successfully",
//       data: {
//         bookingId: booking.id,
//         fare,
//         fareInRupees: (fare / 100).toFixed(2),
//         carType,
//         allocatedCar: allocatedCar.model,
//         driverName: booking.driverName,
//         driverNumber: booking.driverNumber,
//         serviceType: "outstation",
//         stopsCount: stops.length,
//         distance: totalDistance.toFixed(2),
//         isRoundTrip,
//         status: booking.status,
//         createdAt: booking.createdAt,
//       },
//       options: encrypted,
//       meta: { currency: "INR", amountUnit: "paise (₹1 = 100 paise)" },
//     });
//   } catch (error) {
//     logger.error("Error booking outstation ride:", error);
//     return next(new ErrorHandler("Error booking outstation ride: " + error.message, 500));
//   }
// });







export const bookRideForOutstation = catchAsyncError(async (req, res, next) => {
  try {
    const {
      pickup,
      dropOff,
      stops = [],
      passengerCount,
      luggageCount,
      startTime,
      addOns = {},
      carType,
      returnTime,
      isRoundTrip = false,
    } = req.body;

    // ---------------- VALIDATIONS ----------------
    if (
      !pickup ||
      typeof pickup.address !== "string" ||
      !pickup.location ||
      !Array.isArray(pickup.location.coordinates) ||
      pickup.location.coordinates.length !== 2
    )
      return next(new ErrorHandler("Pickup address and valid coordinates are required", 400));

    if (
      !dropOff ||
      typeof dropOff.address !== "string" ||
      !dropOff.location ||
      !Array.isArray(dropOff.location.coordinates) ||
      dropOff.location.coordinates.length !== 2
    )
      return next(new ErrorHandler("Drop-off address and valid coordinates are required", 400));

    if (typeof passengerCount !== "number" || passengerCount <= 0)
      return next(new ErrorHandler("Valid passengerCount is required", 400));

    if (typeof luggageCount !== "number" || luggageCount < 0)
      return next(new ErrorHandler("Valid luggageCount is required", 400));

    if (!startTime || isNaN(new Date(startTime).getTime()))
      return next(new ErrorHandler("Valid startTime is required", 400));

    if (!carType || typeof carType !== "string")
      return next(new ErrorHandler("carType is required", 400));

    if (isRoundTrip) {
      if (!returnTime) return next(new ErrorHandler("Return time is required for round trips", 400));
      if (isNaN(new Date(returnTime).getTime()))
        return next(new ErrorHandler("Valid return time is required for round trips", 400));
      if (new Date(returnTime) <= new Date(startTime))
        return next(new ErrorHandler("Return time must be after start time", 400));
    }

    // ---------------- DISTANCE CALCULATION ----------------
    const [pickupLon, pickupLat] = pickup.location.coordinates;
    const [dropOffLon, dropOffLat] = dropOff.location.coordinates;

    const toRad = (val) => (val * Math.PI) / 180;
    const R = 6371; // Earth radius km
    const dLat = toRad(dropOffLat - pickupLat);
    const dLon = toRad(dropOffLon - pickupLon);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(pickupLat)) * Math.cos(toRad(dropOffLat)) * Math.sin(dLon / 2) ** 2;
    const totalDistance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    if (totalDistance <= 0)
      return next(new ErrorHandler("Calculated distance must be greater than 0 km", 400));

    const MAX_DISTANCE_KM = 350;
    if (totalDistance > MAX_DISTANCE_KM)
      return next(
        new ErrorHandler(
          `Outstation trips cannot exceed ${MAX_DISTANCE_KM} km. Your trip is ${totalDistance.toFixed(
            2
          )} km.`,
          400
        )
      );

    // ---------------- FARE CALCULATION ----------------
    let fare = CalculateFareOutstation(totalDistance, carType, isRoundTrip, startTime, returnTime, addOns);
    fare = Math.ceil(fare); // Round up to nearest integer (paise)

    const userId = req.user?.id;
    if (!userId) return next(new ErrorHandler("User ID is required", 400));

    // ---------------- CAR & DRIVER ALLOCATION ----------------
    const allocatedCar = await Car.findOneAndUpdate(
      { carType, isAvailable: true },
      { isAvailable: false },
      { new: true }
    );

    if (!allocatedCar)
      return next(new ErrorHandler(`No available ${carType} cars at the moment`, 400));

    // ---------------- BOOKING CREATION ----------------
    const bookingData = {
      userId,
      rideType: "outstation",
      carType,
      passengerCount,
      luggageCount,
      allocatedCar: allocatedCar._id,
      driver: allocatedCar.driverId || null,
      driverName: allocatedCar.driverName || null,
      driverNumber: allocatedCar.driverNumber || null,
      carNo: allocatedCar.carNumber || null,
      carModel: allocatedCar.carModel || null,
      pickUp: { address: pickup.address, location: pickup.location },
      dropOff: { address: dropOff.address, location: dropOff.location },
      stops: stops.map((stop) => ({ address: stop.address || "", location: stop.location })),
      addOns,
      payment: { paymentMethod: "razorpay", amount: fare, paymentStatus: "pending" },
      startTime: new Date(startTime),
      isRoundTrip,
      returnTime: isRoundTrip ? new Date(returnTime) : undefined,
      totalDistance: totalDistance.toFixed(2),
    };

    const booking = new OutstationBooking(bookingData);
    await booking.save();

    // ---------------- RAZORPAY ORDER ----------------
    const shortReceipt = `${userId.toString().slice(-6)}-${booking._id.toString().slice(-6)}`;
    let order;
    try {
      order = await razorpay.orders.create({
        amount: fare, // integer in paise
        currency: "INR",
        receipt: shortReceipt,
      });

      booking.payment.orderId = order.id;
      booking.payment.receipt = shortReceipt;
      booking.payment.amount = order.amount;
      await booking.save();
    } catch (err) {
      logger.error("Razorpay order creation failed:", err);
      await OutstationBooking.findByIdAndDelete(booking._id);
      await Car.findByIdAndUpdate(allocatedCar._id, { isAvailable: true });
      return next(new ErrorHandler("Failed to create payment order: " + err.message, 500));
    }

    // ---------------- EMAIL NOTIFICATION ----------------
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: "eleqtmobility@gmail.com", pass: "htza ihnh gjko wlzn" },
      });

      const mailOptions = {
        from: `"Eleqt Mobility" <eleqtmobility@gmail.com>`,
        to: `${req.user.email}, eleqtmobility@gmail.com`,
        subject: "Outstation Ride Booking Confirmation",
        html: `
          <h2>Booking Confirmed ✅</h2>
          <p>Dear ${req.user.name}, your outstation booking is confirmed.</p>
          <p><strong>Booking ID:</strong> ${booking._id}</p>
          <p><strong>Car Allocated:</strong> ${allocatedCar.carModel || allocatedCar.model} (${allocatedCar.carType})</p>
          <p><strong>Regd. Number:</strong> ${allocatedCar.carNumber || "N/A"}</p>
          <p><strong>Driver Name:</strong> ${booking.driverName || "N/A"}</p>
          <p><strong>Driver Number:</strong> ${booking.driverNumber || "N/A"}</p>
          <p><strong>Pickup:</strong> ${pickup.address}</p>
          <p><strong>Drop-off:</strong> ${dropOff.address}</p>
          <p><strong>Start Time:</strong> ${new Date(startTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
          ${isRoundTrip ? `<p><strong>Return Time:</strong> ${new Date(returnTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>` : ""}
          <p><strong>Total Distance:</strong> ${totalDistance.toFixed(2)} km</p>
          <p><strong>Fare:</strong> ₹ ${(fare / 100).toFixed(2)}</p>
          <br/>
          <p>Thank you for choosing Eleqt Mobility 🚖</p>
        `,
      };

      await transporter.sendMail(mailOptions);
    } catch (err) {
      logger.error("Email sending failed:", err.message);
    }

    // ---------------- AUTO MAKE CAR AVAILABLE AGAIN ----------------
    const releaseTime = isRoundTrip ? new Date(returnTime) : new Date(startTime);
    const delay = releaseTime.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(async () => {
        await Car.findByIdAndUpdate(allocatedCar._id, { isAvailable: true });
        logger.info(`Car ${allocatedCar._id} marked available again`);
      }, delay);
    }

    // ---------------- RAZORPAY OPTIONS RESPONSE ----------------
    const paymentOptions = {
      key: razorpay.key_id,
      amount: order.amount,
      currency: order.currency,
      name: "Eleqt Rides",
      description: `Outstation Booking - ${totalDistance.toFixed(2)}km ${isRoundTrip ? "(Round Trip)" : "(One Way)"}`,
      order_id: order.id,
      prefill: { userId: userId.toString(), bookingId: booking._id.toString() },
      notes: { bookingType: "outstation", distance: `${totalDistance.toFixed(2)}km`, tripType: isRoundTrip ? "round-trip" : "one-way", carType },
      theme: { color: "#eded42ff" }
    };

    return res.status(201).json({
      success: true,
      message: "Outstation booking created successfully",
      data: {
        bookingId: booking._id,
        fare,
        fareInRupees: (fare / 100).toFixed(2),
        carType,
        allocatedCar: allocatedCar.model,
        driverName: booking.driverName,
        driverNumber: booking.driverNumber,
        serviceType: "outstation",
        stopsCount: stops.length,
        distance: totalDistance.toFixed(2),
        isRoundTrip,
        status: booking.status,
        createdAt: booking.createdAt,
      },
      options: paymentOptions,
      meta: { currency: "INR", amountUnit: "paise (₹1 = 100 paise)" }
    });
  } catch (error) {
    logger.error("Error booking outstation ride:", error);
    return next(new ErrorHandler("Error booking outstation ride: " + error.message, 500));
  }
});








export const verifyRidePayment = catchAsyncError(async (req, res, next) => {
  try {
    const { bookingId } = req.params; // Get bookingId from URL params
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      req.body;

    // Validate required fields
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return next(new ErrorHandler("Missing payment verification data", 400));
    }

    if (!bookingId) {
      return next(new ErrorHandler("Booking ID is required", 400));
    }

    // Get userId from auth middleware
    const userId = req.user ? req.user.id || req.user._id : null;
    if (!userId) {
      return next(new ErrorHandler("User authentication required", 401));
    }

    // Verify payment signature
    const paymentToken = await verifyPayment(
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      userId
    );

    // Check if payment already processed to prevent duplicate processing
    const existingPayment =
      (await HourlyBooking.findOne({
        "payment.paymentId": razorpay_payment_id,
      })) ||
      (await OutstationBooking.findOne({
        "payment.paymentId": razorpay_payment_id,
      }));

    if (existingPayment) {
      return next(new ErrorHandler("Payment already processed", 400));
    }

    // Find booking by bookingId first, then verify order ID matches
    let booking = await HourlyBooking.findById(bookingId);
    if (!booking) {
      booking = await OutstationBooking.findById(bookingId);
    }

    if (!booking) {
      return next(new ErrorHandler("Booking not found", 404));
    }

    // Verify the order ID matches the booking
    if (booking.payment.orderId !== razorpay_order_id) {
      return next(new ErrorHandler("Order ID mismatch", 400));
    }

    // Verify booking belongs to the authenticated user
    if (booking.userId.toString() !== userId.toString()) {
      return next(new ErrorHandler("Unauthorized payment verification", 403));
    }

    // Check if payment is still pending
    if (booking.payment.paymentStatus !== "pending") {
      return next(
        new ErrorHandler(
          `Payment already ${booking.payment.paymentStatus}`,
          400
        )
      );
    }

    // Update booking payment status
    booking.payment.paymentStatus = "paid";
    booking.payment.paymentId = razorpay_payment_id;
    booking.payment.signature = razorpay_signature;
    booking.status = "confirmed"; // Update booking status to paid

    await booking.save();

    // Log successful payment
    logger.info(`Payment verified successfully for booking ${booking._id}`, {
      bookingId: booking._id,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      userId: userId,
    });

    // Redirect to frontend success page
    res.redirect(`${config.FRONTEND_URL}/payment-status?token=${paymentToken}`);
  } catch (error) {
    logger.error("Payment verification failed:", error);

    // Redirect to frontend failure page
    res.redirect(
      `${config.FRONTEND_URL}/payment-status?error=${encodeURIComponent(
        error.message
      )}`
    );
  }
});

export const verifyPaymentToken = catchAsyncError(async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return next(new ErrorHandler("Token is required", 400));
    }
    const decoded = jwt.verify(token, config.JWT_SECRET_KEY);
    if (!decoded) {
      return next(new ErrorHandler("Invalid or expired token", 401));
    }

    res.status(200).json({
      success: true,
      message: "Payment token verified successfully",
      data: decoded,
    });
  } catch (error) {
    logger.error("Invalid or expired token:", error);
    return next(new ErrorHandler("Invalid or expired token", 401));
  }
});

// Get User's Bookings (Active and Past)
export const getUserBookings = catchAsyncError(async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 10,
      rideType, // 'hourly' or 'outstation'
      status, // 'pending', 'confirmed', 'ongoing', 'completed', 'cancelled'
    } = req.query;

    // Build filter object
    const filter = { userId };
    if (rideType) filter.rideType = rideType;
    if (status) filter.status = status;

    // Pagination
    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = Math.min(parseInt(limit, 10) || 10, 50); // Max 50 per page
    const skip = (pageNumber - 1) * pageSize;

    // Get all bookings for the user
    const [hourlyBookings, outstationBookings] = await Promise.all([
      HourlyBooking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      OutstationBooking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
    ]);

    // Combine and sort all bookings
    const allBookings = [...hourlyBookings, ...outstationBookings]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, pageSize);

    // Get current date/time for comparison
    const now = new Date();

    // Categorize bookings into active and past
    const activeBookings = [];
    const pastBookings = [];

    allBookings.forEach((booking) => {
      // Active bookings: not completed/cancelled AND (future booking OR pending/confirmed/ongoing status)
      const isActive =
        !["completed", "cancelled"].includes(booking.status) &&
        (new Date(booking.startTime) > now ||
          ["pending", "confirmed", "ongoing"].includes(booking.status));

      if (isActive) {
        activeBookings.push(booking);
      } else {
        pastBookings.push(booking);
      }
    });

    // Get total count for pagination
    const [totalHourly, totalOutstation] = await Promise.all([
      HourlyBooking.countDocuments(filter),
      OutstationBooking.countDocuments(filter),
    ]);
    const totalBookings = totalHourly + totalOutstation;

    res.status(200).json({
      success: true,
      message: "User bookings fetched successfully",
      data: {
        active: activeBookings,
        past: pastBookings,
        statistics: {
          totalBookings,
          activeBookings: activeBookings.length,
          pastBookings: pastBookings.length,
        },
      },
      pagination: {
        currentPage: pageNumber,
        pageSize,
        totalPages: Math.ceil(totalBookings / pageSize),
        totalBookings,
        hasNextPage: pageNumber < Math.ceil(totalBookings / pageSize),
        hasPrevPage: pageNumber > 1,
      },
    });
  } catch (error) {
    return next(
      new ErrorHandler("Error fetching user bookings: " + error.message, 500)
    );
  }
});

// Get Booking Details by ID
export const getBookingById = catchAsyncError(async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    // Validate booking ID format
    if (!bookingId) {
      return next(new ErrorHandler("Booking ID is required", 400));
    }

    // Try to find the booking in both collections
    let booking = await HourlyBooking.findById(bookingId).lean();
    if (!booking) {
      booking = await OutstationBooking.findById(bookingId).lean();
    }

    if (!booking) {
      return next(new ErrorHandler("Booking not found", 404));
    }

    // Verify booking belongs to the authenticated user
    if (booking.userId.toString() !== userId.toString()) {
      return next(new ErrorHandler("Unauthorized access to booking", 403));
    }

    // Determine if booking is active or past
    const now = new Date();
    const isActive =
      !["completed", "cancelled"].includes(booking.status) &&
      (new Date(booking.startTime) > now ||
        ["pending", "confirmed", "ongoing"].includes(booking.status));

    // Add computed fields
    const bookingDetails = {
      ...booking,
      isActive,
      category: isActive ? "active" : "past",
      duration:
        booking.rideType === "hourly" ? `${booking.durationHrs} hours` : null,
      fareInRupees: (booking.payment.amount / 100).toFixed(2),
      stopsCount: booking.stops ? booking.stops.length : 0,
      // Format dates for better readability
      startTimeFormatted: new Date(booking.startTime).toLocaleString(),
      returnTimeFormatted: booking.returnTime
        ? new Date(booking.returnTime).toLocaleString()
        : null,
      createdAtFormatted: new Date(booking.createdAt).toLocaleString(),
    };

    res.status(200).json({
      success: true,
      message: "Booking details fetched successfully",
      data: bookingDetails,
    });
  } catch (error) {
    return next(
      new ErrorHandler("Error fetching booking details: " + error.message, 500)
    );
  }
});

// Cancel Booking by ID
// Cancel Booking by ID
export const cancelBookingById = catchAsyncError(async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    // Validate booking ID format
    if (!bookingId) {
      return next(new ErrorHandler("Booking ID is required", 400));
    }

    // Try to find the booking in both collections
    let booking = await HourlyBooking.findById(bookingId);
    if (!booking) {
      booking = await OutstationBooking.findById(bookingId);
    }

    if (!booking) {
      return next(new ErrorHandler("Booking not found", 404));
    }

    // Verify booking belongs to the authenticated user
    if (booking.userId.toString() !== userId.toString()) {
      return next(new ErrorHandler("Unauthorized access to booking", 403));
    }

    // Check if booking can be cancelled based on status
    if (booking.status === "cancelled") {
      return next(new ErrorHandler("Booking is already cancelled", 400));
    }

    if (booking.status === "completed") {
      return next(new ErrorHandler("Cannot cancel completed booking", 400));
    }

    if (booking.status === "ongoing") {
      return next(new ErrorHandler("Cannot cancel ongoing booking", 400));
    }

    // ✅ KEY VALIDATION: Only allow cancellation for pending or failed payments
    if (!["pending", "failed"].includes(booking.payment.paymentStatus)) {
      return next(
        new ErrorHandler(
          `Cannot cancel booking with payment status: ${booking.payment.paymentStatus}. Only bookings with pending or failed payments can be cancelled.`,
          400
        )
      );
    }

    // Check if booking is too close to start time (e.g., within 2 hours)
    const now = new Date();
    const startTime = new Date(booking.startTime);
    const timeDifference = startTime.getTime() - now.getTime();
    const hoursUntilStart = timeDifference / (1000 * 60 * 60);

    if (hoursUntilStart <= 2 && hoursUntilStart > 0) {
      return next(
        new ErrorHandler(
          "Cannot cancel booking within 2 hours of start time",
          400
        )
      );
    }

    // Store previous values before update
    const previousStatus = booking.status;
    const previousPaymentStatus = booking.payment.paymentStatus;

    // ✅ UPDATE: Use findByIdAndUpdate to bypass schema validations
    let updatedBooking;
    if (booking.rideType === "hourly") {
      updatedBooking = await HourlyBooking.findByIdAndUpdate(
        bookingId,
        {
          status: "cancelled",
          updatedAt: new Date(), // Explicitly update the timestamp
        },
        {
          new: true, // Return updated document
          runValidators: false, // Skip schema validations
        }
      );
    } else {
      updatedBooking = await OutstationBooking.findByIdAndUpdate(
        bookingId,
        {
          status: "cancelled",
          updatedAt: new Date(), // Explicitly update the timestamp
        },
        {
          new: true, // Return updated document
          runValidators: false, // Skip schema validations
        }
      );
    }

    if (!updatedBooking) {
      return next(new ErrorHandler("Failed to update booking status", 500));
    }

    // Log successful cancellation
    logger.info(`Booking cancelled successfully`, {
      bookingId: updatedBooking._id,
      userId: userId,
      previousStatus,
      paymentStatus: previousPaymentStatus,
      reason: "Payment was pending/failed",
    });

    // Prepare response data
    const responseData = {
      bookingId: updatedBooking._id.toString(),
      status: updatedBooking.status,
      previousStatus,
      rideType: updatedBooking.rideType,
      fareInRupees: (updatedBooking.payment.amount / 100).toFixed(2),
      paymentStatus: updatedBooking.payment.paymentStatus,
      cancellationTime: new Date().toISOString(),
      startTimeFormatted: new Date(updatedBooking.startTime).toLocaleString(),
      message: `Booking cancelled successfully. No refund required as payment was ${previousPaymentStatus}.`,
    };

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: responseData,
    });
  } catch (error) {
    logger.error("Booking cancellation failed:", error);
    return next(
      new ErrorHandler("Error cancelling booking: " + error.message, 500)
    );
  }
});





export const bookLuxuryCar = catchAsyncError(async (req, res, next) => {
  try {
    const {
      carNumber,
      passengerCount,
      luggageCount,
      startTime,
      addOns = {},
    } = req.body;

    if (!carNumber || typeof carNumber !== "string")
      return next(new ErrorHandler("carNumber is required", 400));

    const allocatedCar = await LuxuryCar.findOneAndUpdate(
      { carNumber, isAvailable: true },
      { isAvailable: false },
      { new: true }
    );

    if (!allocatedCar)
      return next(new ErrorHandler("Luxury car not available", 400));

    const userId = req.user?.id;
    if (!userId)
      return next(new ErrorHandler("User ID is required", 400));

    const fare = 250000; // Fixed fare in paise (₹2500)

    const booking = new LuxuryBooking({
      userId,
      carNumber: allocatedCar.carNumber,
      carModel: allocatedCar.carModel,
      driverName: allocatedCar.driverName,
      driverNumber: allocatedCar.driverNumber,
      ownerName: allocatedCar.ownerName,
      ownerNumber: allocatedCar.ownerNumber,
      passengerCount,
      luggageCount,
      addOns,
      startTime: new Date(startTime),
      payment: {
        paymentMethod: "razorpay",
        amount: fare,
        paymentStatus: "pending",
      },
    });

    await booking.save();

    const order = await createOrder(userId, booking._id, fare);
    booking.payment.orderId = order.id;
    booking.payment.receipt = order.receipt;
    booking.payment.amount = order.amount;
    await booking.save();

    const encrypted = await encryptOptions({
      key: config.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: "Eleqt Rides",
      description: "Luxury Car Booking",
      order_id: order.id,
      callback_url: `${config.BACKEND_URL}/api/v1/bookings/verify-payment/${booking._id}`,
    });

    return res.status(201).json({
      success: true,
      message: "Luxury car booking created successfully",
      data: {
        bookingId: booking.id,
        fare,
        fareInRupees: (fare / 100).toFixed(2),
        carNumber: allocatedCar.carNumber,
        carModel: allocatedCar.carModel,
        driverName: allocatedCar.driverName,
        driverNumber: allocatedCar.driverNumber,
        status: booking.status,
      },
      options: encrypted,
      meta: { currency: "INR", amountUnit: "paise (₹1 = 100 paise)" },
    });
  } catch (error) {
    logger.error("Error booking luxury car:", error);
    return next(new ErrorHandler("Error booking luxury car: " + error.message, 500));
  }
});