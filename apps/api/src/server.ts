import "./lib/zod-setup.js";
import app from "./app.js";
import logger from "./config/logger.js";

const port = process.env.PORT || 3000;

app.listen(port, () => {
  if (process.env.NODE_ENV === "development") {
    logger.info(`Server is running on http://localhost:${port}`);
  }
  if (process.env.NODE_ENV === "production") {
    logger.info("Production server started");
  }
});
