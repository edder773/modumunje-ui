import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "../original/design-system-base.css";
import "./demo.css";

const root = document.getElementById("root");
if (!root) throw new Error("Demo root is missing");
createRoot(root).render(<StrictMode><App /></StrictMode>);
