import crypto from "crypto";
import { catchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../middleware/error.js";
import { User } from "../models/userModel.js";
import { sendVerificationCodeViaPhone } from "../services/otp.js";
import {
  accountDeletionEmailTemplate,
  accountRecoverySuccessTemplate,
  passwordChangedEmailTemplate,
  registerUserEmailTemplate,
  resetPasswordEmailTemplate,
} from "../utils/emailTemplates.js";
import { logger } from "../utils/logger.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendToken } from "../utils/sendToken.js";
import {
  isValidEmail,
  isValidName,
  isValidPhoneNumber,
} from "../utils/validation.js";

export const register = catchAsyncError(async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return next(new ErrorHandler("All fields are required.", 400));
    }
    if (!isValidName(name)) {
      return next(new ErrorHandler("Invalid name format.", 400));
    }
    if (!isValidEmail(email)) {
      return next(new ErrorHandler("Invalid email format.", 400));
    }
    if (!isValidPhoneNumber(phone)) {
      return next(new ErrorHandler("Invalid phone number.", 400));
    }

    const existingUser = await User.findOne({
      $or: [
        {
          email,
          accountVerified: true,
        },
        {
          phone,
          accountVerified: true,
        },
      ],
    });

    if (existingUser) {
      return next(new ErrorHandler("Phone or Email is already used.", 400));
    }

    const registerationAttemptsByUser = await User.find({
      $or: [
        { phone, accountVerified: false },
        { email, accountVerified: false },
      ],
    });

    // If the user has already attempted to register with the same phone or email max allowed 3 times
    if (registerationAttemptsByUser.length > 3) {
      return next(
        new ErrorHandler(
          "You have exceeded the maximum number of attempts. Please try again after an hour.",
          400
        )
      );
    }

    const userData = {
      name,
      email,
      phone,
      password,
    };

    const user = await User.create(userData);
    const verificationCode = await user.generateVerificationCode();
    await user.save();

    // Assuming sendVerificationCode is a function that sends the verification code to the user
    sendVerificationCodeViaPhone(verificationCode, name, phone, res);
  } catch (error) {
    next(error);
  }
});

export const verifyOTP = catchAsyncError(async (req, res, next) => {
  const { email, otp, phone } = req.body;

  if (!isValidPhoneNumber(phone)) {
    return next(new ErrorHandler("Invalid phone number.", 400));
  }
  if (!isValidEmail(email)) {
    return next(new ErrorHandler("Invalid email format.", 400));
  }

  try {
    const userAllEntries = await User.find({
      $or: [
        {
          email,
          accountVerified: false,
        },
        {
          phone,
          accountVerified: false,
        },
      ],
    }).sort({ createdAt: -1 });

    if (userAllEntries.length === 0) {
      return next(new ErrorHandler("User not found or already verified.", 404));
    }

    let user;

    if (userAllEntries.length > 1) {
      user = userAllEntries[0];

      await User.deleteMany({
        _id: { $ne: user._id },
        $or: [
          { phone, accountVerified: false },
          { email, accountVerified: false },
        ],
      });
    } else {
      user = userAllEntries[0];
    }

    if (user.verificationCode !== Number(otp)) {
      return next(new ErrorHandler("Invalid OTP.", 400));
    }

    const currentTime = Date.now();

    const verificationCodeExpire = new Date(
      user.verificationCodeExpire
    ).getTime();

    // console.log(currentTime);
    // console.log(verificationCodeExpire);

    if (currentTime > verificationCodeExpire) {
      return next(new ErrorHandler("OTP Expired.", 400));
    }

    user.accountVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpire = null;
    await user.save({ validateModifiedOnly: true });

    // Send welcome email
    const { subject, message } = registerUserEmailTemplate(user);
    await sendEmail({
      email: user.email,
      subject,
      message,
    });

    sendToken(user, 200, "Account Verified.", res);
  } catch (error) {
    logger.error("Error in verifyOTP:", error);
    return next(new ErrorHandler("Internal Server Error.", 500));
  }
});

