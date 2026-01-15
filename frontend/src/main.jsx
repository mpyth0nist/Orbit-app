import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Load Google Sign-In script
const loadGoogleScript = () => {
  const script = document.createElement('script')
  script.src = 'https://accounts.google.com/gsi/client'
  script.async = true
  script.defer = true
  document.head.appendChild(script)
}

loadGoogleScript()

createRoot(document.getElementById('root')).render(
  <App />
)
