import mongoose from "mongoose";
import { catchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../middleware/error.js";
import { Event } from "../models/eventModel.js";
import { eventRegistrationEmailTemplate } from "../utils/emailTemplates.js";
import { sendEmail } from "../utils/sendEmail.js";
import { isValidName, isValidPhoneNumber } from "../utils/validation.js";
import { logger } from "../utils/logger.js";

// Create a new event
export const createEvent = catchAsyncError(async (req, res, next) => {
  try {
    const { organizerName, organizerPhone, eventType, desc } = req.body;

    if (!organizerName || !organizerPhone || !eventType || !desc) {
      return next(new ErrorHandler("All fields are required.", 400));
    }

    if (!isValidName(organizerName)) {
      return next(new ErrorHandler("Invalid organizer name format.", 400));
    }
    if (!isValidPhoneNumber(organizerPhone)) {
      return next(
        new ErrorHandler(
          "Invalid phone number format. Expected format: +91XXXXXXXXXX",
          400
        )
      );
    }

    const event = await Event.create({
      userId: req.user.id,
      organizerName,
      organizerPhone,
      eventType,
      desc,
    });

    //   send mail
    const { subject, message } = eventRegistrationEmailTemplate(
      req.user,
      event
    );
    await sendEmail({ email: req.user.email, subject, message });

    res.status(201).json({
      success: true,
      message: "Event created successfully. We will contact you soon.",
      event,
    });
  } catch (error) {
    return next(
      new ErrorHandler(
        "Failed to create event. Please try again." + error.message,
        500
      )
    );
  }
});

// Get all events (for admins) with filtering, sorting, and pagination
export const getAllEvents = catchAsyncError(async (req, res, next) => {
  try {
    const {
      organizerName,
      organizerPhone,
      eventType,
      status,
      userId,
      sort,
      page = 1, // Default values added
      limit = 10, // Default values added
    } = req.query;

    const filter = {};

    if (organizerName)
      filter.organizerName = { $regex: organizerName, $options: "i" };
    if (organizerPhone)
      filter.organizerPhone = { $regex: organizerPhone, $options: "i" };
    if (eventType) filter.eventType = eventType;
    if (userId) filter.userId = userId;
    if (status) filter.status = status;

    let sortOptions = { createdAt: -1 }; // Default sort
    if (sort) {
      sortOptions = {};
      const sortFields = sort.split(",");
      for (const field of sortFields) {
        const sortOrder = field.startsWith("-") ? -1 : 1;
        const fieldName = field.replace(/^-/, "");
        const validFields = [
          "organizerName",
          "eventType",
          "status",
          "createdAt",
          "updatedAt",
        ];
        if (validFields.includes(fieldName)) {
          sortOptions[fieldName] = sortOrder;
        }
      }
      // Add fallback if no valid sort fields were added
      if (Object.keys(sortOptions).length === 0) {
        sortOptions = { createdAt: -1 };
      }
    }

    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = Math.min(parseInt(limit, 10) || 10, 100);
    const skip = (pageNumber - 1) * pageSize;

    const [events, totalEvents] = await Promise.all([
      Event.find(filter)
        .populate("userId", "name email phone")
        .sort(sortOptions)
        .skip(skip)
        .limit(pageSize),
      Event.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: "Events fetched successfully.",
      count: events.length,
      totalEvents,
      totalPages: Math.ceil(totalEvents / pageSize),
      currentPage: pageNumber,
      events,
    });
  } catch (error) {
    return next(
      new ErrorHandler(
        "Failed to fetch events. Please try again." + error.message,
        500
      )
    );
  }
});

// Get a single event by ID (for admins)
export const getEventById = catchAsyncError(async (req, res, next) => {
  try {
    if (!req.params.id) {
      return next(new ErrorHandler("Event ID is required.", 400));
    }
    const { id } = req.params;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorHandler(`Invalid event ID format: ${id}`, 400));
    }

    const event = await Event.findById(id).populate(
      "userId",
      "name email phone"
    );

    if (!event) {
      return next(new ErrorHandler(`Event not found with ID: ${id}`, 404));
    }

    res.status(200).json({
      success: true,
      message: "Event fetched successfully.",
      event,
    });
  } catch (error) {
    return next(
      new ErrorHandler(
        "Failed to fetch event. Please try again." + error.message,
        500
      )
    );
  }
});

