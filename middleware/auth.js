import { catchAsyncError } from "./catchAsyncError.js";
import ErrorHandler from "./error.js";
import jwt from "jsonwebtoken";
import { User } from "../models/userModel.js";
import { Admin } from "../models/adminModel.js";

export const isAuthenticated = catchAsyncError(async (req, res, next) => {
  const { userToken } = req.cookies;
  if (!userToken) {
    return next(new ErrorHandler("User is not authenticated.", 400));
  }
  const decoded = jwt.verify(userToken, process.env.JWT_SECRET_KEY);

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new ErrorHandler("User not found.", 404));
  }
  if (user.deleteRequest) {
    return next(
      new ErrorHandler("User account has been marked for deletion.", 403)
    );
  }
  req.user = user;

  next();
});

export const isAdmin = catchAsyncError(async (req, res, next) => {
  const { adminToken } = req.cookies;
  if (!adminToken) {
    return next(
      new ErrorHandler(
        "Access denied! If you are an admin, please log in.",
        400
      )
    );
  }
  const decoded = jwt.verify(adminToken, process.env.JWT_SECRET_KEY);

  req.admin = await Admin.findById(decoded.id);

  next();
});

export const isSuperAdmin = catchAsyncError(async (req, res, next) => {
  const { adminToken } = req.cookies;
  if (!adminToken) {
    return next(
      new ErrorHandler(
        "Access denied! If you are a super admin, please log in.",
        400
      )
    );
  }
  const decoded = jwt.verify(adminToken, process.env.JWT_SECRET_KEY);

  const admin = await Admin.findById(decoded.id);

  if (admin.role !== "superadmin") {
    return next(
      new ErrorHandler("Access denied! You are not a super admin.", 403)
    );
  }

  req.superAdmin = admin;

  next();
});
