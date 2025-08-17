import express from "express";
import {
  forgotPassword,
  getUser,
  login,
  logout,
  register,
  resetPassword,
  verifyOTP,
  updateUser,
  deleteUser,
  recoverUser,
} from "../controllers/userController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// Route for user registration
router.post("/register", register);
router.post("/otp-verify", verifyOTP);
router.post("/login", login);
router.get("/logout", isAuthenticated, logout);
router.get("/me", isAuthenticated, getUser);
router.post("/password/forgot", forgotPassword);
router.put("/password/reset/:token", resetPassword);
router.put("/me/update", isAuthenticated, updateUser);
router.delete("/me", isAuthenticated, deleteUser);
router.put("/me/recover", recoverUser);

export default router;
