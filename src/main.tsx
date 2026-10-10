import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Dev-time global stress test — brauzer konsolidan chaqirish: window.__stressTest__()
if (import.meta.env.DEV) {
  void import('./engine/stressTest').then((m) => {
    (window as unknown as { __stressTest__: () => unknown }).__stressTest__ = m.logStressTest
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
