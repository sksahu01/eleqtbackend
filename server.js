import { app } from "./app.js";
import config from "./utils/config.js";
import { logger } from "./utils/logger.js";

app.listen(config.PORT || 3000, () => {
  logger.info(`Server is running on port ${process.env.PORT || 3000}`);
  logger.info(`Frontend URL: ${process.env.FRONTEND_URL || "Not set"}`);
});
