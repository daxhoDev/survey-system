import { env } from "./config/env.js";
import "./lib/zod-setup.js";
import app from "./app.js";
import logger from "./config/logger.js";

app.listen(env.PORT, () => {
  if (env.NODE_ENV === "development") {
    logger.info(`Server is running on http://localhost:${env.PORT}`);
  } else {
    logger.info("Production server started");
  }
});
