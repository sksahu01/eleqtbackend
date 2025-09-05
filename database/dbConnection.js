import mongoose from "mongoose";
import { logger } from "../utils/logger.js";
import config from "../utils/config.js";

export const connection = () => {
  mongoose
    .connect(config.MONGO_URI, {
      dbName: "UserManagement",
    })
    .then(() => {
      logger.info("Connected to database");
    })
    .catch((err) => {
      logger.error(`Some error occured while connecting to database: ${err}`);
    });
};
