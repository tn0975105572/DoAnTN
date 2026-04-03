import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

document.documentElement.removeAttribute('data-theme');
document.documentElement.style.removeProperty('color-scheme');
window.localStorage.removeItem('olodo-theme');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
