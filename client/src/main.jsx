import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(15, 15, 35, 0.95)',
            color: '#f0f0ff',
            border: '1px solid rgba(108, 71, 255, 0.3)',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#00d4aa', secondary: '#0f0f23' } },
          error: { iconTheme: { primary: '#ff4757', secondary: '#0f0f23' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)
