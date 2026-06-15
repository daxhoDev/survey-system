import "./lib/zod-setup.js";
import app from "./app.js";

const port = process.env.PORT || 3000;

app.listen(port, () => {
  if (process.env.NODE_ENV === "development") {
    console.log(`Server is running on http://localhost:${port}`);
  }
  if (process.env.NODE_ENV === "production") {
    console.log("Production server started");
  }
});
