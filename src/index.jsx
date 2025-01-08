// src/index.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import './input.css';

// Select the appropriate Clerk key based on environment
const isDevelopment = import.meta.env.MODE === 'development';
const clerkPubKey = isDevelopment 
  ? import.meta.env.VITE_CLERK_DEV_PUBLISHABLE_KEY
  : import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error(`Missing Clerk Publishable Key for ${isDevelopment ? 'development' : 'production'} environment`);
}

console.log(`Running in ${isDevelopment ? 'development' : 'production'} mode`);

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkPubKey}>
      <App />
    </ClerkProvider>
  </React.StrictMode>
);