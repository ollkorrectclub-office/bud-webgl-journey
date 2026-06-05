import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Local logging bridge to capture browser logs
(function() {
  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  function sendLog(type, args) {
    try {
      const msg = args.map(arg => {
        if (typeof arg === 'object') {
          try { return JSON.stringify(arg); } catch(e) { return String(arg); }
        }
        return String(arg);
      }).join(' ');
      
      fetch('http://localhost:9999/', {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain' },
        body: `[${type.toUpperCase()}] ${msg}`
      }).catch(() => {});
    } catch(e) {}
  }

  console.log = function(...args) {
    origLog.apply(console, args);
    sendLog('log', args);
  };
  console.warn = function(...args) {
    origWarn.apply(console, args);
    sendLog('warn', args);
  };
  console.error = function(...args) {
    origError.apply(console, args);
    sendLog('error', args);
  };
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
