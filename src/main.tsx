
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Register service worker for PWA - GitHub Pages optimized
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const basePath = document.querySelector('base')?.href || window.location.origin;
    const swPath = new URL('sw.js', basePath).href;
    console.log('Registering SW at:', swPath);
    
    navigator.serviceWorker.register(swPath)
      .then((registration) => {
        console.log('SW registered successfully:', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed:', registrationError);
      });
  });
}

console.log("main.tsx loaded");

try {
  console.log("Attempting to find root element...");
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error("Root element not found");
    throw new Error("Root element not found");
  }

  console.log("Root element found, attempting to render App...");
  console.log("Import status - App component:", typeof App);
  
  const root = createRoot(rootElement);
  console.log("React root created successfully");
  
  root.render(<App />);
  console.log("App component rendered successfully");
} catch (error) {
  console.error("Error during React app initialization:", error);
  console.error("Error stack:", error.stack);
}
