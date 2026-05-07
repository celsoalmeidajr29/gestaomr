// Versão ativa: v64 — Fix serviços criados manualmente não persistiam + sidebar com labels legíveis + faturamento somente consolidado por cliente
// Versões anteriores em src/versions/
import MRSysApp from './versions/MRSys_v64.jsx'

export default function App(props) {
  return <MRSysApp {...props} />
}
