import { Admin } from "../models/adminModel.js";
import { catchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../middleware/error.js";
import { isValidCompanyEmail, isValidName } from "../utils/validation.js";
import { generateRandomPassword } from "../utils/password.js";
import {
  accountRecoverySuccessTemplate,
  adminWelcomeEmailTemplate,
} from "../utils/emailTemplates.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendTokenAdmin } from "../utils/sendToken.js";
import { User } from "../models/userModel.js";
import { logger } from "../utils/logger.js";

export const createAdmin = catchAsyncError(async (req, res, next) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return next(new ErrorHandler("Please provide all required fields.", 400));
    }

    if (!isValidName(name)) {
      return next(new ErrorHandler("Invalid name format.", 400));
    }
    if (!isValidCompanyEmail(email, "@gmail.com")) {
      return next(new ErrorHandler("Invalid company email format.", 400));
    }

    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      return next(
        new ErrorHandler("Admin with this email already exists.", 400)
      );
    }

    const password = await generateRandomPassword(12);

    const admin = await Admin.create({
      name,
      email,
      password,
    });

    if (!admin) {
      return next(new ErrorHandler("Failed to create admin. DB error", 500));
    }

    // Send welcome email with password
    const { subject, message } = adminWelcomeEmailTemplate({
      name: admin.name,
      email: admin.email,
      password,
    });

    await sendEmail({
      email: admin.email,
      subject,
      message,
    });

    res.status(201).json({
      success: true,
      message: "Admin created successfully. Credentials sent to the email.",
      admin,
    });
  } catch (error) {
    return next(
      new ErrorHandler("Failed to create admin." + error.message, 500)
    );
  }
});

export const getAllAdmins = catchAsyncError(async (req, res, next) => {
  try {
    // Fetch all admins
    const admins = await Admin.find().select("_id name email role");

    if (!admins || admins.length === 0) {
      return next(new ErrorHandler("No admins found.", 404));
    }

    res.status(200).json({
      success: true,
      message: "All admins fetched successfully.",
      admins,
    });
  } catch (error) {
    return next(
      new ErrorHandler("Failed to fetch all admins." + error.message, 500)
    );
  }
});

export const loginAdmin = catchAsyncError(async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ErrorHandler("Please provide email and password.", 400));
    }

    if (!isValidCompanyEmail(email, "@gmail.com")) {
      return next(new ErrorHandler("Invalid company email format.", 400));
    }

    const admin = await Admin.findOne({ email }).select("+password");

    if (!admin) {
      return next(new ErrorHandler("Invalid email or password.", 401));
    }

    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      return next(new ErrorHandler("Invalid email or password.", 401));
    }

    sendTokenAdmin(admin, 200, "Admin logged in successfully.", res);
  } catch (error) {
    return next(
      new ErrorHandler("Failed to login admin." + error.message, 500)
    );
  }
});

export const logoutAdmin = catchAsyncError(async (req, res, next) => {
  try {
    res
      .status(200)
      .cookie("adminToken", "", {
        expires: new Date(Date.now()),
        httpOnly: true,
      })
      .json({
        success: true,
        message: "Admin Logged out successfully.",
      });
  } catch (error) {
    return next(
      new ErrorHandler("Failed to logout admin." + error.message, 500)
    );
  }
});

export const getAdminProfile = catchAsyncError(async (req, res, next) => {
  try {
    const admin = req.admin;
    res.status(200).json({
      success: true,
      admin,
      message: "Admin profile fetched successfully.",
    });
  } catch (error) {
    return next(
      new ErrorHandler("Failed to fetch admin profile." + error.message, 500)
    );
  }
});

export const getAdminProfileById = catchAsyncError(async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id);

    if (!admin) {
      return next(new ErrorHandler("Admin not found.", 404));
    }

    res.status(200).json({
      success: true,
      admin,
      message: "Admin profile fetched successfully.",
    });
  } catch (error) {
    return next(
      new ErrorHandler(
        "Failed to fetch admin profile by ID." + error.message,
        500
      )
    );
  }
});

// export const deleteAdmin = catchAsyncError(async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const { password } = req.body;

//     if (!id) {
//       return next(new ErrorHandler("Admin ID is required.", 400));
//     }
//     if (!password) {
//       return next(
//         new ErrorHandler("Please provide Super Admin password.", 400)
//       );
//     }

//     const superAdmin = await Admin.findById(req.superAdmin._id).select(
//       "+password"
//     );

//     const isMatch = await superAdmin.comparePassword(password);

//     if (!isMatch) {
//       return next(new ErrorHandler("Invalid Credentials.", 401));
//     }

//     const admin = await Admin.findByIdAndDelete(id);

//     if (!admin) {
//       return next(new ErrorHandler("Admin not found.", 404));
//     }