// Update an event (for admins)
export const updateEventStatus = catchAsyncError(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorHandler(`Invalid event ID format: ${id}`, 400));
    }

    // Check if status is provided
    if (!status) {
      return next(new ErrorHandler("Status is required for update", 400));
    }

    // Find event and update status
    const event = await Event.findById(id);

    if (!event) {
      return next(new ErrorHandler(`Event not found with ID: ${id}`, 404));
    }

    // Use the schema method to update status
    await event.updateStatus(status);

    // Fetch the updated document
    const updatedEvent = await Event.findById(id);

    res.status(200).json({
      success: true,
      message: "Event status updated successfully",
      event: updatedEvent,
    });
  } catch (error) {
    // Handle specific schema validation errors
    if (error.message.startsWith("Invalid status:")) {
      return next(new ErrorHandler(error.message, 400));
    }

    // Handle other errors
    return next(
      new ErrorHandler(`Failed to update event status: ${error.message}`, 500)
    );
  }
});

// Delete an event (for admins)
// Single event deletion with audit logging
export const deleteEventById = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

  // Validate ID format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler(`Invalid event ID format: ${id}`, 400));
  }

  try {
    const event = await Event.findById(id);

    if (!event) {
      return next(new ErrorHandler(`Event not found with ID: ${id}`, 404));
    }

    // Check deletion eligibility
    const eligibleStatuses = ["rejected", "cancelled", "completed"];
    const isEligible =
      eligibleStatuses.includes(event.status) &&
      event.updatedAt <= thirtyDaysAgo;

    if (!isEligible) {
      const errorMsg =
        `Event not eligible for deletion. ` +
        `Must be in rejected/cancelled/completed status and last updated 30+ days ago.`;
      return next(new ErrorHandler(errorMsg, 400));
    }

    // Create audit log before deletion
    const auditEntry = {
      action: "EVENT_DELETED",
      adminId: req.admin._id.toString(),
      adminEmail: req.admin.email,
      eventId: event._id.toString(),
      organizerName: event.organizerName,
      organizerPhone: event.organizerPhone,
      eventType: event.eventType,
      originalStatus: event.status,
      deletionTime: new Date().toISOString(),
    };

    // Perform deletion
    await Event.findByIdAndDelete(id);

    // Log the action (fire-and-forget with error handling)
    logger
      .logAudit([auditEntry])
      .catch((err) =>
        logger.error(`Audit log failed for event deletion ${id}:`, err)
      );

    return res.status(200).json({
      success: true,
      message: `Event deleted successfully`,
      deletedEvent: { id: event._id, name: event.organizerName },
    });
  } catch (error) {
    return next(
      new ErrorHandler(`Failed to delete event: ${error.message}`, 500)
    );
  }
});

// Bulk deletion of old events with audit logging
export const deleteOldEvents = catchAsyncError(async (req, res, next) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

  try {
    // First fetch eligible events to log details
    const eventsToDelete = await Event.find({
      status: { $in: ["rejected", "cancelled", "completed"] },
      updatedAt: { $lte: thirtyDaysAgo },
    }).lean();

    if (eventsToDelete.length === 0) {
      return next(
        new ErrorHandler("No eligible events found for deletion", 404)
      );
    }

    // Prepare audit entries
    const auditEntries = eventsToDelete.map((event) => ({
      action: "BULK_EVENT_DELETED",
      adminId: req.admin._id.toString(),
      adminEmail: req.admin.email,
      eventId: event._id.toString(),
      organizerName: event.organizerName,
      eventType: event.eventType,
      originalStatus: event.status,
      lastUpdated: event.updatedAt.toISOString(),
      deletionTime: new Date().toISOString(),
    }));

    // Add summary entry
    auditEntries.push({
      action: "BULK_DELETE_SUMMARY",
      adminId: req.admin._id.toString(),
      adminEmail: req.admin.email,
      totalDeleted: eventsToDelete.length,
      deletionCriteria: {
        statuses: ["rejected", "cancelled", "completed"],
        maxUpdateDate: thirtyDaysAgo.toISOString(),
      },
      deletionTime: new Date().toISOString(),
    });

    // Perform bulk deletion
    const result = await Event.deleteMany({
      _id: { $in: eventsToDelete.map((e) => e._id) },
    });

    // Log all audit entries
    logger
      .logAudit(auditEntries)
      .catch((err) => logger.error("Bulk event audit logging failed:", err));

    return res.status(200).json({
      success: true,
      message: `${result.deletedCount} events deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return next(
      new ErrorHandler(`Bulk deletion failed: ${error.message}`, 500)
    );
  }
});
