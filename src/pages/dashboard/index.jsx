import React from 'react';
import { createRoot } from 'react-dom/client';
import { CombinedDashboard } from './Dashboard';
import LoginPage from '../login';
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { ClerkProvider } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <SignedOut>
        <LoginPage />
      </SignedOut>
      <SignedIn>
        <CombinedDashboard />
      </SignedIn>
    </ClerkProvider>
  </React.StrictMode>
);
