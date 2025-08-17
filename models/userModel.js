import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import config from "../utils/config.js";

const userSchema = new mongoose.Schema(
  {
    profilePicture: {
      type: String,
      default: null,
    },

    name: {
      type: String,
      required: [true, "Please enter your name."],
      maxLength: [50, "Name cannot exceed 50 characters."],
      trim: true,
    },

    email: {
      type: String,
      lowercase: true,
    },

    workEmail: {
      type: String,
      lowercase: true,
      default: null,
    },

    password: {
      type: String,
      minLength: [8, "Password must have at least 8 characters."],
      maxLength: [32, "Password cannot have more than 32 characters."],
      select: false,
    },

    phone: String,

    homecity: {
      type: String,
      default: null,
      trim: true,
    },

    deleteRequest: {
      type: Boolean,
      default: false,
    },

    deleteRequestedAt: {
      type: Date,
      default: null,
    },

    // Account verification fields
    accountVerified: { type: Boolean, default: false },
    verificationCode: Number,
    verificationCodeExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        // Convert _id to id for better API consistency
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;

        // Remove sensitive fields
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpire;
        delete ret.verificationCode;
        delete ret.verificationCodeExpire;

        // Format timestamps to ISO strings
        if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
        if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();
        if (ret.deleteRequestedAt)
          ret.deleteRequestedAt = ret.deleteRequestedAt.toISOString();

        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Add to your user model
userSchema.index({ name: 1 });
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ deleteRequest: 1, deleteRequestedAt: -1 });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateVerificationCode = function () {
  function generateRandomFiveDigitNumber() {
    const firstDigit = Math.floor(Math.random() * 9) + 1;
    const remainingDigits = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, 0);

    return parseInt(firstDigit + remainingDigits);
  }
  const verificationCode = generateRandomFiveDigitNumber();
  this.verificationCode = verificationCode;
  this.verificationCodeExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  return verificationCode;
};

userSchema.methods.generateToken = function () {
  return jwt.sign({ id: this._id, phone: this.phone }, config.JWT_SECRET_KEY, {
    expiresIn: config.JWT_EXPIRE,
  });
};

userSchema.methods.generateResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

// userSchema.set("toJSON", {
//   transform: (document, returnedObject) => {
//     delete returnedObject.__v;
//     delete returnedObject.password;
//   },
// });

export const User = mongoose.model("User", userSchema);
