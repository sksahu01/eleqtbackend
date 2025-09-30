// models/Booking.js
import mongoose from "mongoose";
import ErrorHandler from "../middleware/error.js";

// GeoJSON Point Schema (Reusable)
const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: (coords) => Array.isArray(coords) && coords.length === 2,
        message: "Coordinates must be an array of [longitude, latitude]",
      },
    },
  },
  { _id: false }
);

// Base Booking Schema
const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rideType: {
      type: String,
      enum: ["hourly", "outstation"],
      required: true,
      index: true,
    },
    carType: {
      type: String,
      enum: ["3-seater", "5-seater"],
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },
    driverName: {
      type: String,
      trim: true,
      default: null, // store the driver's name
    },
    driverNumber: {
      type: String,
      trim: true,
      default: null, // store the driver's phone number
    },
    carNo: {
      type: String,
      trim: true,
      default: null,
    },
    carModel: {
      type: String,
      trim: true,
      default: null,
    },
    passengerCount: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    luggageCount: {
      type: Number,
      required: true,
      min: 0,
    },
    pickUp: {
      address: { type: String, required: true, trim: true, default: "" },
      location: { type: pointSchema, required: true },
    },
    dropOff: {
      address: { type: String, required: true, trim: true, default: "" },
      location: { type: pointSchema, required: true },
    },
    stops: {
      type: [
        {
          address: { type: String, trim: true, default: "" },
          location: pointSchema,
        },
      ],
      validate: {
        validator: function (stops) {
          return stops.length <= 5;
        },
        message: "Maximum 5 stops allowed",
      },
    },
    // guestCount: {
    //   type: Number,
    //   required: true,
    //   min: 0,
    // },
    addOns: {
      airportToll: { type: Boolean, default: false },
      placard: {
        required: { type: Boolean, default: false },
        text: { type: String, trim: true },
      },
      pets: {
        dogs: { type: Boolean, default: false },
        cats: { type: Boolean, default: false },
      },
      bookForOther: {
        isBooking: { type: Boolean, default: false },
        otherGuestInfo: { type: String, trim: true },
      },
      childSeat: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "ongoing", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    payment: {
      orderId: { type: String, index: true },
      paymentId: { type: String },
      signature: { type: String },
      receipt: { type: String },
      paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
      },
      paymentMethod: {
        type: String,
        enum: ["card", "cash", "upi", "netbanking", "wallet", "razorpay"],
        required: true,
        default: "razorpay",
      },
      amount: {
        type: Number,
        required: true,
        min: 0, // Amount in paise
      },
    },
  },
  {
    timestamps: true,
    discriminatorKey: "rideType",
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        // Convert _id to id for better API consistency
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;

        // Remove sensitive payment information from public responses
        if (ret.payment) {
          delete ret.payment.paymentId;
          delete ret.payment.signature;
          delete ret.payment.orderId;
        }

        // Format timestamps to ISO strings
        if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
        if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();
        if (ret.startTime) ret.startTime = ret.startTime.toISOString();
        if (ret.returnTime) ret.returnTime = ret.returnTime.toISOString();

        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Geospatial Indexes
bookingSchema.index({ "pickUp.location": "2dsphere" });
bookingSchema.index({ "dropOff.location": "2dsphere" });

// Luggage Validation and Car Type Assignment (Pre-save)
bookingSchema.pre("save", function (next) {
  // Determine the car type based on passengerCount and luggageCount
  const carType = getCarType(this.passengerCount, this.luggageCount);

  // If no valid car type is found, throw an error
  if (!carType) {
    return next(
      new ErrorHandler(
        `Invalid combination of passenger count (${this.passengerCount}) and luggage count (${this.luggageCount}). No suitable car type found.`,
        400
      )
    );
  }

  // Assign the determined car type to the booking
  this.carType = carType;

  next();
});

// Base Model
const Booking = mongoose.model("Booking", bookingSchema);

// Hourly Booking Schema
const hourlySchema = new mongoose.Schema(
  {
    startTime: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          const now = new Date();
          const minStartTime = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 24 hours from now
          return value >= minStartTime;
        },
        message: "startTime must be at least 48 hours in the future",
      },
    },
    durationHrs: { type: Number, required: true, min: 1, max: 12 },
  },
  { _id: false }
);
const HourlyBooking = Booking.discriminator("hourly", hourlySchema);
const luxurySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    carNumber: { type: String, required: true },
    carModel: { type: String, required: true },
    driverName: { type: String, required: true },
    driverNumber: { type: String, required: true },
    ownerName: { type: String, required: true },
    ownerNumber: { type: String, required: true },
    passengerCount: { type: Number, required: true },
    luggageCount: { type: Number, required: true },
    addOns: { type: Object },
    startTime: { type: Date, required: true },
    payment: { type: Object, required: true },
    status: { type: String, default: "pending" },
  },
  {
    timestamps: true,
    collection: "luxurybookings",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const LuxuryBooking = mongoose.model("LuxuryBooking", luxurySchema);


// Outstation Booking Schema + Distance Validation
const outstationSchema = new mongoose.Schema(
  {
    startTime: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          const now = new Date();
          const minStartTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
          return value >= minStartTime;
        },
        message: "startTime must be at least 24 hours in the future",
      },
    },
    isRoundTrip: { type: Boolean, default: false },
    returnTime: { type: Date },
  },
  { _id: false }
);

outstationSchema.pre("save", function (next) {
  // enforce returnTime if round-trip
  if (this.isRoundTrip && !this.returnTime) {
    return next(
      new ErrorHandler("returnTime is required for round-trip bookings", 400)
    );
  }

  // ensure returnTime is greater than startTime
  if (this.returnTime && this.returnTime <= this.startTime) {
    return next(
      new ErrorHandler("returnTime must be greater than startTime", 400)
    );
  }

  // enforce distance limit (e.g. 350km from central point)
  const CENTER = [85.8166, 20.2945]; // Example: Bhubaneswar jaydev bihar coordinates
  const MAX_KM = 350;
  const [lon, lat] = this.dropOff.location.coordinates;
  const dist = calculateHaversine(CENTER, [lon, lat]);
  if (dist > MAX_KM) {
    return next(
      new ErrorHandler(
        `Drop-off exceeds ${MAX_KM}km radius (${dist.toFixed(1)}km)`,
        400
      )
    );
  }
  next();
});

const OutstationBooking = Booking.discriminator("outstation", outstationSchema);

// Haversine util (private)
function calculateHaversine([lon1, lat1], [lon2, lat2]) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// get carType based on passengerCount and luggageCount private
function getCarType(passengerCount, luggageCount) {
  // Define the rules for car types
  const rules = {
    "3-seater": { 1: 3, 2: 3, 3: 2 }, // Max luggage for each passenger count
    "5-seater": { 1: 5, 2: 5, 3: 4, 4: 3, 5: 2 },
  };

  // Check for 3-seater conditions
  if (
    rules["3-seater"][passengerCount] !== undefined &&
    luggageCount <= rules["3-seater"][passengerCount]
  ) {
    return "3-seater";
  }

  // Check for 5-seater conditions
  if (
    rules["5-seater"][passengerCount] !== undefined &&
    luggageCount <= rules["5-seater"][passengerCount]
  ) {
    return "5-seater";
  }

  // If no valid car type is found, return null
  return null;
}

export { Booking, HourlyBooking, OutstationBooking  };
