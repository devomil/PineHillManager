import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "./components/ui/toaster";
import "./index.css";

// Font loading optimization
const loadGreatVibesFont = () => {
  if ('fonts' in document) {
    document.fonts.load('400 1em "Great Vibes"').then(() => {
      // Force immediate application to all brand elements
      const brandElements = document.querySelectorAll('.brand-title, .pine-hill-title, [data-brand="pine-hill"]');
      brandElements.forEach(el => {
        (el as HTMLElement).style.fontFamily = '"Great Vibes", cursive';
      });
    }).catch(() => {
      // Fallback: apply font directly if loading fails
      const brandElements = document.querySelectorAll('.brand-title, .pine-hill-title, [data-brand="pine-hill"]');
      brandElements.forEach(el => {
        (el as HTMLElement).style.fontFamily = '"Great Vibes", cursive';
      });
    });
  }
};

// Initialize font loading
loadGreatVibesFont();

// Using queryClient from lib/queryClient.ts which includes proper auth headers

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = createRoot(rootElement);
  
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster />
      </QueryClientProvider>
    </React.StrictMode>
  );
}
