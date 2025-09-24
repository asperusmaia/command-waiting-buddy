
import { StrictMode } from 'react'
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

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
