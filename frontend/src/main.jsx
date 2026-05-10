import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { auth } from './api.js'
import { initStorageShim } from './storage-shim.js'
import App from './App.jsx'
import Login from './Login.jsx'
import SistemasHub from './SistemasHub.jsx'
import PropostaPublica from './PropostaPublica.jsx'
import './index.css'

/**
 * Detecta rota pública /proposta/:token na URL — bypass do login/Hub.
 * Token é UUID v4 (regex). Volta `null` se não bater.
 */
function readPublicPropostaToken() {
  if (typeof window === 'undefined') return null
  const m = window.location.pathname.match(/^\/proposta\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\/?$/i)
  return m ? m[1].toLowerCase() : null
}

function Root() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sistemaAtivo, setSistemaAtivo] = useState(null)

  const propostaToken = readPublicPropostaToken()

  useEffect(() => {
    if (propostaToken) {
      setLoading(false)
      return
    }
    auth.me()
      .then(data => {
        if (data?.usuario) {
          initStorageShim()
          setUser(data.usuario)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [propostaToken])

  const handleLogin = (usuario) => {
    initStorageShim()
    setUser(usuario)
  }

  const handleLogout = async () => {
    try { await auth.logout() } catch (_) {}
    setUser(null)
    setSistemaAtivo(null)
  }

  const handleVoltarHub = () => setSistemaAtivo(null)

  if (propostaToken) {
    return <PropostaPublica token={propostaToken} />
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

  if (!sistemaAtivo) {
    return <SistemasHub usuario={user} onSelecionarSistema={setSistemaAtivo} onLogout={handleLogout} />
  }

  if (sistemaAtivo === 'mrsys') {
    return <App onVoltarHub={handleVoltarHub} onLogout={handleLogout} />
  }

  return null
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />)
