import { pinoHttp } from "pino-http";
import logger from "../config/logger.js";
import { v4 } from "uuid";

export default pinoHttp({
  logger,
  genReqId: () => v4(),
  redact: {
    paths: ["req.headers.cookie", "res.headers.set-cookie"],
    censor: "[REDACTED]",
  },
  customProps: (req, _) => {
    return { requestId: req.id };
  },
});