//     res.status(200).json({
//       success: true,
//       message: "Admin deleted successfully.",
//       admin,
//     });
//   } catch (error) {
//     return next(
//       new ErrorHandler("Failed to delete admin." + error.message, 500)
//     );
//   }
// });

// user management controller functions can be added here............

export const deleteAdmin = catchAsyncError(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    // Input validation
    if (!id) {
      return next(new ErrorHandler("Admin ID is required.", 400));
    }
    if (!password) {
      return next(
        new ErrorHandler(
          "Super Admin password is required for this action.",
          400
        )
      );
    }

    // Get superadmin with password
    const superAdmin = await Admin.findById(req.superAdmin._id).select(
      "+password"
    );
    if (!superAdmin) {
      return next(new ErrorHandler("Super Admin not found.", 404));
    }

    // Verify password
    const isMatch = await superAdmin.comparePassword(password);
    if (!isMatch) {
      return next(
        new ErrorHandler("Invalid credentials. Please try again.", 401)
      );
    }

    // Find admin to delete
    const adminToDelete = await Admin.findById(id);
    if (!adminToDelete) {
      return next(new ErrorHandler("Admin not found.", 404));
    }

    // Prevent self-deletion
    if (adminToDelete._id.toString() === superAdmin._id.toString()) {
      return next(new ErrorHandler("Cannot delete your own account.", 403));
    }

    // Create audit log before deletion
    const auditEntry = {
      action: "ADMIN_DELETED",
      superAdminId: superAdmin._id.toString(),
      superAdminEmail: superAdmin.email,
      deletedAdminId: adminToDelete._id.toString(),
      deletedAdminEmail: adminToDelete.email,
      deletedAdminRole: adminToDelete.role,
      deletionTime: new Date().toISOString(),
    };

    // Perform deletion
    await Admin.findByIdAndDelete(id);

    // Log the action (fire-and-forget with error handling)
    logger
      .logAudit([auditEntry])
      .catch((err) =>
        logger.error(`Audit log failed for admin deletion ${id}:`, err)
      );

    res.status(200).json({
      success: true,
      message: "Admin deleted successfully.",
      deletedAdminId: adminToDelete._id,
      deletedAdminEmail: adminToDelete.email,
      deletedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Admin deletion error: ${error.message}`, {
      params: req.params,
      superAdmin: req.superAdmin?._id,
    });

    return next(
      new ErrorHandler("Failed to delete admin: " + error.message, 500)
    );
  }
});

export const getUsers = catchAsyncError(async (req, res, next) => {
  try {
    // Extract query parameters
    const {
      name,
      email,
      phone,
      homecity,
      sort,
      page,
      limit,
      accountVerified,
      deleteRequest,
      profilePicture,
      createdAtStart,
      createdAtEnd,
      deleteRequestedAtStart,
      deleteRequestedAtEnd,
    } = req.query;

    // Build filter object with accountVerified default
    const filter = { accountVerified: accountVerified !== "false" };

    // Text-based filters
    if (name) filter.name = { $regex: name, $options: "i" };
    if (email) filter.email = { $regex: email, $options: "i" };
    if (phone) filter.phone = { $regex: phone, $options: "i" };
    if (homecity) filter.homecity = { $regex: homecity, $options: "i" };
    if (profilePicture) filter.profilePicture = profilePicture;

    // Boolean filters
    if (deleteRequest !== undefined)
      filter.deleteRequest = deleteRequest === "true";

    // Date range filters
    if (createdAtStart || createdAtEnd) {
      filter.createdAt = {};
      if (createdAtStart) filter.createdAt.$gte = new Date(createdAtStart);
      if (createdAtEnd) filter.createdAt.$lte = new Date(createdAtEnd);
    }

    if (deleteRequestedAtStart || deleteRequestedAtEnd) {
      filter.deleteRequestedAt = {};
      if (deleteRequestedAtStart)
        filter.deleteRequestedAt.$gte = new Date(deleteRequestedAtStart);
      if (deleteRequestedAtEnd)
        filter.deleteRequestedAt.$lte = new Date(deleteRequestedAtEnd);
    }

    // Sort options
    let sortOptions = { createdAt: -1 }; // Default: newest first
    if (sort) {
      sortOptions = {};
      const sortFields = sort.split(",");
      for (const field of sortFields) {
        const sortOrder = field.startsWith("-") ? -1 : 1;
        const fieldName = field.replace(/^-/, "");

        // Validate sortable fields
        const validFields = [
          "name",
          "email",
          "phone",
          "homecity",
          "createdAt",
          "updatedAt",
          "deleteRequestedAt",
        ];

        if (validFields.includes(fieldName)) {
          sortOptions[fieldName] = sortOrder;
        }
      }
    }

    // Pagination
    const pageNumber = parseInt(page) || 1;
    const pageSize = Math.min(parseInt(limit) || 10, 100); // Max 100 per page
    const skip = (pageNumber - 1) * pageSize;

    // Execute query
    const users = await User.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize);

    // Get total count
    const totalUsers = await User.countDocuments(filter);

    if (!users || users.length === 0) {
      return next(
        new ErrorHandler("No users found matching your criteria.", 404)
      );
    }

    res.status(200).json({
      success: true,
      message: "Users fetched successfully.",
      users,
      pagination: {
        page: pageNumber,
        pageSize,
        totalPages: Math.ceil(totalUsers / pageSize),
        totalCount: totalUsers,
      },
    });
  } catch (error) {
    return next(
      new ErrorHandler(`Failed to fetch users: ${error.message}`, 500)
    );
  }
});

export const getUserById = catchAsyncError(async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new ErrorHandler("User ID is required.", 400));
    }

    const user = await User.findById(id);

    if (!user) {
      return next(new ErrorHandler("User not found.", 404));
    }

    res.status(200).json({
      success: true,
      message: "User fetched successfully.",
      user,
    });
  } catch (error) {
    return next(
      new ErrorHandler(`Failed to fetch user by ID: ${error.message}`, 500)
    );
  }
});

export const recoverUser = catchAsyncError(async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new ErrorHandler("User ID is required.", 400));
    }

    const user = await User.findById(id);

    if (!user) {
      return next(new ErrorHandler("User not found.", 404));
    }
    if (!user.deleteRequest) {
      return next(
        new ErrorHandler("User is not in delete request state.", 400)
      );
    }

    // Update user status to active
    const updatedUser = await User.findByIdAndUpdate(id, {
      deleteRequest: false,
      deleteRequestedAt: null,
    });

    // Send recovery email or perform other actions as needed
    const { subject, message } = accountRecoverySuccessTemplate(user);

    await sendEmail({
      email: user.email,
      subject,
      message,
    });

    res.status(200).json({
      success: true,
      message: "User recovered successfully.",
      user: updatedUser,
    });
  } catch (error) {
    return next(
      new ErrorHandler(`Failed to recover user: ${error.message}`, 500)
    );
  }
});

export const deleteUsers = catchAsyncError(async (req, res, next) => {
  try {
    if (!req.admin.permissions.deleteUsers) {
      return next(
        new ErrorHandler("You don't have permission to delete users", 403)
      );
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usersToDelete = await User.find({
      deleteRequest: true,
      deleteRequestedAt: { $lte: thirtyDaysAgo },
    });

    if (usersToDelete.length === 0) {
      return next(
        new ErrorHandler(
          "No users with deletion requests older than 30 days found",
          404
        )
      );
    }

    const userIds = usersToDelete.map((u) => u._id);

    // Prepare audit logs
    const auditEntries = usersToDelete.map((user) => ({
      action: "ACCOUNT_DELETED",
      adminId: req.admin._id.toString(),
      userId: user._id.toString(),
      details: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        deleteRequestedAt: user.deleteRequestedAt.toISOString(),
      },
    }));

    // Log to file (fire-and-forget, won't block deletion)
    await logger.logAudit(auditEntries);

    // Perform deletion
    const result = await User.deleteMany({ _id: { $in: userIds } });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} user accounts permanently deleted`,
      deletedCount: result.deletedCount,
      deletionThreshold: thirtyDaysAgo.toISOString(),
    });
  } catch (error) {
    console.error("Error deleting users:", error);
    next(new ErrorHandler("Failed to delete users: " + error.message, 500));
  }
});

