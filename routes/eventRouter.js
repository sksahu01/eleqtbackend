import express from "express";
import { isAdmin, isAuthenticated } from "../middleware/auth.js";
import {
  createEvent,
  getAllEvents,
  getEventById,
  updateEventStatus,
  deleteOldEvents,
  deleteEventById,
} from "../controllers/eventControler.js";

const eventRouter = express.Router();

// event creation route
eventRouter.post("/", isAuthenticated, createEvent);

// event management routes
eventRouter.get("/", isAdmin, getAllEvents);
eventRouter.get("/:id", isAdmin, getEventById);
eventRouter.put("/:id", isAdmin, updateEventStatus);
eventRouter.delete("/:id", isAdmin, deleteEventById);
eventRouter.delete("/cleanup", isAdmin, deleteOldEvents);

export default eventRouter;
