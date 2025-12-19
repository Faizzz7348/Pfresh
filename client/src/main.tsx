import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "leaflet/dist/leaflet.css";
import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import { registerServiceWorker, setupPWAInstall } from "./lib/pwa";
import { prefetchCommonData } from "./lib/queryClient";
import { ErrorBoundary } from "./components/error-boundary";

// Register Service Worker for PWA
registerServiceWorker();

// Setup PWA install prompt
setupPWAInstall();

// Prefetch common data for faster initial load
prefetchCommonData();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
