import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { auth } from './api.js'
import { initStorageShim } from './storage-shim.js'
import App from './App.jsx'
import Login from './Login.jsx'
import './index.css'

function Root() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    auth.me()
      .then(data => {
        if (data?.usuario) {
          initStorageShim()
          setUser(data.usuario)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleLogin = (usuario) => {
    initStorageShim()
    setUser(usuario)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Carregando...</div>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />)
