import React from 'react';
import { createRoot } from 'react-dom/client';
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import 'daisyui/dist/full.css';
import '../../../dist/styles.css';

const LoginPage = () => {
  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      <div className="card w-96 bg-base-100 shadow-xl">
        <figure className="px-10 pt-10">
          <img src="/logo.svg" alt="Logo" className="w-32 h-32" />
        </figure>
        <div className="card-body items-center text-center">
          <h2 className="card-title text-2xl font-bold mb-4">Welcome Back!</h2>
          <p className="text-base-content/70 mb-6">Sign in to access your dashboard</p>
          <div className="card-actions">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="btn btn-primary btn-wide">Sign In</button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <LoginPage />
  </React.StrictMode>
);

export default LoginPage;
