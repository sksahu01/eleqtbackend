import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    organizerName: {
      type: String,
      required: [true, "Organizer name is required"],
      trim: true,
    },
    organizerPhone: {
      type: String,
      required: [true, "Organizer phone is required"],
    },
    eventType: {
      type: String,
      required: [true, "Event type is required"],
      enum: {
        values: [
          "corporate event",
          "concert/exhibition",
          "conference",
          "wedding",
          "other",
        ],
        message:
          "Invalid event type. Valid options: corporate event, concert, exhibition, conference, wedding, other",
      },
    },
    desc: {
      type: String,
      required: [true, "Description is required"],
      minlength: [50, "Description must be at least 50 characters"],
      maxlength: [500, "Description cannot exceed 500 characters"],
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "contacted",
        "completed",
      ],
      default: "pending",
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        ret.createdAt = ret.createdAt.toISOString();
        ret.updatedAt = ret.updatedAt.toISOString();
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Status management methods
eventSchema.methods.getStatus = function () {
  return this.status;
};

eventSchema.methods.updateStatus = function (newStatus) {
  if (!this.schema.path("status").enumValues.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }
  this.status = newStatus;
  return this.save();
};

// Custom method for contact request
eventSchema.methods.requestContact = function () {
  if (this.status !== "contacted") {
    this.status = "contacted";
    return this.save();
  }
  return Promise.resolve(this);
};

// Add virtual for event duration (if needed later)
eventSchema.virtual("duration").get(function () {
  // Implementation would extract from desc
  return "N/A";
});

export const Event = mongoose.model("Event", eventSchema);