export const login = catchAsyncError(async (req, res, next) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return next(
      new ErrorHandler("Phone Number and password are required.", 400)
    );
  }
  const user = await User.findOne({ phone, accountVerified: true }).select(
    "+password +deleteRequest +deleteRequestedAt"
  );
  if (!user) {
    return next(new ErrorHandler("Invalid Phone Number or password.", 400));
  }

  // Check account deletion status
  if (user.deleteRequest) {
    const now = Date.now();
    const deletionRequestedAt = user.deleteRequestedAt.getTime();
    const timeSinceDeletionRequest = now - deletionRequestedAt;

    // Calculate time periods in milliseconds
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    const recoveryWindow = 72 * oneHour; // 72-hour recovery window
    const deletionWindow = 30 * oneDay; // 30-day deletion window

    if (timeSinceDeletionRequest < recoveryWindow) {
      // Within 72-hour recovery window - show countdown timer
      const remainingRecoveryTime = recoveryWindow - timeSinceDeletionRequest;
      const hours = Math.floor(remainingRecoveryTime / oneHour);
      const minutes = Math.floor(
        (remainingRecoveryTime % oneHour) / (60 * 1000)
      );
      const seconds = Math.floor((remainingRecoveryTime % (60 * 1000)) / 1000);

      return next(
        new ErrorHandler(
          `Account deletion requested. You can still recover your account via email for: ${hours}h ${minutes}m ${seconds}s. After this period, contact support for recovery.`,
          403
        )
      );
    } else {
      // Beyond 72-hour window - show days until permanent deletion
      const remainingDeletionTime = deletionWindow - timeSinceDeletionRequest;
      const daysLeft = Math.ceil(remainingDeletionTime / oneDay);

      return next(
        new ErrorHandler(
          `Account scheduled for permanent deletion. ${
            daysLeft > 0
              ? `${daysLeft} day${daysLeft > 1 ? "s" : ""} remaining`
              : "Final deletion processing today"
          }. Contact support for recovery options.`,
          403
        )
      );
    }
  }

  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) {
    return next(new ErrorHandler("Invalid Phone Number or password.", 400));
  }

  sendToken(user, 200, "User logged in successfully.", res);
});

export const logout = catchAsyncError(async (req, res, next) => {
  try {
    res
      .status(200)
      .cookie("userToken", "", {
        expires: new Date(Date.now()),
        httpOnly: true,
      })
      .json({
        success: true,
        message: "Logged out successfully.",
      });
  } catch (error) {
    logger.error("Error in logout:", error);
    next(new ErrorHandler("Internal Server Error. " + error.message, 500));
  }
});

export const getUser = catchAsyncError(async (req, res, next) => {
  try {
    const user = req.user;
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    logger.error("Error in getUser:", error);
    next(new ErrorHandler("Internal Server Error. " + error.message, 500));
  }
});

export const forgotPassword = catchAsyncError(async (req, res, next) => {
  const user = await User.findOne({
    email: req.body.email,
    accountVerified: true,
  });
  if (!user) {
    return next(new ErrorHandler("User not found.", 404));
  }
  const resetToken = user.generateResetPasswordToken();
  await user.save({ validateBeforeSave: false });
  try {
    const { subject, message } = resetPasswordEmailTemplate(user, resetToken);

    await sendEmail({
      email: user.email,
      subject,
      message,
    });

    res.status(200).json({
      success: true,
      message: `Email sent to ${user.email} successfully.`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new ErrorHandler(
        error.message ? error.message : "Cannot send reset password token.",
        500
      )
    );
  }
});

export const resetPassword = catchAsyncError(async (req, res, next) => {
  const { token } = req.params;
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if (!user) {
    return next(
      new ErrorHandler(
        "Reset password token is invalid or has been expired.",
        400
      )
    );
  }

  if (req.body.password !== req.body.confirmPassword) {
    return next(
      new ErrorHandler("Password & confirm password do not match.", 400)
    );
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  // send nofication email
  const { subject, message } = passwordChangedEmailTemplate(user);

  await sendEmail({
    email: user.email,
    subject,
    message,
  });

  sendToken(user, 200, "Reset Password Successfully.", res);
});

export const updateUser = catchAsyncError(async (req, res, next) => {
  try {
    const userId = req.user.id; // Authenticated user's ID
    const { name, email, homecity, phone, profilePicture, workEmail } =
      req.body;

    // Validate at least one field is provided (including empty strings which means clearing the field)
    if (
      name === undefined &&
      email === undefined &&
      homecity === undefined &&
      phone === undefined &&
      profilePicture === undefined &&
      workEmail === undefined
    ) {
      return next(
        new ErrorHandler("At least one field to update is required", 400)
      );
    }

    // Predefined profile picture options
    const validProfilePics = [
      "profile-1",
      "profile-2",
      "profile-3",
      "profile-4",
      "profile-5",
      "profile-6",
    ];

    // Build update object with validation
    const updateData = {};
    const errors = [];

    // Profile Picture Validation
    if (profilePicture !== undefined) {
      if (profilePicture === "") {
        // Empty string means user wants to remove profile picture
        updateData.profilePicture = null;
      } else if (!validProfilePics.includes(profilePicture)) {
        errors.push("Invalid profile picture selection");
      } else {
        updateData.profilePicture = profilePicture;
      }
    }

    // Name Validation
    if (name !== undefined) {
      if (name === "") {
        errors.push("Name cannot be empty");
      } else if (!isValidName(name)) {
        errors.push("Invalid name format");
      } else {
        updateData.name = name;
      }
    }

    // Email Validation
    if (email !== undefined) {
      if (email === "") {
        errors.push("Email cannot be empty");
      } else if (!isValidEmail(email)) {
        errors.push("Invalid email format");
      } else {
        // Check email uniqueness
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser && existingUser._id.toString() !== userId) {
          errors.push("Email is already in use");
        } else {
          updateData.email = email.toLowerCase();
        }
      }
    }

    // Work Email Validation
    if (workEmail !== undefined) {
      if (workEmail === "") {
        // Empty string means user wants to remove work email
        updateData.workEmail = null;
      } else if (!isValidEmail(workEmail)) {
        errors.push("Invalid work email format");
      } else {
        // Check work email uniqueness
        const existingUser = await User.findOne({
          workEmail: workEmail.toLowerCase(),
        });
        if (existingUser && existingUser._id.toString() !== userId) {
          errors.push("Work email is already in use");
        } else {
          updateData.workEmail = workEmail.toLowerCase();
        }
      }
    }

    // Homecity Update
    if (homecity !== undefined) {
      if (homecity === "") {
        // Empty string means user wants to remove homecity
        updateData.homecity = null;
      } else {
        updateData.homecity = homecity;
      }
    }

    // Phone Validation
    if (phone !== undefined) {
      if (phone === "") {
        errors.push("Phone number cannot be empty");
      } else if (!isValidPhoneNumber(phone)) {
        errors.push("Invalid phone number");
      } else {
        updateData.phone = phone;
      }
    }

    // Return all validation errors at once
    if (errors.length > 0) {
      return next(new ErrorHandler(errors.join(". "), 400));
    }

    // Check if any valid fields to update
    if (Object.keys(updateData).length === 0) {
      return next(new ErrorHandler("No valid fields to update", 400));
    }

    // Perform update
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select(
      "-password -resetPasswordToken -resetPasswordExpire -verificationCode -verificationCodeExpire"
    );

    if (!updatedUser) {
      return next(new ErrorHandler("User not found", 404));
    }

    res.status(200).json({
      success: true,
      user: updatedUser,
      message: "User updated successfully.",
    });
  } catch (error) {
    logger.error("Error in updateUser:", error);
    next(new ErrorHandler(`Internal Server Error. ${error.message}`, 500));
  }
});

export const deleteUser = catchAsyncError(async (req, res, next) => {
  try {
    const userId = req.user.id; // Authenticated user's ID
    const { password } = req.body;

    // Validate password presence
    if (!password) {
      return next(
        new ErrorHandler("Password is required for account deletion", 400)
      );
    }

    // Retrieve user with password selected
    const user = await User.findById(userId).select("+password +deleteRequest");

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    // Verify password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return next(new ErrorHandler("Incorrect password", 401));
    }

    // Check if deletion is already requested
    if (user.deleteRequest) {
      return next(new ErrorHandler("Deletion request already submitted", 400));
    }

    // Update deletion request fields
    await User.findByIdAndUpdate(userId, {
      deleteRequest: true,
      deleteRequestedAt: new Date(),
    });

    // Clear sensitive data before response
    user.password = undefined;

    // send a confirmation email
    const { subject, message } = accountDeletionEmailTemplate(user);

    await sendEmail({
      email: user.email,
      subject,
      message,
    });

    res
      .status(200)
      .cookie("userToken", "", {
        expires: new Date(Date.now()),
        httpOnly: true,
      })
      .json({
        success: true,
        message:
          "Account deletion requested. Your account will be permanently deleted after 30 days. If you change your mind, please contact support within 48 hours.",
      });
  } catch (error) {
    logger.error("Error in deleteUser:", error);
    next(
      new ErrorHandler(
        "Error occurred while processing deletion request:" + error.message,
        500
      )
    );
  }
});

