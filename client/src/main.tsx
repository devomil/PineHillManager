import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("Main.tsx loading...");

const rootElement = document.getElementById("root");
console.log("Root element:", rootElement);

if (!rootElement) {
  console.error("Root element not found!");
  document.body.innerHTML = '<div style="padding: 20px; font-family: Arial;"><h1>Error: Root element not found</h1><p>The application could not find the root DOM element.</p></div>';
} else {
  try {
    console.log("Creating React root...");
    const root = createRoot(rootElement);
    console.log("Rendering App...");
    root.render(<App />);
    console.log("App rendered successfully");
  } catch (error) {
    console.error("Error rendering React app:", error);
    document.body.innerHTML = '<div style="padding: 20px; font-family: Arial;"><h1>React Error</h1><p>Failed to render the application: ' + error + '</p></div>';
  }
}
