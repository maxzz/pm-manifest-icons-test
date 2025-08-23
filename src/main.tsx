import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/0-all-app/App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
