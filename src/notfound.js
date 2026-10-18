// Página 404: solo estilos + registro de la ruta no encontrada en la analítica (para detectar enlaces rotos).
import './style.css';
import { track } from './analytics.js';

track('not_found', { path: location.pathname });
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-track]');
  if (a) track('cta_click', { cta: a.dataset.track, page: '404' });
});
