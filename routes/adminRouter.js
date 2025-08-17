import express from "express";
import {
  createAdmin,
  deleteAdmin,
  deleteUsers,
  getAdminProfile,
  getAdminProfileById,
  getAllAdmins,
  getUserById,
  getUsers,
  loginAdmin,
  logoutAdmin,
  recoverUser,
  deleteUserById,
} from "../controllers/adminControler.js";
import { isAdmin, isSuperAdmin } from "../middleware/auth.js";

const adminRouter = express.Router();

// User Management Routes
// These routes are accessible by any admin
adminRouter.get("/get/users", isAdmin, getUsers);
adminRouter.get("/get/users/:id", isAdmin, getUserById);
adminRouter.put("/recover/users/:id", isAdmin, recoverUser);
adminRouter.delete("/delete/users", isAdmin, deleteUsers);
adminRouter.delete("/delete/users/:id", isAdmin, deleteUserById);

// admin personal routes
adminRouter.post("/login", loginAdmin);
adminRouter.get("/logout", isAdmin, logoutAdmin);
adminRouter.get("/me", isAdmin, getAdminProfile);

// Routes only accessible by superadmin
// admin can only be created by superadmin
adminRouter.post("/add", isSuperAdmin, createAdmin);
// only superadmin can see all admins
adminRouter.get("/get-all-admins", isSuperAdmin, getAllAdmins);
adminRouter.get("/:id", isSuperAdmin, getAdminProfileById);
// and superadmin can delete any admin
adminRouter.delete("/:id", isSuperAdmin, deleteAdmin);

export default adminRouter;
