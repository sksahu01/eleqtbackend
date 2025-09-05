import { logger } from "../utils/logger.js";

export const requestLogger = (request, response, next) => {
  logger.info("Method:", request.method);
  logger.info("Path:", request.path);
  logger.info("Body:", request.body);
  logger.info("---------------------------");
  next();
};