export const deleteUserById = catchAsyncError(async (req, res, next) => {
  try {
    // Permission check
    if (!req.admin?.permissions?.deleteUsers) {
      return next(new ErrorHandler("Missing delete permissions", 403));
    }

    // Find user
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    // Validate deletion eligibility
    if (!user.deleteRequest) {
      return next(new ErrorHandler("User hasn't requested deletion", 400));
    }

    // Calculate 30-day window
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 30);

    if (user.deleteRequestedAt > thresholdDate) {
      const daysLeft = Math.ceil(
        (user.deleteRequestedAt - thresholdDate) / (86400 * 1000)
      );
      return next(
        new ErrorHandler(`Deletion permitted in ${daysLeft} days`, 400)
      );
    }

    // Prepare audit log
    const auditEntry = {
      action: "ACCOUNT_DELETED",
      adminId: req.admin._id.toString(),
      userId: user._id.toString(),
      details: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        deleteRequestedAt: user.deleteRequestedAt.toISOString(),
      },
    };

    // Attempt audit log (fire-and-forget)
    logger
      .logAudit([auditEntry])
      .catch((err) => logger.error("Async audit log failed:", err));

    // Perform deletion
    await User.deleteOne({ _id: user._id });

    res.status(200).json({
      success: true,
      message: `Deleted user: ${user.email}`,
      userId: user._id,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error(`User deletion failed: ${req.params.id}`, err);
    next(
      new ErrorHandler(`Deletion error: ${err.message || "Unknown error"}`, 500)
    );
  }
});
