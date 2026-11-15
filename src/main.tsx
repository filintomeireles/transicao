import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './styles.css';

// Funcionamento sem rede na versão web instalável. Não se regista na app nativa (Capacitor)
// nem dentro de páginas que não o permitem (o registo falha sem consequências).
const isNative = 'Capacitor' in window;
const secure = location.protocol === 'https:' || location.hostname === 'localhost';
if (import.meta.env.PROD && !isNative && secure && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
