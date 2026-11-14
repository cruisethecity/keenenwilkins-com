import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Self hosted variable Inter. Loading it from the bundle rather than Google
// Fonts keeps the Content Security Policy tight, removes a third party DNS
// lookup from the critical path, and means the headline never renders in a
// fallback face first.
//
// The opsz build carries Inter's optical size axis as well as weight. From
// 32px up the browser switches to the Display cut by itself, which is the
// same split Apple makes between SF Pro Text and SF Pro Display, and it is
// why the headlines no longer need heavy negative tracking to look set.
import "@fontsource-variable/inter/opsz.css";

import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
