import './style.css'
import { initCalendar } from './calendar.js';
import { renderUI } from './ui.js';

document.querySelector('#app').innerHTML = `
  <div id="main-container">
    <div id="loading">Loading Secretary...</div>
  </div>
`;

// Initialize App
async function bootstrap() {
  try {
    await initCalendar();
    renderUI();
  } catch (e) {
    console.error("Bootstrap failed", e);
    document.querySelector('#app').innerHTML += `<div class="error">Init Error: ${e.message}</div>`;
  }
}

bootstrap();

// PWA Handler
window.deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later.
  window.deferredPrompt = e;
  console.log("beforeinstallprompt fired! App is installable.");
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => console.log('SW registered: ', registration))
      .catch(err => console.log('SW registration failed: ', err));
  });
}
