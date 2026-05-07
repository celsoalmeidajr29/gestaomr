// Versão ativa: v73 — Fix faturas sumindo: auto-Vencida não sobrescreve NF-emitida/Aprovada + flush antes de refresh
// Versões anteriores em src/versions/
import MRSysApp from './versions/MRSys_v73.jsx'

export default function App(props) {
  return <MRSysApp {...props} />
}
