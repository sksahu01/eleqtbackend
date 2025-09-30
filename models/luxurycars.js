import mongoose from "mongoose";

const luxuryCarSchema = new mongoose.Schema(
  {
    carNumber: {
      type: String,
      required: [true, "Car number is required"],
      unique: true,
      trim: true,
    },
    carModel: {
      type: String,
      required: [true, "Car model is required"],
      trim: true,
    },
    ownerName: {
      type: String,
      required: [true, "Owner name is required"],
      trim: true,
    },
    ownerNumber: {
      type: String,
      required: [true, "Owner contact number is required"],
      match: [/^\+91[6-9]\d{9}$/, "Please provide a valid Indian phone number"],
    },
    driverName: {
      type: String,
      required: [true, "Driver name is required"],
      trim: true,
    },
    driverNumber: {
      type: String,
      required: [true, "Driver contact number is required"],
      match: [/^\+91[6-9]\d{9}$/, "Please provide a valid Indian phone number"],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "luxurycars",
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;

        if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
        if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();

        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

export const LuxuryCar = mongoose.model("LuxuryCar", luxuryCarSchema, "luxurycars");
