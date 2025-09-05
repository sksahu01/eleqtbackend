// Admin Model (models/Admin.js)
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import config from "../utils/config.js";

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter admin name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please enter email"],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Please enter password"],
      minLength: [8, "Password must have at least 8 characters"],
      maxLength: [32, "Password cannot have more than 32 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "superadmin"],
      default: "admin",
    },
    permissions: {
      deleteUsers: { type: Boolean, default: true },
      approveRides: { type: Boolean, default: true },
      manageAdmins: { type: Boolean, default: false },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        // Convert _id to id for better API consistency
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;

        // Remove sensitive fields
        delete ret.password;

        // Format timestamps to ISO strings
        if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
        if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();

        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

adminSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

adminSchema.methods.generateToken = function () {
  return jwt.sign({ id: this._id, email: this.email }, config.JWT_SECRET_KEY, {
    expiresIn: config.JWT_EXPIRE,
  });
};

export const Admin = mongoose.model("Admin", adminSchema);
