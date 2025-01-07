// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SignedIn } from '@clerk/clerk-react';
import LoginPage from './pages/login/LoginPage';
import Dashboard from './pages/dashboard/Dashboard';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sign-in" element={<LoginPage />} />
        <Route 
          path="/*" 
          element={
            <SignedIn>
              <Dashboard />
            </SignedIn>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;