import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initWebVitals } from "./utils/webVitals";

// Initialize Web Vitals tracking
initWebVitals();

createRoot(document.getElementById("root")!).render(<App />);
