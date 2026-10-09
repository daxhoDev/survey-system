// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/config/env";
import "@/styles/global.css";
import { initTheme } from "@/lib/theme";
import App from "@/App.tsx";

initTheme();

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
  <App />,
  // </StrictMode>,
);
