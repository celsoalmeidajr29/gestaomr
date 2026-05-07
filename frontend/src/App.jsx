// Versão ativa: v74 — Fix faturas sumindo: fecharFatura preserva custom + updateFn aguarda PUT
// Versões anteriores em src/versions/
import MRSysApp from './versions/MRSys_v74.jsx'

export default function App(props) {
  return <MRSysApp {...props} />
}
