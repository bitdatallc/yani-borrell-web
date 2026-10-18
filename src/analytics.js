// Analítica sin cookies con Amazon CloudWatch RUM (cuenta bitdatallc, eu-west-1; infraestructura en analytics/).
// Mide páginas vistas, rendimiento real (Core Web Vitals), errores JS y eventos propios (clics en
// "Agendar cita", WhatsApp, teléfono, email, envíos del formulario). allowCookies:false => no hace
// falta banner de cookies: no guarda identificadores en el navegador del visitante.
// El cliente se carga con el navegador en reposo para no competir con la carga de la página.
const RUM = {
  appMonitorId: 'c5fbfa7e-3fc8-4d90-81bd-4e87a57b429d',
  identityPoolId: 'eu-west-1:79d803c7-d2fa-4736-b340-d300ba3dfdd7',
  region: 'eu-west-1',
  clientUrl: 'https://client.rum.us-east-1.amazonaws.com/1.x/cwr.js',
};

const enabled = !import.meta.env.DEV && !RUM.appMonitorId.startsWith('PENDIENTE');

function loadRum() {
  const s = document.createElement('script');
  s.async = true;
  s.src = RUM.clientUrl;
  document.head.appendChild(s);
}

if (enabled) {
  // Equivalente al snippet oficial de RUM, sin script inline (lo prohíbe la CSP). La cola se crea
  // ya, para no perder eventos anteriores a que se descargue el cliente.
  const queue = { q: [], n: 'cwr', i: RUM.appMonitorId, v: '1.0.0', r: RUM.region, c: {
    sessionSampleRate: 1,
    identityPoolId: RUM.identityPoolId,
    endpoint: `https://dataplane.rum.${RUM.region}.amazonaws.com`,
    telemetries: ['performance', 'errors', 'http'],
    allowCookies: false,
    enableXRay: false,
  } };
  window.AwsRumClient = queue;
  window.cwr = (c, p) => { queue.q.push({ c, p }); };
  const start = () => ('requestIdleCallback' in window ? requestIdleCallback(loadRum, { timeout: 4000 }) : setTimeout(loadRum, 2000));
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}

export function track(type, data = {}) {
  if (!enabled || typeof window.cwr !== 'function') return;
  window.cwr('recordEvent', { type: `yb.${type}`, data });
}
