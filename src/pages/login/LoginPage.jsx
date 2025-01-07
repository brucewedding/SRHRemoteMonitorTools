import React from 'react';
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

const LoginPage = () => {
  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      <div className="card w-96 bg-base-100 shadow-xl">
        <figure className="px-10 pt-10">
          <img src="/logo.svg" alt="Scandinavian Real Heart AB" className="w-32 h-32" />
        </figure>
        <div className="card-body items-center text-center">
          <h2 className="card-title text-2xl font-bold mb-4">SRH Remote Monitor</h2>
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
      
      <footer className="footer footer-center p-4 bg-base-300 text-base-content fixed bottom-0 left-0 right-0">
        <aside>
          <a href="https://realheart.se" target="_blank" rel="noopener noreferrer" className="link link-hover">
            Copyright © 2024 Scandinavian Real Heart AB
          </a>
        </aside>
      </footer>
    </div>
  );
};

export default LoginPage;