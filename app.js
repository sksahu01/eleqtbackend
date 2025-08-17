import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { removeUnverifiedAccounts } from "./automation/removeUnverifiedAccounts.js";
import { connection } from "./database/dbConnection.js";
import { errorMiddleware } from "./middleware/error.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { unknownEndpoint } from "./middleware/unknownEndpoint.js";
import userRouter from "./routes/userRouter.js";
import config from "./utils/config.js";
import bookingRouter from "./routes/bookingRouter.js";
import adminRouter from "./routes/adminRouter.js";
import { logger } from "./utils/logger.js";
import eventRouter from "./routes/eventRouter.js";

export const app = express();

if (process.env.NODE_ENV === "development") {
  logger.info("Development mode");
  app.use(
    cors({
      origin: true,
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    })
  );
}


if (process.env.NODE_ENV === "production") {
  logger.info("Production mode");
  app.use(
    cors({
      origin: [
        config.FRONTEND_URL,
        'http://localhost:3000',
        'http://localhost:3001',
        'https://your-frontend-domain.com', // Add your frontend domain when deployed
        /\.eleqt\.in$/, // Allow any subdomain of eleqt.in
        /^http:\/\/10\.0\.2\.2:/, // Allow Android emulator
        /^http:\/\/localhost:/, // Allow localhost for development
      ],
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
      optionsSuccessStatus: 200, // For legacy browser support
    })
  );
}

// app.use(express.static("dist"));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(requestLogger);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Luxcent Backend",
  });
});

// routers
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/events", eventRouter);
app.use("/api/v1/bookings", bookingRouter);

// Schedule the cron job to remove unverified accounts every 30 minutes
removeUnverifiedAccounts();
// connection with database
connection();
// initializing the logger
logger.initializeLogger();

app.use(unknownEndpoint);
// use it at very end
app.use(errorMiddleware);
