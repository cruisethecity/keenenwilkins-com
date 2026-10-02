import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Self hosted variable Inter. Loading it from the bundle rather than Google
// Fonts keeps the Content Security Policy tight, removes a third party DNS
// lookup from the critical path, and means the headline never renders in a
// fallback face first.
import "@fontsource-variable/inter";

import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
