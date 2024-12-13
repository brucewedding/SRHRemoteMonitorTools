import React from 'react';
import { createRoot } from 'react-dom/client';
import Login from './Login';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Login />
  </React.StrictMode>
);