// Controller function
export const recoverUser = catchAsyncError(async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    // Validate input presence
    if (!phone || !password) {
      return next(
        new ErrorHandler("Phone Number and password are required.", 400)
      );
    }

    // Validate phone number format
    if (!isValidPhoneNumber(phone)) {
      return next(new ErrorHandler("Invalid phone number format.", 400));
    }

    // Find user with deletion request fields
    const user = await User.findOne({
      phone,
      accountVerified: true,
      deleteRequest: true, // Only accounts with pending deletion
    }).select("+password +deleteRequestedAt");

    // User not found or not eligible for recovery
    if (!user) {
      return next(
        new ErrorHandler("Account not found or not eligible for recovery", 404)
      );
    }

    // Verify password
    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched) {
      return next(new ErrorHandler("Invalid credentials", 401));
    }

    // Check if within 72-hour recovery window
    const now = Date.now();
    const deletionRequestedAt = user.deleteRequestedAt.getTime();
    const recoveryWindow = 72 * 60 * 60 * 1000; // 72 hours in ms

    if (now - deletionRequestedAt > recoveryWindow) {
      return next(
        new ErrorHandler(
          "Recovery window expired. Please contact support for assistance.",
          403
        )
      );
    }

    // Reset deletion request
    await User.findByIdAndUpdate(user._id, {
      deleteRequest: false,
      deleteRequestedAt: null,
    });

    // Send recovery confirmation email
    const { subject, message } = accountRecoverySuccessTemplate(user);

    await sendEmail({
      email: user.email,
      subject,
      message,
    });

    res.status(200).json({
      success: true,
      message:
        "Account recovered successfully. Please login to access your account.",
    });
  } catch (error) {
    logger.error("Account recovery error:", error);
    next(
      new ErrorHandler(
        "Account recovery failed. Please try again. " + error.message,
        500
      )
    );
  }
});
