import { AsyncLocalStorage } from "async_hooks";
import type { RequestContext } from "../types.js";
import logger from "../config/logger.js";

const requestContext = new AsyncLocalStorage<RequestContext>();
function getLogger() {
  return requestContext.getStore()?.logger ?? logger;
}

export { requestContext, getLogger };
