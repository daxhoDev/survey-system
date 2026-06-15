export default class AppError extends Error {
  // constructor(message: string, statusCode: number) {
  //   super(message);
  //   this.statusCode = statusCode;
  //   this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
  //   this.isOperational = true;
  //   Error.captureStackTrace(this, this.constructor);
  // }
  // statusCode: number;
  // status: "fail" | "error";
  // isOperational: boolean;
  constructor(
    title: string,
    detail: string,
    status: number,
    extensions?: Object,
  ) {
    super();
    this.type = "about:blank";
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.extensions = extensions;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
  type: string;
  status: number;
  title: string;
  detail: string;
  extensions: Object | undefined;
  isOperational: boolean;
}
