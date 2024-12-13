import React from 'react';
import { createRoot } from 'react-dom/client';
import { CombinedDashboard } from './Dashboard';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <CombinedDashboard />
  </React.StrictMode>
);
