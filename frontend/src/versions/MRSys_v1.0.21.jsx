// v1.0.21 — Propostas: seleção múltipla + ações em massa (duplicar/rejeitar/arquivar) + duplicar por linha
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

const APP_VERSION = 'v1.0.21';

const PRESTADORES_PROPOSTA = [
  { nome: 'UP VIGILÂNCIA LTDA',                               cnpj: '50.283.455/0001-30', logoUrl: 'https://celso.cloud/imgs/mrup2.png' },
  { nome: 'WXT PRESTACAO DE SERVIÇOS LTDA',                   cnpj: '34.721.330/0001-98', logoUrl: null },
  { nome: 'MR ASSESSORIA, MONITORAMENTO E SERVIÇOS LTDA',     cnpj: '54.966.180/0001-90', logoUrl: 'https://celso.cloud/imgs/3333.png' },
];
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Plus, Edit2, Trash2, Download, Upload, FileText, BarChart3,
  Save, X, Search, TrendingUp, DollarSign,
  Package, AlertCircle, Archive, Eye, Lock, RefreshCw, CheckCircle2,
  Receipt, Printer, Building2, Users, CreditCard, Fingerprint, MapPin,
  Phone, Wallet, TrendingDown, MinusCircle, ClipboardList, Calendar,
  Camera, Paperclip, FileCheck, User, Mail, Grid3x3, LogOut, Send,
  Briefcase, Tag, ChevronLeft, ChevronRight, Pencil, FolderOpen,
  FileSignature, CheckCircle, XCircle, UserPlus, Moon, Sun, Copy
} from 'lucide-react';

// ============ TEMPLATES POR CLIENTE ============
const TEMPLATES = {
  TOMBINI: { id: 'TOMBINI', nome: 'Tombini', cliente: 'GRUPO TOMBINI', incluirPedagioFatura: false, reembolsarPedagio: false, periodo: 'mensal',
    campos: [
      { k: 'placaVtr', l: 'Placa VTR' }, { k: 'agente1', l: 'Agente 1', tipo: 'funcionario' }, { k: 'agente2', l: 'Agente 2', tipo: 'funcionario' },
      { k: 'inicio', l: 'Início', tipo: 'datetime' }, { k: 'termino', l: 'Término', tipo: 'datetime' },
      { k: 'kmInicial', l: 'KM inicial', tipo: 'number' }, { k: 'kmFinal', l: 'KM final', tipo: 'number' },
      { k: 'percurso', l: 'Percurso', full: true }, { k: 'observacao', l: 'Observação', full: true, tipo: 'textarea' },
    ] },
  ESCOLTECH: { id: 'ESCOLTECH', nome: 'Escoltech', cliente: 'ESCOLTECH', incluirPedagioFatura: true, reembolsarPedagio: false, periodo: 'mensal',
    campos: [
      { k: 'placaVtr', l: 'Placa VTR' }, { k: 'agente1', l: 'Agente 1', tipo: 'funcionario' }, { k: 'agente2', l: 'Agente 2', tipo: 'funcionario' },
      { k: 'inicio', l: 'Início', tipo: 'datetime' }, { k: 'termino', l: 'Término', tipo: 'datetime' },
      { k: 'rota', l: 'Rota', full: true }, { k: 'kmInicial', l: 'KM inicial', tipo: 'number' }, { k: 'kmFinal', l: 'KM final', tipo: 'number' },
      { k: 'pedagio', l: 'Pedágio (R$)', tipo: 'currency' },
    ] },
  BRK: { id: 'BRK', nome: 'BRK Alpargatas', cliente: 'BRK TECNOLOGIA', incluirPedagioFatura: true, reembolsarPedagio: true, periodo: '25-25',
    campos: [
      { k: 'agente1', l: 'Agente', tipo: 'funcionario' }, { k: 'inicio', l: 'Início', tipo: 'datetime' }, { k: 'termino', l: 'Término', tipo: 'datetime' },
      { k: 'rota', l: 'Rota', full: true }, { k: 'kmInicial', l: 'KM inicial', tipo: 'number' }, { k: 'kmFinal', l: 'KM final', tipo: 'number' },
      { k: 'pedagio', l: 'Pedágio (R$)', tipo: 'currency' }, { k: 'obs', l: 'Obs', full: true },
    ] },
  NATURA_MOTOLINK: { id: 'NATURA_MOTOLINK', nome: 'Natura Motolink', cliente: 'NATURA COSMÉTICOS S.A', incluirPedagioFatura: false, reembolsarPedagio: false, periodo: 'mensal', exportFormat: 'natura',
    campos: [
      { k: 'base', l: 'Base', tipo: 'select', options: ['MD GRU', 'MD CMG', 'MD DCX', 'MD SGO'] },
      { k: 'tipoOp', l: 'Tipo', tipo: 'select', options: ['MOTOLINK', 'VELADA'] },
      { k: 'agente', l: 'Agente (entregador)', tipo: 'funcionario' }, { k: 'placa', l: 'Placa' },
      { k: 'inicio', l: 'Início', tipo: 'time' }, { k: 'termino', l: 'Término', tipo: 'time' },
      { k: 'notaFiscal', l: 'NF', tipo: 'number' }, { k: 'volume', l: 'Volume', tipo: 'number' },
      { k: 'rota', l: 'Rota' }, { k: 'motorista', l: 'Motorista', tipo: 'funcionario' },
      { k: 'kmInicial', l: 'KM inicial', tipo: 'number' }, { k: 'kmFinal', l: 'KM final', tipo: 'number' },
    ] },
  NATURA_NOTURNA: { id: 'NATURA_NOTURNA', nome: 'Natura Noturna', cliente: 'NATURA COSMÉTICOS S.A', incluirPedagioFatura: true, reembolsarPedagio: false, periodo: 'mensal', exportFormat: 'natura',
    campos: [
      { k: 'base', l: 'Base', tipo: 'select', options: ['MD GRU', 'MD CMG', 'MD DCX', 'MD SGO'] },
      { k: 'tipoOp', l: 'Tipo', tipo: 'select', options: ['MOTOLINK', 'VELADA'] },
      { k: 'equipe', l: 'Equipe' }, { k: 'agente', l: 'Agente', tipo: 'funcionario' },
      { k: 'convocacao', l: 'Convocação', tipo: 'datetime' }, { k: 'inicioMissao', l: 'Início missão', tipo: 'datetime' },
      { k: 'terminoFase1', l: 'Fim fase 1', tipo: 'datetime' }, { k: 'inicioFase2', l: 'Início fase 2', tipo: 'datetime' },
      { k: 'terminoMissao', l: 'Fim missão', tipo: 'datetime' }, { k: 'tempoEspera', l: 'T. espera (h)', tipo: 'number' },
      { k: 'batidaExtra', l: 'Batida extra (R$)', tipo: 'currency' }, { k: 'pedagio', l: 'Pedágio (R$)', tipo: 'currency' },
      { k: 'observacao', l: 'Observação', full: true, tipo: 'textarea' },
    ] },
  IRB_ITRACKER: { id: 'IRB_ITRACKER', nome: 'IRB Itracker', cliente: 'IRB LOGÍSTICA ITRACKER', incluirPedagioFatura: false, reembolsarPedagio: false, periodo: 'mensal',
    campos: [
      { k: 'placaVtr', l: 'Placa VTR' }, { k: 'agente1', l: 'Agente 1', tipo: 'funcionario' }, { k: 'agente2', l: 'Agente 2', tipo: 'funcionario' },
      { k: 'inicio', l: 'Início', tipo: 'datetime' }, { k: 'termino', l: 'Término', tipo: 'datetime' },
      { k: 'rota', l: 'Rota', full: true }, { k: 'subCliente', l: 'Cliente final (ex: COBREMAX)' },
      { k: 'kmInicial', l: 'KM inicial', tipo: 'number' }, { k: 'kmFinal', l: 'KM final', tipo: 'number' },
    ] },
};

const CLIENTES_INICIAIS = [
  { id: 'C001', nome: 'NATURA COSMÉTICOS S.A', razaoSocial: 'NATURA COSMÉTICOS S.A', cnpj: '71.673.990/0001-77', inscricaoEstadual: '', email: '', telefone: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: 'Cajamar', uf: 'SP', cep: '', nomeContato: '', cargoContato: '', aliquota: 15.6, observacoes: '', status: 'ATIVO' },
  { id: 'C002', nome: 'IRB LOGÍSTICA ITRACKER', razaoSocial: 'IRB LOGÍSTICA ITRACKER LTDA', cnpj: '', inscricaoEstadual: '', email: '', telefone: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', uf: 'SP', cep: '', nomeContato: '', cargoContato: '', aliquota: 8.65, observacoes: '', status: 'ATIVO' },
  { id: 'C003', nome: 'GRUPO TOMBINI', razaoSocial: 'GRUPO TOMBINI', cnpj: '', inscricaoEstadual: '', email: '', telefone: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '', nomeContato: '', cargoContato: '', aliquota: 8.65, observacoes: '', status: 'ATIVO' },
  { id: 'C004', nome: 'ESCOLTECH', razaoSocial: 'ESCOLTECH', cnpj: '', inscricaoEstadual: '', email: '', telefone: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '', nomeContato: '', cargoContato: '', aliquota: 8.65, observacoes: '', status: 'ATIVO' },
  { id: 'C005', nome: 'BRK TECNOLOGIA', razaoSocial: 'BRK TECNOLOGIA', cnpj: '', inscricaoEstadual: '', email: '', telefone: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '', nomeContato: '', cargoContato: '', aliquota: 15.6, observacoes: '', status: 'ATIVO' },
];

const SERVICOS_INICIAIS = [
  { cod: '9999', template: 'NATURA_NOTURNA', descricao: 'GOGÓ', cliente: 'NATURA COSMÉTICOS S.A', cnpj: '71.673.990/0001-77', emissao: '11.03', franquiaHoras: 8, franquiaKm: 1000, horaExtraFatura: 32.89, kmExtraFatura: 0, diariaPaga: 0, horaExtraPaga: 20.00, kmExtraPago: 0, adicionalDomingosFatura: 94.95, adicionalDomingosPago: 50.00, valorFatura: 394.26, categoriaServico: 'VELADA RJ', aliquota: 15.6, status: 'ATIVO' },
  { cod: '103', template: 'NATURA_NOTURNA', descricao: 'NOTURNA DCX', cliente: 'NATURA COSMÉTICOS S.A', cnpj: '71.673.990/0001-77', emissao: '11.03', franquiaHoras: 8, franquiaKm: 1000, horaExtraFatura: 78.65, kmExtraFatura: 0, diariaPaga: 250.00, horaExtraPaga: 40.00, kmExtraPago: 0, adicionalDomingosFatura: 147.85, adicionalDomingosPago: 80.00, valorFatura: 591.41, categoriaServico: 'VELADA RJ', aliquota: 15.6, status: 'ATIVO' },
  { cod: '105', template: 'NATURA_NOTURNA', descricao: 'COMBOIO', cliente: 'NATURA COSMÉTICOS S.A', cnpj: '71.673.990/0001-77', emissao: '11.03', franquiaHoras: 8, franquiaKm: 1000, horaExtraFatura: 78.65, kmExtraFatura: 0, diariaPaga: 0, horaExtraPaga: 40.00, kmExtraPago: 0, adicionalDomingosFatura: 147.85, adicionalDomingosPago: 80.00, valorFatura: 394.26, categoriaServico: 'VELADA RJ', aliquota: 15.6, status: 'ATIVO' },
  { cod: '104', template: 'NATURA_NOTURNA', descricao: 'NOTURNA SGO', cliente: 'NATURA COSMÉTICOS S.A', cnpj: '71.673.990/0001-77', emissao: '11.03', franquiaHoras: 8, franquiaKm: 1000, horaExtraFatura: 78.65, kmExtraFatura: 0, diariaPaga: 0, horaExtraPaga: 40.00, kmExtraPago: 0, adicionalDomingosFatura: 147.85, adicionalDomingosPago: 80.00, valorFatura: 591.41, categoriaServico: 'VELADA RJ', aliquota: 15.6, status: 'ATIVO' },
  { cod: '190', template: 'NATURA_MOTOLINK', descricao: 'MOTOLINK RJ GERAL', cliente: 'NATURA COSMÉTICOS S.A', cnpj: '71.673.990/0001-77', emissao: '11.03', franquiaHoras: 8, franquiaKm: 1000, horaExtraFatura: 34.13, kmExtraFatura: 0, diariaPaga: 150.00, horaExtraPaga: 21.00, kmExtraPago: 0, adicionalDomingosFatura: 98.55, adicionalDomingosPago: 52.50, valorFatura: 394.26, categoriaServico: 'MOTOLINK RJ', aliquota: 15.6, status: 'ATIVO' },
  { cod: '201', template: 'NATURA_MOTOLINK', descricao: 'MOTOLINK SP NORMAL', cliente: 'NATURA COSMÉTICOS S.A', cnpj: '71.673.990/0001-77', emissao: '11.03', franquiaHoras: 8, franquiaKm: 1000, horaExtraFatura: 34.13, kmExtraFatura: 0, diariaPaga: 215.00, horaExtraPaga: 20.00, kmExtraPago: 0, adicionalDomingosFatura: 98.55, adicionalDomingosPago: 50.00, valorFatura: 394.26, categoriaServico: 'MOTOLINK RJ', aliquota: 15.6, status: 'ATIVO' },
  { cod: '1000', template: 'NATURA_MOTOLINK', descricao: 'MOTOLINK SP REPASSE', cliente: 'NATURA COSMÉTICOS S.A', cnpj: '71.673.990/0001-77', emissao: '11.03', franquiaHoras: 8, franquiaKm: 1000, horaExtraFatura: 34.13, kmExtraFatura: 0, diariaPaga: 250.00, horaExtraPaga: 20.00, kmExtraPago: 0, adicionalDomingosFatura: 98.55, adicionalDomingosPago: 50.00, valorFatura: 394.26, categoriaServico: 'MOTOLINK RJ', aliquota: 15.6, status: 'ATIVO' },
  { cod: '202501', template: 'IRB_ITRACKER', descricao: 'ITRACKER 3H/100', cliente: 'IRB LOGÍSTICA ITRACKER', cnpj: '', emissao: '11.03', franquiaHoras: 6, franquiaKm: 200, horaExtraFatura: 107.45, kmExtraFatura: 2.59, diariaPaga: 300.00, horaExtraPaga: 40.00, kmExtraPago: 0, adicionalDomingosFatura: 104.99, adicionalDomingosPago: 0, valorFatura: 699.90, categoriaServico: 'VELADA SP', aliquota: 8.65, status: 'ATIVO' },
  { cod: '202502', template: 'IRB_ITRACKER', descricao: 'ITRACKER 6H/200', cliente: 'IRB LOGÍSTICA ITRACKER', cnpj: '', emissao: '11.03', franquiaHoras: 6, franquiaKm: 200, horaExtraFatura: 107.45, kmExtraFatura: 2.59, diariaPaga: 300.00, horaExtraPaga: 40.00, kmExtraPago: 0, adicionalDomingosFatura: 104.99, adicionalDomingosPago: 0, valorFatura: 699.90, categoriaServico: 'VELADA SP', aliquota: 8.65, status: 'ATIVO' },
  { cod: '202503', template: 'IRB_ITRACKER', descricao: 'ITRACKER 8H/200', cliente: 'IRB LOGÍSTICA ITRACKER', cnpj: '', emissao: '11.03', franquiaHoras: 8, franquiaKm: 200, horaExtraFatura: 107.50, kmExtraFatura: 2.59, diariaPaga: 300.00, horaExtraPaga: 40.00, kmExtraPago: 0, adicionalDomingosFatura: 118.49, adicionalDomingosPago: 0, valorFatura: 789.90, categoriaServico: 'VELADA SP', aliquota: 8.65, status: 'ATIVO' },
  { cod: '202504', template: 'IRB_ITRACKER', descricao: 'ITRACKER ARMADA 3H/100', cliente: 'IRB LOGÍSTICA ITRACKER', cnpj: '', emissao: '11.03', franquiaHoras: 3, franquiaKm: 100, horaExtraFatura: 107.45, kmExtraFatura: 2.59, diariaPaga: 0, horaExtraPaga: 40.00, kmExtraPago: 0, adicionalDomingosFatura: 67.49, adicionalDomingosPago: 0, valorFatura: 449.90, categoriaServico: 'ARMADA', aliquota: 8.65, status: 'ATIVO' },
  { cod: '202505', template: 'IRB_ITRACKER', descricao: 'ITRACKER ARMADA 6H/200', cliente: 'IRB LOGÍSTICA ITRACKER', cnpj: '', emissao: '11.03', franquiaHoras: 6, franquiaKm: 200, horaExtraFatura: 107.45, kmExtraFatura: 2.59, diariaPaga: 0, horaExtraPaga: 40.00, kmExtraPago: 0, adicionalDomingosFatura: 119.99, adicionalDomingosPago: 0, valorFatura: 799.90, categoriaServico: 'ARMADA', aliquota: 8.65, status: 'ATIVO' },
  { cod: '202601', template: 'TOMBINI', descricao: 'TOMBINI ARMADA', cliente: 'GRUPO TOMBINI', cnpj: '', emissao: '11.03', franquiaHoras: 6, franquiaKm: 200, horaExtraFatura: 107.50, kmExtraFatura: 2.59, diariaPaga: 0, horaExtraPaga: 0, kmExtraPago: 0, adicionalDomingosFatura: 119.99, adicionalDomingosPago: 0, valorFatura: 799.90, categoriaServico: 'ARMADA', aliquota: 8.65, status: 'ATIVO' },
  { cod: '202604', template: 'TOMBINI', descricao: 'TOMBINI VELADA', cliente: 'GRUPO TOMBINI', cnpj: '', emissao: '11.03', franquiaHoras: 3, franquiaKm: 100, horaExtraFatura: 112.90, kmExtraFatura: 3.59, diariaPaga: 350.00, horaExtraPaga: 40.00, kmExtraPago: 0, adicionalDomingosFatura: 119.99, adicionalDomingosPago: 0, valorFatura: 799.90, categoriaServico: 'VELADA SP', aliquota: 8.65, status: 'ATIVO' },
  { cod: '202607', template: 'ESCOLTECH', descricao: 'ESCOLTECH', cliente: 'ESCOLTECH', cnpj: '', emissao: '11.03', franquiaHoras: 3, franquiaKm: 100, horaExtraFatura: 112.90, kmExtraFatura: 3.59, diariaPaga: 0, horaExtraPaga: 0, kmExtraPago: 0, adicionalDomingosFatura: 52.49, adicionalDomingosPago: 0, valorFatura: 349.90, categoriaServico: 'VELADA SP', aliquota: 8.65, status: 'ATIVO' },
  { cod: '202603', template: 'BRK', descricao: 'ALPARGATAS 3H/100KM', cliente: 'BRK TECNOLOGIA', cnpj: '', emissao: '11.03', franquiaHoras: 3, franquiaKm: 100, horaExtraFatura: 112.90, kmExtraFatura: 3.59, diariaPaga: 250.00, horaExtraPaga: 40.00, kmExtraPago: 2.00, adicionalDomingosFatura: 87.48, adicionalDomingosPago: 0, valorFatura: 509.90, categoriaServico: 'VELADA SP', aliquota: 15.6, status: 'ATIVO' },
  { cod: '202605', template: 'BRK', descricao: 'ALPARGATAS 3H/100KM - DIF', cliente: 'BRK TECNOLOGIA', cnpj: '', emissao: '11.03', franquiaHoras: 3, franquiaKm: 100, horaExtraFatura: 112.90, kmExtraFatura: 3.59, diariaPaga: 280.00, horaExtraPaga: 40.00, kmExtraPago: 2.00, adicionalDomingosFatura: 127.48, adicionalDomingosPago: 0, valorFatura: 509.90, categoriaServico: 'VELADA SP', aliquota: 15.6, status: 'ATIVO' },
];

const FUNCIONARIOS_INICIAIS = (() => {
  const lista = [
    ...['RAMON VERISSIMO DOS SANTOS', 'RODRIGO DA COSTA RODRIGUES', 'VITOR FREITAS FALCÃO GOES', 'MICHEL EULALIO DA SILVA', 'EDUARDO PEDRO DE OLIVEIRA PIMENTA', 'JEFFERSON WILLIAM FERNANDES DE SOUZA JUNIOR', 'MARCOS FELIPE DA SILVA SALVIANO', 'JUANITO FERNANDES PEREIRA DIAS', 'BRUNO DOS SANTOS FERREIRA', 'JONACI LAIA MACARIO', 'EDISON CARLOS ROSA ROCHA', 'CARLOS EDUARDO LIMA MACHADO', 'PEDRO HENRIQUE DE ANDRADE CANDIDO', 'EVERSON THIAGO BIANCH DA SILVA', 'FAGNER COUTO'].map(n => ({ nome: n, categoria: 'Agente Escolta' })),
    ...['ROGERIO MATOS RODRIGUES', 'LUCIANO VIANA HENRIQUE', 'JANDERSON OLIVEIRA COSTA', 'ALEXANDRE SEBASTIAO DE SOUZA', 'ALESSANDRO DA SILVA SALGADO', 'GABRIEL DE OLIVEIRA MENDONCA', 'ELIAS FERNANDES SILVA', 'GABRIEL DE CARVALHO DE SOUSA', 'SEBASTIAO ANSELMO DANTAS NETO', 'JOÃO DA SILVA ANDRADE', 'MARCOS HENRIQUE DA SILVA ARAUJO', 'EDMILSON CIPRIANO DOS SANTOS', 'WILLIAM AMANCIO DIAS', 'FELIPE CARDOSO MEDEIROS', 'ROGER RIBEIRO RANGEL'].map(n => ({ nome: n, categoria: 'Entregador Motolink' })),
    ...['MICHEL', 'GISLAINE', 'ALEX', 'JEFERSON', 'WESLEY', 'SR. LUIZ', 'SILVÉRIO', 'PAULO', 'LUCIANO', 'MACK MILLER', 'JOÃO EDUARDO', 'KLEBER', 'DAVID', 'RENAN'].map(n => ({ nome: n, categoria: 'Motorista' })),
  ];
  return lista.map((f, i) => ({ id: `F${String(i + 1).padStart(3, '0')}`, nome: f.nome, categoria: f.categoria, rg: '', cpf: '', telefone: '', email: '', endereco: '', cep: '', cidade: '', uf: '', dataNascimento: '', estadoCivil: '', nacionalidade: 'Brasileira', chavePix: '', tipoPix: 'CPF', valorDiaria: 0, salarioFixo: 0, fotoMeta: null, documentos: [], status: 'ATIVO', notas: '', criadoEm: new Date().toISOString() }));
})();

const ESTADOS_CIVIS = ['Solteiro(a)', 'Casado(a)', 'União Estável', 'Divorciado(a)', 'Viúvo(a)'];

const CATEGORIAS_PADRAO = ['Agente Escolta', 'Agente Apoio', 'Entregador Motolink', 'Motorista', 'Apoio Logístico', 'Operacional', 'Administrativo'];
const TIPOS_PIX = ['CPF', 'CNPJ', 'E-mail', 'Telefone', 'Aleatória'];
const TIPOS_DESPESA = ['FIXA', 'PARCELA', 'AVULSA'];
const ORIGENS_DESPESA = ['CARTÃO CORPORATIVO', 'RICARDO', 'MANHÃES', 'EMPRESA', 'CELSO', 'ROGER'];
const CENTROS_CUSTO = ['Cora', 'Itaú', 'Santander', 'Carrefour', 'Celso', 'RICARDO', 'MANHÃES', 'EMPRESA', 'ROGER'];
const TIPOS_VALE = ['VALE', 'COMBUSTÍVEL - GALOP', 'COMBUSTÍVEL - MARRAKESH'];
const CATEGORIAS_SERVICO = ['MOTOLINK RJ', 'VELADA RJ', 'VELADA SP', 'ARMADA', 'FACILITIES'];
const CORES_CATEGORIA_SERVICO = {
  'MOTOLINK RJ':    { bg: 'bg-cyan-500/20',    text: 'text-cyan-600',    border: 'border-cyan-500/40' },
  'VELADA RJ':      { bg: 'bg-blue-500/20',     text: 'text-blue-600',    border: 'border-blue-500/40' },
  'VELADA SP':      { bg: 'bg-violet-500/20',   text: 'text-violet-600',  border: 'border-violet-500/40' },
  'ARMADA':         { bg: 'bg-red-500/20',      text: 'text-red-600',     border: 'border-red-500/40' },
  'FACILITIES':     { bg: 'bg-emerald-500/20',  text: 'text-emerald-600', border: 'border-emerald-500/40' },
  // aliases para dados anteriores (mantidos como fallback visual)
  'VELADA':         { bg: 'bg-blue-500/20',     text: 'text-blue-600',    border: 'border-blue-500/40' },
  'MOTOLINK':       { bg: 'bg-cyan-500/20',     text: 'text-cyan-600',    border: 'border-cyan-500/40' },
  'PRONTA RESPOSTA':{ bg: 'bg-amber-500/20',    text: 'text-amber-600',   border: 'border-amber-500/40' },
};
const STATUS_FATURA = ['Enviada', 'Aprovada', 'NF-emitida', 'Paga', 'Vencida'];
const CORES_STATUS_FATURA = {
  'Enviada': { bg: 'bg-blue-500/20', text: 'text-blue-600', border: 'border-blue-500/40' },
  'Aprovada': { bg: 'bg-indigo-500/20', text: 'text-indigo-600', border: 'border-indigo-500/40' },
  'NF-emitida': { bg: 'bg-purple-500/20', text: 'text-purple-600', border: 'border-purple-500/40' },
  'Paga': { bg: 'bg-emerald-500/20', text: 'text-emerald-600', border: 'border-emerald-500/40' },
  'Vencida': { bg: 'bg-red-500/20', text: 'text-red-600', border: 'border-red-500/40' },
};
const FORMAS_PAGAMENTO_VALE = ['CARTÃO CORPORATIVO', 'MANHÃES', 'RICARDO', 'EMPRESA', 'PIX', 'DINHEIRO'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// ============ HELPERS ============
const num = (v) => {
  if (typeof v === 'string' && v.includes(',') && !v.includes('.')) return Number(v.replace(',', '.')) || 0;
  return Number(v) || 0;
};
// Arredonda valores monetários para 2 casas decimais (evita erro de floating-point ex: 0.1+0.2=0.30000000000000004)
const roundMoney = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;
// Soma uma lista de valores numéricos com arredondamento monetário ao final
const sumMoney = (arr, getter = (x) => x) => roundMoney(arr.reduce((s, x) => s + num(getter(x)), 0));
// Soma quantidades (horas, km) com 2 casas decimais
const sumQty = (arr, getter = (x) => x) => Math.round((arr.reduce((s, x) => s + num(getter(x)), 0) + Number.EPSILON) * 100) / 100;
const fmt = (v) => `R$ ${num(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
const hoje = () => new Date().toISOString().slice(0, 10);
const mesAtual = () => new Date().toISOString().slice(0, 7);
const normalizar = (s) => (s || '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const fmtMes = (p) => { if (!p) return ''; const [y, m] = p.split('-').map(Number); return `${MESES[m - 1]}/${y}`; };
const fmtMesCurto = (p) => { if (!p) return ''; const [y, m] = p.split('-').map(Number); return `${MESES[m - 1].slice(0, 3)}/${y}`; };

function getPeriodo(dataISO, template) {
  if (!dataISO) return '';
  const [y, m, d] = dataISO.split('-').map(Number);
  if (template?.periodo === '25-25' && d > 25) {
    const nm = m === 12 ? 1 : m + 1; const ny = m === 12 ? y + 1 : y;
    return `${ny}-${String(nm).padStart(2, '0')}`;
  }
  return dataISO.slice(0, 7);
}

function fmtPeriodo(p, template) {
  if (!p) return '';
  const [y, m] = p.split('-').map(Number);
  if (template?.periodo === '25-25') {
    const pm = m === 1 ? 12 : m - 1; const py = m === 1 ? y - 1 : y;
    return `26/${String(pm).padStart(2, '0')}/${py} a 25/${String(m).padStart(2, '0')}/${y}`;
  }
  return `${MESES[m - 1]}/${y}`;
}

function fmtPeriodoCurto(p, template) {
  if (!p) return '';
  const [y, m] = p.split('-').map(Number);
  if (template?.periodo === '25-25') { const pm = m === 1 ? 12 : m - 1; return `${String(pm).padStart(2, '0')}-${String(m).padStart(2, '0')}/${y}`; }
  return `${MESES[m - 1].slice(0, 3)}/${y}`;
}

const fmtData = (d) => d ? d.split('-').reverse().join('/') : '';
function fmtDateTime(s) { if (!s) return ''; const d = new Date(s); return isNaN(d) ? s : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); }

// ============ FERIADOS ============
function calcularPascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const ll = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * ll) / 451);
  const mes = Math.floor((h + ll - 7 * m + 114) / 31);
  const dia = ((h + ll - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}
function addDias(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function toISO(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

function feriadosBase(ano) {
  const p = calcularPascoa(ano);
  const m = new Map([
    // Nacionais fixos
    [`${ano}-01-01`, 'Confraternização Universal'],
    [`${ano}-04-21`, 'Tiradentes'],
    [`${ano}-05-01`, 'Dia do Trabalho'],
    [`${ano}-09-07`, 'Independência do Brasil'],
    [`${ano}-10-12`, 'Nossa Senhora Aparecida'],
    [`${ano}-11-02`, 'Finados'],
    [`${ano}-11-15`, 'Proclamação da República'],
    [`${ano}-11-20`, 'Consciência Negra'],
    [`${ano}-12-25`, 'Natal'],
    // Nacionais móveis
    [toISO(addDias(p, -48)), 'Carnaval (segunda-feira)'],
    [toISO(addDias(p, -47)), 'Carnaval (terça-feira)'],
    [toISO(addDias(p, -2)), 'Sexta-Feira Santa'],
    [toISO(p), 'Páscoa'],
    [toISO(addDias(p, 60)), 'Corpus Christi'],
    // Rio de Janeiro
    [`${ano}-01-20`, 'São Sebastião — Padroeiro do Rio (RJ)'],
    [`${ano}-04-23`, 'São Jorge (RJ)'],
  ]);
  return m;
}

function detectarFeriado(data, feriadosExtra = []) {
  if (!data) return null;
  const ano = parseInt(data.slice(0, 4));
  const base = feriadosBase(ano);
  feriadosExtra.forEach(f => { if (f.data) base.set(f.data, f.nome); });
  return base.get(data) || null;
}

function diffHorasDecimal(ini, fim, data) {
  if (!ini || !fim) return 0;
  // Strings de horário puro "HH:MM" ou "HH:MM:SS" (sem data, sem 'T')
  if (/^\d{1,2}:\d{2}/.test(String(ini)) && !String(ini).includes('T')) {
    const base = data || new Date().toISOString().slice(0, 10);
    const a = new Date(`${base}T${ini}`);
    let b = new Date(`${base}T${fim}`);
    if (isNaN(a) || isNaN(b)) return 0;
    // Mesmo horário = sem trabalho (não assume virada de dia falsa).
    if (b.getTime() === a.getTime()) return 0;
    // Virada de meia-noite só se término < início (estritamente).
    if (b < a) b = new Date(b.getTime() + 864e5);
    return (b - a) / 36e5;
  }
  const a = new Date(ini), b = new Date(fim);
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.max(0, (b - a) / 36e5);
}

function eDomingo(dataISO) {
  if (!dataISO) return false;
  const [y, m, d] = dataISO.split('-').map(Number);
  return new Date(y, m - 1, d).getDay() === 0;
}

function calcular(s, l, t) {
  if (!s) return zeroCalc();
  const ht = num(l.horasTrabalhadas), km = num(l.kmRodados), ped = num(l.pedagio);
  // Quando 0h: zero horas extras (mas a base do serviço continua sendo cobrada — operação aconteceu).
  const horasExtras = ht > 0 ? Math.max(0, ht - num(s.franquiaHoras)) : 0;
  const kmExtras = km > 0 ? Math.max(0, km - num(s.franquiaKm)) : 0;
  const isDom = l.isDomingo === undefined ? eDomingo(l.data) : !!l.isDomingo;
  const isFer = !!l.isFeriado;
  const extraHorasFatura = roundMoney(horasExtras * num(s.horaExtraFatura));
  const extraKmFatura = roundMoney(kmExtras * num(s.kmExtraFatura));
  const adicDomFatura = (isDom || isFer) ? num(s.adicionalDomingosFatura) : 0;
  const extraHorasPaga = roundMoney(horasExtras * num(s.horaExtraPaga));
  const extraKmPago = roundMoney(kmExtras * num(s.kmExtraPago));
  const adicDomPago = (isDom || isFer) ? num(s.adicionalDomingosPago) : 0;
  const outros = num(l.outros), batidaExtra = num(l.batidaExtra);
  const pedagioFatura = t?.incluirPedagioFatura ? ped : 0;
  const pedagioReembolso = t?.reembolsarPedagio ? ped : 0;
  const totalFatura = roundMoney(num(s.valorFatura) + extraHorasFatura + extraKmFatura + adicDomFatura + outros + pedagioFatura + batidaExtra);
  const totalPago = roundMoney(num(s.diariaPaga) + extraHorasPaga + extraKmPago + adicDomPago + pedagioReembolso);
  // Alíquota (snapshot no momento do cálculo). Aplicada sobre o totalFatura, descontada do lucro.
  const aliquota = num(s.aliquota);
  const imposto = roundMoney(totalFatura * (aliquota / 100));
  return { horasExtras, kmExtras, isDom, extraHorasFatura, extraKmFatura, adicDomFatura, extraHorasPaga, extraKmPago, adicDomPago, outros, batidaExtra, pedagio: ped, pedagioFatura, pedagioReembolso, totalFatura, totalPago, aliquota, imposto, lucro: roundMoney(totalFatura - totalPago - imposto) };
}

function zeroCalc() { return { horasExtras: 0, kmExtras: 0, isDom: false, extraHorasFatura: 0, extraKmFatura: 0, adicDomFatura: 0, extraHorasPaga: 0, extraKmPago: 0, adicDomPago: 0, outros: 0, batidaExtra: 0, pedagio: 0, pedagioFatura: 0, pedagioReembolso: 0, totalFatura: 0, totalPago: 0, aliquota: 0, imposto: 0, lucro: 0 }; }

function nomesNoLancamento(l) { const e = l.extras || {}; return [e.agente1, e.agente2, e.agente, e.motorista].map(normalizar).filter(Boolean); }
function lancamentosDoFunc(funcionario, lancamentos) { const nome = normalizar(funcionario.nome); return lancamentos.filter(l => nomesNoLancamento(l).includes(nome)); }
function valorParticipacao(funcionario, lanc) {
  if (num(funcionario.valorDiaria) > 0) return num(funcionario.valorDiaria);
  return num(lanc.totalPago);
}

// ============ HELPERS DE ARQUIVOS (FOTO/DOCS DE FUNCIONÁRIOS) ============
const fotoKey = (funcId) => `funcfoto_${funcId}`;
const docKey = (funcId, docId) => `funcdoc_${funcId}_${docId}`;

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

async function getArquivoStorage(key) {
  try { const r = await window.storage.get(key); return r ? r.value : null; } catch { return null; }
}
async function setArquivoStorage(key, base64) {
  try { await window.storage.set(key, base64); return true; } catch (e) { console.error('storage', e); return false; }
}
async function deleteArquivoStorage(key) {
  try { await window.storage.delete(key); } catch { }
}

const fmtTamanho = (bytes) => {
  const n = num(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

// ============ EXPORTAÇÃO XLSX ============
const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

function fmtHorasHHMM(decimal) {
  const v = num(decimal);
  const h = Math.floor(v);
  const m = Math.round((v - h) * 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

function fmtDateTimeXLS(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  if (isNaN(d)) return '';
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).replace(',', '');
}

function diaSemanaPt(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return DIAS_SEMANA[new Date(y, m - 1, d).getDay()];
}

function exportarFaturaXLSX(fatura, servicos) {
  const tids = fatura.templates || (fatura.template ? [fatura.template] : []);
  const isNatura = tids.some(tid => TEMPLATES[tid]?.exportFormat === 'natura');
  if (isNatura) return exportarFaturaNaturaXLSX(fatura, servicos);
  return exportarFaturaPadraoXLSX(fatura, servicos);
}

function exportarFaturaNaturaXLSX(fatura, servicos) {
  const itens = [...fatura.lancs].sort((a, b) => a.data.localeCompare(b.data));
  // Colunas conforme modelo padrão NATURA (18 colunas, col 0 = OS)
  const headers = ['OS', 'DATA', 'CLIENTE', 'CNPJ', 'COD. EMISSÃO', 'DIA', 'FERIADO', 'MÊS', 'FRANQUIA', 'FRANQUIA KM', 'HORAS EXTRAS', 'BASE', 'TIPO', 'VLR BASE', 'VLR HORA EXTRA', 'KM. EXTRA', 'ADICIONAL', 'VALOR A FATURAR'];
  const cnpj = itens[0]?.cnpj || '71.673.990/0001-77';
  const rowsDet = itens.map(l => {
    const s = servicos.find(x => x.cod === l.codServico);
    const e = l.extras || {};
    const dia = diaSemanaPt(l.data);
    const diaPt = dia ? dia.charAt(0).toUpperCase() + dia.slice(1) : '';
    const [, mes] = l.data.split('-');
    // FERIADO: nome do feriado se isFeriado, 'SIM' se domingo, 'NÃO' caso contrário
    const feriado = l.isFeriado ? (l.nomeFeriado || 'SIM') : (l.isDomingo ? 'SIM' : 'NÃO');
    // BASE: prioriza qualquer campo preenchido (cobre 9999 importado via planilha MOTOLINK
    // que preenche e.base mesmo sendo template NATURA_NOTURNA).
    const base = e.equipe || e.base || '';
    // TIPO: categoria do serviço cadastrado (sempre da tabela de serviços, nunca do lançamento)
    const tipo = s?.categoriaServico || '';
    const hExt = num(l.horasExtras);
    const xHFat = num(l.extraHorasFatura);
    const xKFat = num(l.extraKmFatura);
    return [
      l.os || '',                                              // 0  OS
      fmtData(l.data),                                         // 1  DATA
      l.cliente,                                               // 2  CLIENTE
      cnpj,                                                    // 3  CNPJ
      s?.emissao || '11.03',                                   // 4  COD. EMISSÃO
      diaPt,                                                   // 5  DIA
      feriado,                                                 // 6  FERIADO
      MESES[Number(mes) - 1] || '',                            // 7  MÊS
      num(s?.franquiaHoras) > 0 ? fmtHorasHHMM(s.franquiaHoras) : '',  // 8  FRANQUIA
      num(s?.franquiaKm) || 0,                                 // 9  FRANQUIA KM
      hExt > 0 ? Number(hExt.toFixed(2)) : '',                // 10 HORAS EXTRAS
      base,                                                    // 11 BASE
      tipo,                                                    // 12 TIPO
      num(s?.valorFatura) || 0,                                // 13 VLR BASE
      xHFat > 0 ? xHFat : '',                                 // 14 VLR HORA EXTRA
      xKFat > 0 ? xKFat : '',                                 // 15 KM. EXTRA
      roundMoney(num(l.adicDomFatura) + num(l.pedagioFatura)) || 0,  // 16 ADICIONAL (dom/feriado + pedágio)
      num(l.totalFatura),                                           // 17 VALOR A FATURAR
    ];
  });
  const sumCol = (key) => sumMoney(itens, l => l[key]);
  const valorBaseTotal = sumMoney(itens, l => { const sv = servicos.find(x => x.cod === l.codServico); return num(sv?.valorFatura); });
  const totalFaturaRecalc = sumMoney(itens, l => l.totalFatura);
  const totalRow = ['', 'TOTAL', '', '', '', '', '', '', '', '', '', '', '', valorBaseTotal, sumCol('extraHorasFatura'), sumCol('extraKmFatura'), sumMoney(itens, l => num(l.adicDomFatura) + num(l.pedagioFatura)), totalFaturaRecalc];
  const ws1 = XLSX.utils.aoa_to_sheet([headers, ...rowsDet, totalRow]);
  ws1['!cols'] = [{ wch: 10 }, { wch: 11 }, { wch: 26 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 9 }, { wch: 9 }, { wch: 11 }, { wch: 11 }, { wch: 10 }, { wch: 14 }, { wch: 13 }, { wch: 14 }, { wch: 11 }, { wch: 13 }, { wch: 14 }];
  ws1['!freeze'] = { ySplit: 1 };
  // Colunas monetárias: VLR BASE(13), VLR HORA EXTRA(14), KM. EXTRA(15), ADICIONAL(16), VALOR A FATURAR(17)
  const moneyIdx = [13, 14, 15, 16, 17];
  for (let r = 1; r <= rowsDet.length + 1; r++) {
    moneyIdx.forEach(c => { const cell = ws1[XLSX.utils.encode_cell({ r, c })]; if (cell && typeof cell.v === 'number') cell.z = '"R$ "#,##0.00'; });
  }
  // Aba Resumo por Base / Tipo (round monetário em cada grupo)
  const resumoBase = {};
  itens.forEach(l => {
    const e = l.extras || {};
    const base = e.equipe || e.base || '—';
    const sv = servicos.find(x => x.cod === l.codServico);
    const tipo = sv?.categoriaServico || '—';
    const k = `${base} | ${tipo}`;
    if (!resumoBase[k]) resumoBase[k] = { qtd: 0, fatura: 0 };
    resumoBase[k].qtd++; resumoBase[k].fatura = roundMoney(resumoBase[k].fatura + num(l.totalFatura));
  });
  const periodo = fatura.periodo;
  const totalFaturaResumo = sumMoney(itens, l => l.totalFatura);
  const ws2Data = [
    ['RELATÓRIO DE FATURAMENTO - NATURA'],
    [],
    ['Cliente:', fatura.cliente],
    ['CNPJ:', cnpj],
    ['Período:', periodo],
    ['Quantidade de operações:', itens.length],
    [],
    ['RESUMO POR BASE / TIPO'],
    ['Base | Tipo', 'Qtd', 'Faturado'],
    ...Object.entries(resumoBase).sort((a, b) => b[1].fatura - a[1].fatura).map(([k, r]) => [k, r.qtd, r.fatura]),
    [],
    ['TOTAL FATURADO:', '', totalFaturaResumo],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
  ws2['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 16 }];
  for (let r = 0; r < ws2Data.length; r++) {
    for (let c = 0; c < (ws2Data[r] || []).length; c++) {
      const cell = ws2[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === 'number' && c >= 2) cell.z = '"R$ "#,##0.00';
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Detalhamento');
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumo');
  const cliSafe = (fatura.cliente || 'Natura').replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `Fatura_${cliSafe}_${fatura.periodo}.xlsx`);
}

function exportarFaturaPadraoXLSX(fatura, servicos) {
  const t = TEMPLATES[fatura.template];
  const itens = [...fatura.lancs].sort((a, b) => a.data.localeCompare(b.data));
  const allCols = [
    { l: 'OS', w: 10, alwaysShow: true, f: l => l.os || '' },
    { l: 'DATA', w: 11, alwaysShow: true, f: l => fmtData(l.data) },
    { l: 'CLIENTE', w: 22, alwaysShow: true, f: l => l.cliente },
    { l: 'COD. EMISSÃO', w: 11, f: (l, s) => s?.emissao || '' },
    { l: 'DIA', w: 14, f: l => diaSemanaPt(l.data) },
    { l: 'FERIADO', w: 8, f: l => l.isDomingo ? 'SIM' : '' },
    { l: 'FRANQUIA', w: 9, f: (l, s) => num(s?.franquiaHoras) > 0 ? fmtHorasHHMM(s.franquiaHoras) : '' },
    { l: 'franq km', w: 9, f: (l, s) => num(s?.franquiaKm) || '' },
    { l: 'HR INICIO', w: 16, f: l => fmtDateTimeXLS(l.extras?.inicio) },
    { l: 'HR FIM', w: 16, f: l => fmtDateTimeXLS(l.extras?.termino) },
    { l: 'KM INI', w: 9, f: l => num(l.extras?.kmInicial) || '' },
    { l: 'KM FIM', w: 9, f: l => num(l.extras?.kmFinal) || '' },
    { l: 'B.EXTRA', w: 9, f: l => num(l.batidaExtra) || '', money: true },
    { l: 'KM TOTAL', w: 9, f: l => num(l.kmRodados) || '' },
    { l: 'KM EXTRA', w: 9, f: l => num(l.kmExtras) || '' },
    { l: 'HR TOTAL', w: 9, f: l => num(l.horasTrabalhadas) > 0 ? fmtHorasHHMM(l.horasTrabalhadas) : '' },
    { l: 'HORAS EXTRAS', w: 13, f: l => num(l.horasExtras) > 0 ? fmtHorasHHMM(l.horasExtras) : '' },
    { l: 'AGENTE', w: 30, f: l => l.extras?.agente1 || l.extras?.agente || l.extras?.motorista || '' },
    { l: 'AGENTE 2', w: 30, f: l => l.extras?.agente2 || '' },
    { l: 'VLR BASE', w: 11, f: (l, s) => num(s?.valorFatura) || '', money: true },
    { l: 'VLR HORA EXTRA', w: 14, f: l => num(l.extraHorasFatura) || '', money: true },
    { l: 'KM. EXTRA', w: 11, f: l => num(l.extraKmFatura) || '', money: true },
    { l: 'ADICIONAL', w: 11, f: l => num(l.adicDomFatura) || '', money: true },
    { l: 'PEDÁGIOS', w: 11, f: l => num(l.pedagioFatura) || '', money: true },
    { l: 'VALOR', w: 12, alwaysShow: true, f: l => num(l.totalFatura), money: true },
  ];
  const tableData = itens.map(l => { const s = servicos.find(x => x.cod === l.codServico); return allCols.map(col => col.f(l, s)); });
  const isVazio = (v) => v === null || v === undefined || v === '' || v === 0;
  const colsKeep = allCols.map((col, i) => col.alwaysShow || tableData.some(row => !isVazio(row[i])));
  const colsFiltered = allCols.filter((_, i) => colsKeep[i]);
  const headers = colsFiltered.map(c => c.l);
  const rowsDet = tableData.map(row => row.filter((_, i) => colsKeep[i]));
  const sum = (key) => sumMoney(itens, l => l[key]);
  const valorBaseTotal = sumMoney(itens, l => { const sv = servicos.find(x => x.cod === l.codServico); return num(sv?.valorFatura); });
  const totalDeColuna = (label) => {
    if (label === 'KM TOTAL') return sum('kmRodados') || '';
    if (label === 'KM EXTRA') return sum('kmExtras') || '';
    if (label === 'B.EXTRA') return sum('batidaExtra') || '';
    if (label === 'VLR BASE') return valorBaseTotal || '';
    if (label === 'VLR HORA EXTRA') return sum('extraHorasFatura') || '';
    if (label === 'KM. EXTRA') return sum('extraKmFatura') || '';
    if (label === 'ADICIONAL') return sum('adicDomFatura') || '';
    if (label === 'PEDÁGIOS') return sum('pedagioFatura') || '';
    if (label === 'VALOR') return fatura.totalFatura;
    return '';
  };
  const totalRow = colsFiltered.map((c) => c.l === 'DATA' ? 'TOTAL' : (c.l === 'OS' ? '' : totalDeColuna(c.l)));
  const ws1 = XLSX.utils.aoa_to_sheet([headers, ...rowsDet, totalRow]);
  ws1['!cols'] = colsFiltered.map(c => ({ wch: c.w }));
  ws1['!freeze'] = { ySplit: 1 };
  const moneyIdx = colsFiltered.map((c, i) => c.money ? i : -1).filter(i => i >= 0);
  for (let r = 1; r <= rowsDet.length + 1; r++) {
    moneyIdx.forEach(c => { const cell = ws1[XLSX.utils.encode_cell({ r, c })]; if (cell && typeof cell.v === 'number') cell.z = '"R$ "#,##0.00'; });
  }
  const resumoServico = {};
  itens.forEach(l => { if (!resumoServico[l.codServico]) resumoServico[l.codServico] = { descricao: l.descricao, qtd: 0, fatura: 0 }; resumoServico[l.codServico].qtd++; resumoServico[l.codServico].fatura = roundMoney(resumoServico[l.codServico].fatura + num(l.totalFatura)); });
  const totalFaturaRecalc = sumMoney(itens, l => l.totalFatura);
  const totalQtyHrTrab = sumQty(itens, l => l.horasTrabalhadas);
  const totalQtyHrExtra = sumQty(itens, l => l.horasExtras);
  const totalQtyKmRodados = sumQty(itens, l => l.kmRodados);
  const totalQtyKmExtras = sumQty(itens, l => l.kmExtras);
  const composicao = [];
  if (valorBaseTotal > 0) composicao.push(['Valor base (soma serviços):', valorBaseTotal]);
  if (sum('extraHorasFatura') > 0) composicao.push(['Adicional horas extras:', sum('extraHorasFatura')]);
  if (sum('extraKmFatura') > 0) composicao.push(['Adicional KM extras:', sum('extraKmFatura')]);
  if (sum('adicDomFatura') > 0) composicao.push(['Adicional domingo/feriado:', sum('adicDomFatura')]);
  if (sum('pedagioFatura') > 0) composicao.push(['Pedágios:', sum('pedagioFatura')]);
  if (sum('batidaExtra') > 0) composicao.push(['Batidas extras:', sum('batidaExtra')]);
  const operacionais = [];
  if (totalQtyHrTrab > 0) operacionais.push(['Total de horas trabalhadas:', fmtHorasHHMM(totalQtyHrTrab)]);
  if (totalQtyHrExtra > 0) operacionais.push(['Total de horas extras:', fmtHorasHHMM(totalQtyHrExtra)]);
  if (totalQtyKmRodados > 0) operacionais.push(['Total de KM rodados:', totalQtyKmRodados]);
  if (totalQtyKmExtras > 0) operacionais.push(['Total de KM extras:', totalQtyKmExtras]);
  const ws2Data = [['RELATÓRIO DE FATURAMENTO'], [], ['Cliente:', fatura.cliente], ['Período:', fmtPeriodo(fatura.periodo, t)], ['Template:', t?.nome || '']];
  if (itens[0]?.cnpj) ws2Data.push(['CNPJ:', itens[0].cnpj]);
  ws2Data.push(['Quantidade de operações:', itens.length]);
  if (operacionais.length) { ws2Data.push([], ['TOTAIS OPERACIONAIS'], ...operacionais); }
  if (composicao.length) { ws2Data.push([], ['COMPOSIÇÃO DO FATURAMENTO'], ...composicao, ['TOTAL FATURADO:', totalFaturaRecalc]); }
  ws2Data.push([], ['RESUMO POR SERVIÇO'], ['Código', 'Descrição', 'Qtd Operações', 'Faturado']);
  Object.entries(resumoServico).sort((a, b) => b[1].fatura - a[1].fatura).forEach(([cod, r]) => { ws2Data.push([cod, r.descricao, r.qtd, r.fatura]); });
  const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
  ws2['!cols'] = [{ wch: 32 }, { wch: 36 }, { wch: 14 }, { wch: 14 }];
  for (let r = 0; r < ws2Data.length; r++) {
    for (let c = 0; c < (ws2Data[r] || []).length; c++) {
      const cell = ws2[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === 'number' && c >= 1) cell.z = '"R$ "#,##0.00';
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Detalhamento');
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumo');
  const cliSafe = fatura.cliente.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `Fatura_${cliSafe}_${fatura.periodo}.xlsx`);
}

// ============ EXPORTAÇÃO RESUMO DE FECHAMENTO ============
function exportarResumoFechamentoXLSX(resumo, competencia) {
  const wb = XLSX.utils.book_new();
  const mesNome = (() => { const [y, m] = competencia.split('-').map(Number); return `${MESES[m - 1].toUpperCase()} DE ${y}`; })();

  // ABA 1: FATURAMENTO POR CLIENTE (consolidado — igual à tela)
  const fatMap = {};
  resumo.faturamento.forEach(f => {
    const base = (f.cliente || '').split(' - ')[0].trim();
    fatMap[base] = (fatMap[base] || 0) + num(f.valor);
  });
  const fatRows = [['CLIENTE', 'VALOR']];
  Object.entries(fatMap).sort((a, b) => a[0].localeCompare(b[0])).forEach(([c, v]) => fatRows.push([c, roundMoney(v)]));
  fatRows.push([]);
  fatRows.push(['TOTAL', resumo.totalFaturamento]);
  const ws1 = XLSX.utils.aoa_to_sheet(fatRows);
  ws1['!cols'] = [{ wch: 44 }, { wch: 18 }];
  for (let r = 1; r < fatRows.length; r++) {
    const cell = ws1[XLSX.utils.encode_cell({ r, c: 1 })];
    if (cell && typeof cell.v === 'number') cell.z = '"R$ "#,##0.00';
  }
  XLSX.utils.book_append_sheet(wb, ws1, 'Faturamento');

  // ABA 2: FOLHA POR CATEGORIA (alinhado com o painel Resumo)
  const folhaRows = [['CATEGORIA', 'VALOR', 'QTD']];
  (resumo.folhaPorCategoria || []).forEach(f => folhaRows.push([f.categoria, f.total, f.qtd]));
  folhaRows.push([]);
  folhaRows.push(['TOTAL', resumo.totalFolhaPorCategoria]);
  const ws2 = XLSX.utils.aoa_to_sheet(folhaRows);
  ws2['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 8 }];
  for (let r = 1; r < folhaRows.length; r++) {
    const cell = ws2[XLSX.utils.encode_cell({ r, c: 1 })];
    if (cell && typeof cell.v === 'number') cell.z = '"R$ "#,##0.00';
  }
  XLSX.utils.book_append_sheet(wb, ws2, 'Folha Cat.');

  // ABA 3: SALÁRIOS FIXOS POR GRUPO
  const salRows = [['GRUPO', 'FUNCIONÁRIOS', 'QTD', 'TOTAL SALÁRIOS']];
  (resumo.salariosFixosGrupos || []).forEach(g => salRows.push([g.grupo, (g.nomes || []).join(', '), g.qtd, g.total]));
  salRows.push([]);
  salRows.push(['TOTAL', '', '', resumo.totalSalariosFixos]);
  const ws2b = XLSX.utils.aoa_to_sheet(salRows);
  ws2b['!cols'] = [{ wch: 20 }, { wch: 50 }, { wch: 6 }, { wch: 18 }];
  for (let r = 1; r < salRows.length; r++) {
    const cell = ws2b[XLSX.utils.encode_cell({ r, c: 3 })];
    if (cell && typeof cell.v === 'number') cell.z = '"R$ "#,##0.00';
  }
  XLSX.utils.book_append_sheet(wb, ws2b, 'Salários Fixos');

  // ABA 3: ADIANTAMENTOS
  const adiantRows = [['BENEFICIARIO', 'COMPETENCIA', 'TIPO', 'VALOR', 'C. CUSTO', 'FORMA DE PAGAMENTO']];
  resumo.adiantamentos.forEach(a => adiantRows.push([a.alvoNome, fmtMes(a.competencia), a.tipoVale, num(a.valor), a.centroCusto || '', a.formaPagamento || '']));
  adiantRows.push([]);
  adiantRows.push(['TOTAL', '', '', resumo.totalAdiantamentos]);
  const ws3 = XLSX.utils.aoa_to_sheet(adiantRows);
  ws3['!cols'] = [{ wch: 38 }, { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 22 }];
  for (let r = 1; r < adiantRows.length; r++) {
    const cell = ws3[XLSX.utils.encode_cell({ r, c: 3 })];
    if (cell && typeof cell.v === 'number') cell.z = '"R$ "#,##0.00';
  }
  XLSX.utils.book_append_sheet(wb, ws3, 'Adiantamentos');

  // ABA 4: DESPESAS FIXAS
  const fixasRows = [['LANÇAMENTO', 'COMPETENCIA', 'TIPO', 'VALOR', 'Origem']];
  resumo.despesasFixas.forEach(d => fixasRows.push([d.descricao, mesNome, d.tipo, num(d.valor), d.origem || '']));
  fixasRows.push([]);
  fixasRows.push(['TOTAL', '', '', resumo.totalFixas]);
  const ws4 = XLSX.utils.aoa_to_sheet(fixasRows);
  ws4['!cols'] = [{ wch: 38 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
  for (let r = 1; r < fixasRows.length; r++) {
    const cell = ws4[XLSX.utils.encode_cell({ r, c: 3 })];
    if (cell && typeof cell.v === 'number') cell.z = '"R$ "#,##0.00';
  }
  XLSX.utils.book_append_sheet(wb, ws4, 'Despesas Fixas');

  // ABA 5: DESPESAS AVULSAS
  const avRows = [['LANÇAMENTO', 'COMPETENCIA', 'TIPO', 'VALOR', 'Origem']];
  resumo.despesasAvulsas.forEach(d => avRows.push([d.descricao, mesNome, d.tipo, num(d.valor), d.origem || '']));
  avRows.push([]);
  avRows.push(['TOTAL', '', '', resumo.totalAvulsas]);
  const ws5 = XLSX.utils.aoa_to_sheet(avRows);
  ws5['!cols'] = [{ wch: 38 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
  for (let r = 1; r < avRows.length; r++) {
    const cell = ws5[XLSX.utils.encode_cell({ r, c: 3 })];
    if (cell && typeof cell.v === 'number') cell.z = '"R$ "#,##0.00';
  }
  XLSX.utils.book_append_sheet(wb, ws5, 'Despesas Avulsas');

  // ABA 6: PARCELAMENTOS (v99 — consolidado: Despesa op + Chefia + Vale)
  // Mostra todos os parcelamentos ATIVOS da competência. Informativo: não soma em custoTotal,
  // pois cada parcela já está contabilizada em seu bloco de origem (Despesas / Chefia / Adiantamentos).
  const pTodos = resumo.parcelamentosTodos || [];
  const pRows = [['ORIGEM', 'LANÇAMENTO / BENEFICIÁRIO', 'PARCELA', 'CATEGORIA / TIPO', 'COMPETENCIA', 'VALOR']];
  pTodos.forEach(p => pRows.push([
    p._origem,
    p.descricao,
    (p.atual && p.total) ? `${p.atual}/${p.total}` : '—',
    p.origem || '',
    mesNome,
    num(p.valor),
  ]));
  pRows.push([]);
  pRows.push(['TOTAL', '', '', '', '', resumo.totalParcelamentosTodos || 0]);
  pRows.push([]);
  pRows.push(['Detalhamento por origem']);
  pRows.push(['Despesa op.', '', '', '', '', resumo.totalParcelasDespesa || 0]);
  pRows.push(['Chefia', '', '', '', '', resumo.totalParcelasChefia || 0]);
  pRows.push(['Vale', '', '', '', '', resumo.totalParcelasVale || 0]);
  const ws6 = XLSX.utils.aoa_to_sheet(pRows);
  ws6['!cols'] = [{ wch: 12 }, { wch: 36 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 14 }];
  for (let r = 1; r < pRows.length; r++) {
    const cell = ws6[XLSX.utils.encode_cell({ r, c: 5 })];
    if (cell && typeof cell.v === 'number') cell.z = '"R$ "#,##0.00';
  }
  XLSX.utils.book_append_sheet(wb, ws6, 'Parcelamentos');

  // ABA 7: DESPESAS DA CHEFIA
  const chRows = [['LANÇAMENTO', 'COMPETENCIA', 'TIPO', 'ORIGEM', 'VALOR']];
  (resumo.despesasChefia || []).forEach(d => chRows.push([d.descricao, mesNome, d.tipo, d.origem || '', num(d.valor)]));
  chRows.push([]);
  chRows.push(['TOTAL', '', '', '', resumo.totalDespChefia || 0]);
  const ws7ch = XLSX.utils.aoa_to_sheet(chRows);
  ws7ch['!cols'] = [{ wch: 38 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
  for (let r = 1; r < chRows.length; r++) {
    const cell = ws7ch[XLSX.utils.encode_cell({ r, c: 4 })];
    if (cell && typeof cell.v === 'number') cell.z = '"R$ "#,##0.00';
  }
  XLSX.utils.book_append_sheet(wb, ws7ch, 'Desp. Chefia');

  // ABA 8: CONSOLIDADO
  const totalImpostoFat = num(resumo.totalImpostoFat);
  const custoTotal = resumo.totalFolhaPorCategoria + resumo.totalFixas + resumo.totalAvulsas + resumo.totalParcelamentos + resumo.totalAdiantamentos + (resumo.totalDespChefia || 0);
  const resultado = resumo.totalFaturamento - totalImpostoFat - custoTotal;
  const cRows = [
    ['RESUMO DE FECHAMENTO'],
    ['Competência:', mesNome],
    ['Gerado em:', new Date().toLocaleString('pt-BR')],
    [],
    ['BLOCO', 'TOTAL'],
    ['Faturamento total', resumo.totalFaturamento],
    ['Imposto sobre faturado', totalImpostoFat],
    ['Folha total', resumo.totalFolhaPorCategoria],
    ['Adiantamentos', resumo.totalAdiantamentos],
    ['Despesas Fixas', resumo.totalFixas],
    ['Despesas Avulsas', resumo.totalAvulsas],
    ['Parcelamentos', resumo.totalParcelamentos],
    ['Despesas Chefia', resumo.totalDespChefia || 0],
    [],
    ['Custo total (folha + despesas + adiant. + chefia)', custoTotal],
    ['Resultado (faturado − imposto − custos)', resultado],
  ];
  const ws7 = XLSX.utils.aoa_to_sheet(cRows);
  ws7['!cols'] = [{ wch: 44 }, { wch: 18 }];
  for (let r = 0; r < cRows.length; r++) {
    const cell = ws7[XLSX.utils.encode_cell({ r, c: 1 })];
    if (cell && typeof cell.v === 'number') cell.z = '"R$ "#,##0.00';
  }
  XLSX.utils.book_append_sheet(wb, ws7, 'Consolidado');

  // ABA 9: RELATÓRIO GERENCIAL — DESPESAS (mesmo cálculo do painel da tela)
  const totalFolhaRG = num(resumo.totalFolhaPorCategoria);
  const totalValesRG = num(resumo.totalAdiantamentos);
  const folhaLiquidaRG = roundMoney(totalFolhaRG - totalValesRG);
  const todasOpRG = [...(resumo.despesasFixas || []), ...(resumo.despesasAvulsas || []), ...(resumo.parcelamentos || [])];
  const totalCartaoEmpresaRG = sumMoney(todasOpRG.filter(d => ['CARTAO CORPORATIVO', 'EMPRESA'].includes(normalizar(d.origem))), d => d.valor);
  const totalGalopRG = sumMoney((resumo.despesasAvulsas || []).filter(d => normalizar(d.origem).includes('GALOP')), d => d.valor);
  const totalManhaesRG = sumMoney((resumo.despesasChefia || []).filter(d => normalizar(d.origem) === normalizar('MANHÃES')), d => d.valor);
  const totalRicardoRG = sumMoney((resumo.despesasChefia || []).filter(d => normalizar(d.origem) === 'RICARDO'), d => d.valor);
  const totalGeralPagarRG = roundMoney(folhaLiquidaRG + totalCartaoEmpresaRG + totalGalopRG + totalManhaesRG + totalRicardoRG);

  const rgRows = [
    ['RELATÓRIO GERENCIAL — DESPESAS'],
    ['Competência:', mesNome],
    ['Gerado em:', new Date().toLocaleString('pt-BR')],
    [],
    ['ITEM', 'VALOR (R$)'],
    ['Folha total (bruto)', totalFolhaRG],
    ['(−) Vales / Adiantamentos', totalValesRG],
    ['= Folha líquida a pagar', folhaLiquidaRG],
    [],
    ['(+) Despesas do mês', totalCartaoEmpresaRG],
    ['(+) Galop (combustível)', totalGalopRG],
    ['(+) Despesas Manhães', totalManhaesRG],
    ['(+) Despesas Ricardo', totalRicardoRG],
    [],
    ['= TOTAL GERAL A PAGAR', totalGeralPagarRG],
  ];
  const ws8 = XLSX.utils.aoa_to_sheet(rgRows);
  ws8['!cols'] = [{ wch: 36 }, { wch: 18 }];
  for (let r = 0; r < rgRows.length; r++) {
    const cell = ws8[XLSX.utils.encode_cell({ r, c: 1 })];
    if (cell && typeof cell.v === 'number') cell.z = '"R$ "#,##0.00';
  }
  XLSX.utils.book_append_sheet(wb, ws8, 'Relatório Gerencial');

  XLSX.writeFile(wb, `Resumo_Fechamento_${competencia}.xlsx`);
}

// ============ EXPORTAÇÃO CATÁLOGO DE SERVIÇOS ============
function exportarServicosXLSX(servicos) {
  const headers = ['Cód.', 'Descrição', 'Cliente', 'CNPJ', 'Template', 'Categoria', 'Status', 'Alíquota (%)', 'Valor Fatura (R$)', 'Franquia Horas', 'Franquia KM', 'H.Extra Fatura (R$)', 'KM Extra Fatura (R$)', 'Diária Paga (R$)', 'H.Extra Paga (R$)', 'KM Extra Pago (R$)', 'Adicional Dom. Fatura (R$)', 'Adicional Dom. Pago (R$)', 'Emissão'];
  const rows = servicos.map(s => [
    s.cod, s.descricao, s.cliente, s.cnpj || '', s.template || '', s.categoriaServico || '',
    s.status || 'ATIVO', num(s.aliquota), num(s.valorFatura),
    num(s.franquiaHoras), num(s.franquiaKm),
    num(s.horaExtraFatura), num(s.kmExtraFatura),
    num(s.diariaPaga), num(s.horaExtraPaga), num(s.kmExtraPago),
    num(s.adicionalDomingosFatura), num(s.adicionalDomingosPago),
    s.emissao || '',
  ]);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [{ wch: 8 }, { wch: 26 }, { wch: 28 }, { wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 8 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 22 }, { wch: 10 }];
  const currencyCols = [7, 8, 11, 12, 13, 14, 15, 16, 17];
  for (let r = 1; r <= rows.length; r++) {
    currencyCols.forEach(c => {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === 'number') cell.z = '#,##0.00';
    });
  }
  XLSX.utils.book_append_sheet(wb, ws, 'Serviços');
  XLSX.writeFile(wb, `Servicos_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ============ EXPORTAÇÃO FUNCIONÁRIOS ============
function exportarFuncionariosXLSX(funcionarios) {
  const headers = ['ID', 'Nome', 'Categoria', 'Status', 'CPF', 'RG', 'Data Nascimento', 'Estado Civil', 'Nacionalidade', 'Telefone', 'E-mail', 'Endereço', 'CEP', 'Cidade', 'UF', 'Salário Fixo (R$)', 'Valor Diária (R$)', 'Tipo PIX', 'Chave PIX', 'Observações'];
  const rows = funcionarios.map(f => [
    f.id, f.nome, f.categoria, f.status || 'ATIVO',
    f.cpf || '', f.rg || '', f.dataNascimento || '', f.estadoCivil || '', f.nacionalidade || 'Brasileira',
    f.telefone || '', f.email || '', f.endereco || '', f.cep || '', f.cidade || '', f.uf || '',
    num(f.salarioFixo), num(f.valorDiaria),
    f.tipoPix || '', f.chavePix || '', f.notas || '',
  ]);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [{ wch: 7 }, { wch: 36 }, { wch: 20 }, { wch: 8 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 26 }, { wch: 36 }, { wch: 10 }, { wch: 18 }, { wch: 5 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 22 }, { wch: 30 }];
  for (let r = 1; r <= rows.length; r++) {
    [15, 16].forEach(c => {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === 'number') cell.z = '#,##0.00';
    });
  }
  XLSX.utils.book_append_sheet(wb, ws, 'Funcionários');
  XLSX.writeFile(wb, `Funcionarios_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ============ EXPORTAÇÃO DESPESAS ============
function exportarDespesasXLSX(despesas) {
  const wb = XLSX.utils.book_new();

  const headers = ['Competência', 'Lançamento', 'Tipo', 'Centro de Custo', 'Origem', 'Valor (R$)', 'Status', 'Observações'];
  const dataRows = despesas.map(d => [
    d.competencia || '',
    d.descricao || '',
    d.tipo || 'AVULSA',
    d.centroCusto || '',
    d.origem || '',
    num(d.valor),
    d.status || 'pendente',
    d.observacoes || '',
  ]);
  const totalGeral = despesas.reduce((s, d) => s + num(d.valor), 0);
  dataRows.push([]);
  dataRows.push([`Total (${despesas.length})`, '', '', '', '', totalGeral, '', '']);
  const ws1 = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  ws1['!cols'] = [{ wch: 14 }, { wch: 40 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 10 }, { wch: 30 }];
  for (let r = 1; r <= dataRows.length; r++) {
    const cell = ws1[XLSX.utils.encode_cell({ r, c: 5 })];
    if (cell && typeof cell.v === 'number') cell.z = '"R$ "#,##0.00';
  }
  XLSX.utils.book_append_sheet(wb, ws1, 'Despesas');

  const porTipo = {};
  despesas.forEach(d => {
    const t = d.tipo || 'AVULSA';
    if (!porTipo[t]) porTipo[t] = { qtd: 0, total: 0 };
    porTipo[t].qtd++;
    porTipo[t].total += num(d.valor);
  });
  const resumoRows = [['Tipo', 'Qtd', 'Total (R$)']];
  Object.entries(porTipo).forEach(([t, v]) => resumoRows.push([t, v.qtd, v.total]));
  resumoRows.push([]);
  resumoRows.push(['TOTAL', despesas.length, totalGeral]);
  const ws2 = XLSX.utils.aoa_to_sheet(resumoRows);
  ws2['!cols'] = [{ wch: 14 }, { wch: 8 }, { wch: 16 }];
  for (let r = 1; r < resumoRows.length; r++) {
    const cell = ws2[XLSX.utils.encode_cell({ r, c: 2 })];
    if (cell && typeof cell.v === 'number') cell.z = '"R$ "#,##0.00';
  }
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumo');

  XLSX.writeFile(wb, `Despesas_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ============ EXPORTAÇÃO VALES/DESCONTOS ============
function exportarDescontosXLSX(descontos) {
  const wb = XLSX.utils.book_new();

  const headers = ['Competência', 'Beneficiário', 'Tipo Vale', 'Centro de Custo', 'Forma de Pagamento', 'Valor (R$)', 'Observações'];
  const dataRows = descontos.map(d => [
    d.competencia || '',
    d.alvoNome || '',
    d.tipoVale || 'VALE',
    d.centroCusto || '',
    d.formaPagamento || '',
    num(d.valor),
    d.observacoes || '',
  ]);
  const totalGeral = descontos.reduce((s, d) => s + num(d.valor), 0);
  dataRows.push([]);
  dataRows.push([`Total (${descontos.length})`, '', '', '', '', totalGeral, '']);
  const ws1 = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  ws1['!cols'] = [{ wch: 14 }, { wch: 38 }, { wch: 24 }, { wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 30 }];
  for (let r = 1; r <= dataRows.length; r++) {
    const cell = ws1[XLSX.utils.encode_cell({ r, c: 5 })];
    if (cell && typeof cell.v === 'number') cell.z = '"R$ "#,##0.00';
  }
  XLSX.utils.book_append_sheet(wb, ws1, 'Vales');

  const porTipo = {};
  descontos.forEach(d => {
    const t = d.tipoVale || 'VALE';
    if (!porTipo[t]) porTipo[t] = { qtd: 0, total: 0 };
    porTipo[t].qtd++;
    porTipo[t].total += num(d.valor);
  });
  const resumoRows = [['Tipo Vale', 'Qtd', 'Total (R$)']];
  Object.entries(porTipo).forEach(([t, v]) => resumoRows.push([t, v.qtd, v.total]));
  resumoRows.push([]);
  resumoRows.push(['TOTAL', descontos.length, totalGeral]);
  const ws2 = XLSX.utils.aoa_to_sheet(resumoRows);
  ws2['!cols'] = [{ wch: 24 }, { wch: 8 }, { wch: 16 }];
  for (let r = 1; r < resumoRows.length; r++) {
    const cell = ws2[XLSX.utils.encode_cell({ r, c: 2 })];
    if (cell && typeof cell.v === 'number') cell.z = '"R$ "#,##0.00';
  }
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumo');

  XLSX.writeFile(wb, `Vales_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ============ EXPORTAÇÃO FOLHA POR CATEGORIA ============
function exportarFolhaCategoriaXLSX(folhas) {
  const wb = XLSX.utils.book_new();

  // Aba 1: listagem detalhada ordenada por categoria → nome → mês
  const det = [['CATEGORIA', 'FUNCIONÁRIO', 'MÊS', 'BRUTO', 'DESCONTOS', 'LÍQUIDO']];
  [...folhas].sort((a, b) =>
    (a.categoriaFolha || '').localeCompare(b.categoriaFolha || '') ||
    a.funcionario.nome.localeCompare(b.funcionario.nome) ||
    a.periodo.localeCompare(b.periodo)
  ).forEach(f => det.push([
    f.categoriaFolha || '(sem categoria)',
    f.funcionario.nome,
    fmtMes(f.periodo),
    f.bruto,
    f.descontos,
    f.liquido,
  ]));
  det.push([]);
  det.push(['TOTAL', '', '', roundMoney(folhas.reduce((s, f) => s + f.bruto, 0)), roundMoney(folhas.reduce((s, f) => s + f.descontos, 0)), roundMoney(folhas.reduce((s, f) => s + f.liquido, 0))]);
  const ws1 = XLSX.utils.aoa_to_sheet(det);
  ws1['!cols'] = [{ wch: 22 }, { wch: 32 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
  for (let r = 1; r < det.length; r++) {
    [3, 4, 5].forEach(c => { const cell = ws1[XLSX.utils.encode_cell({ r, c })]; if (cell && typeof cell.v === 'number') cell.z = '"R$ "#,##0.00'; });
  }
  XLSX.utils.book_append_sheet(wb, ws1, 'Folha Detalhada');

  // Aba 2: resumo por categoria
  const catMap = {};
  folhas.forEach(f => {
    const cat = f.categoriaFolha || '(sem categoria)';
    if (!catMap[cat]) catMap[cat] = { categoria: cat, qtd: 0, bruto: 0, descontos: 0, liquido: 0 };
    catMap[cat].qtd++;
    catMap[cat].bruto = roundMoney(catMap[cat].bruto + f.bruto);
    catMap[cat].descontos = roundMoney(catMap[cat].descontos + f.descontos);
    catMap[cat].liquido = roundMoney(catMap[cat].liquido + f.liquido);
  });
  const res = [['CATEGORIA', 'FOLHAS', 'BRUTO', 'DESCONTOS', 'LÍQUIDO']];
  Object.values(catMap).sort((a, b) => a.categoria ? a.categoria.localeCompare(b.categoria) : -1).forEach(c =>
    res.push([c.categoria || '(sem categoria)', c.qtd, c.bruto, c.descontos, c.liquido])
  );
  res.push([]);
  res.push(['TOTAL', folhas.length, roundMoney(folhas.reduce((s, f) => s + f.bruto, 0)), roundMoney(folhas.reduce((s, f) => s + f.descontos, 0)), roundMoney(folhas.reduce((s, f) => s + f.liquido, 0))]);
  const ws2 = XLSX.utils.aoa_to_sheet(res);
  ws2['!cols'] = [{ wch: 22 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
  for (let r = 1; r < res.length; r++) {
    [2, 3, 4].forEach(c => { const cell = ws2[XLSX.utils.encode_cell({ r, c })]; if (cell && typeof cell.v === 'number') cell.z = '"R$ "#,##0.00'; });
  }
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumo Cat.');

  const mes = folhas.length > 0 ? folhas[0].periodo : new Date().toISOString().slice(0, 7);
  XLSX.writeFile(wb, `folha_categorias_${mes}.xlsx`);
}

// ============ HEADER MAPS (importação) ============
const HEADER_MAP_DESPESA = { DATA: '@data', LANCAMENTO: 'descricao', LANCAMENTOS: 'descricao', LAMCAMENTO: 'descricao', LANCTO: 'descricao', ITEM: 'descricao', DESCRICAO: 'descricao', DESCRIPTION: 'descricao', COMPETENCIA: 'competencia', COMPENTENCIA: 'competencia', MES: 'competencia', MESCOMPETENCIA: 'competencia', TIPO: 'tipo', TYPE: 'tipo', VALOR: 'valor', VALORRS: 'valor', VLR: 'valor', PRECO: 'valor', CCUSTO: 'centroCusto', CENTROCUSTO: 'centroCusto', CENTRODECUSTO: 'centroCusto', CARTAO: 'centroCusto', BANCO: 'centroCusto', PAGADOR: 'centroCusto', ORIGEM: 'origem', ORIGIN: 'origem', RESPONSAVEL: 'origem', STATUS: 'status', SITUACAO: 'status', OBSERVACOES: 'observacoes', OBSERVACAO: 'observacoes', OBS: 'observacoes' };
const HEADER_MAP_DESCONTO = { DATA: '@data', BENEFICIARIO: 'alvoNome', BENEFICIARIOS: 'alvoNome', NOME: 'alvoNome', FUNCIONARIO: 'alvoNome', AGENTE: 'alvoNome', COMPETENCIA: 'competencia', COMPENTENCIA: 'competencia', MES: 'competencia', MESCOMPETENCIA: 'competencia', TIPO: 'tipoVale', TYPE: 'tipoVale', VALOR: 'valor', VALORRS: 'valor', VALOT: 'valor', VLR: 'valor', CCUSTO: 'centroCusto', CENTROCUSTO: 'centroCusto', CENTRODECUSTO: 'centroCusto', CARTAO: 'centroCusto', BANCO: 'centroCusto', FORMADEPAGAMENTO: 'formaPagamento', FORMAPAGAMENTO: 'formaPagamento', FORMAPGTO: 'formaPagamento', PAGAMENTO: 'formaPagamento', PGTO: 'formaPagamento', OBSERVACOES: 'observacoes', OBSERVACAO: 'observacoes', OBS: 'observacoes' };

// ============ MODELO E IMPORTAÇÃO DE FUNCIONÁRIOS ============
// Colunas oficiais do modelo (ordem importa pra exportação).
const COLUNAS_FUNCIONARIO = [
  { col: 'Nome*', campo: 'nome', exemplo: 'JOÃO DA SILVA SANTOS', obrigatorio: true },
  { col: 'Categoria*', campo: 'categoria', exemplo: 'Agente Escolta', obrigatorio: true },
  { col: 'Status', campo: 'status', exemplo: 'ATIVO', obrigatorio: false },
  { col: 'CPF', campo: 'cpf', exemplo: '123.456.789-00', obrigatorio: false },
  { col: 'RG', campo: 'rg', exemplo: '12.345.678-9', obrigatorio: false },
  { col: 'Data Nascimento', campo: 'dataNascimento', exemplo: '15/03/1985', obrigatorio: false },
  { col: 'Estado Civil', campo: 'estadoCivil', exemplo: 'Solteiro(a)', obrigatorio: false },
  { col: 'Nacionalidade', campo: 'nacionalidade', exemplo: 'Brasileira', obrigatorio: false },
  { col: 'Telefone', campo: 'telefone', exemplo: '(21) 98765-4321', obrigatorio: false },
  { col: 'E-mail', campo: 'email', exemplo: 'joao@exemplo.com', obrigatorio: false },
  { col: 'Endereço', campo: 'endereco', exemplo: 'Rua Exemplo, 123 - Centro', obrigatorio: false },
  { col: 'CEP', campo: 'cep', exemplo: '20000-000', obrigatorio: false },
  { col: 'Cidade', campo: 'cidade', exemplo: 'Rio de Janeiro', obrigatorio: false },
  { col: 'UF', campo: 'uf', exemplo: 'RJ', obrigatorio: false },
  { col: 'Salário Fixo', campo: 'salarioFixo', exemplo: 1500.00, obrigatorio: false },
  { col: 'Valor Diária', campo: 'valorDiaria', exemplo: 0, obrigatorio: false },
  { col: 'Tipo PIX', campo: 'tipoPix', exemplo: 'CPF', obrigatorio: false },
  { col: 'Chave PIX', campo: 'chavePix', exemplo: '12345678900', obrigatorio: false },
  { col: 'Função', campo: 'funcao', exemplo: '', obrigatorio: false },
  { col: 'Observações', campo: 'notas', exemplo: '', obrigatorio: false },
];

function gerarModeloFuncionariosXLSX() {
  const wb = XLSX.utils.book_new();

  // Aba 1: MODELO — header + linha de exemplo
  const headers = COLUNAS_FUNCIONARIO.map(c => c.col);
  const exemplo = COLUNAS_FUNCIONARIO.map(c => c.exemplo);
  const ws1 = XLSX.utils.aoa_to_sheet([headers, exemplo]);
  ws1['!cols'] = COLUNAS_FUNCIONARIO.map(c => ({ wch: Math.max(c.col.length + 2, 16) }));
  // Negrito na linha de header (simulado via cell style — XLSX limitado, mas marcamos a primeira linha)
  ws1['!freeze'] = { ySplit: 1 };
  // Formato de data e moeda nas colunas correspondentes
  const idxDataNasc = COLUNAS_FUNCIONARIO.findIndex(c => c.campo === 'dataNascimento');
  const idxSal = COLUNAS_FUNCIONARIO.findIndex(c => c.campo === 'salarioFixo');
  const idxDi = COLUNAS_FUNCIONARIO.findIndex(c => c.campo === 'valorDiaria');
  for (let r = 1; r < 200; r++) {
    if (idxSal >= 0) { const cell = ws1[XLSX.utils.encode_cell({ r, c: idxSal })]; if (cell) cell.z = '"R$ "#,##0.00'; }
    if (idxDi >= 0) { const cell = ws1[XLSX.utils.encode_cell({ r, c: idxDi })]; if (cell) cell.z = '"R$ "#,##0.00'; }
  }
  XLSX.utils.book_append_sheet(wb, ws1, 'Funcionários');

  // Aba 2: INSTRUÇÕES
  const inst = [
    ['MODELO DE IMPORTAÇÃO DE FUNCIONÁRIOS'],
    [],
    ['INSTRUÇÕES:'],
    ['• Preencha uma linha por funcionário na aba "Funcionários".'],
    ['• Colunas marcadas com asterisco (*) são obrigatórias.'],
    ['• Não altere os nomes das colunas (cabeçalho) — eles são usados para identificar os campos.'],
    ['• A primeira linha de exemplo serve como referência. Substitua-a ou adicione novas linhas abaixo.'],
    ['• Linhas vazias (sem nome) são ignoradas.'],
    ['• Funcionários com nome já existente serão ATUALIZADOS (mesclados), não duplicados.'],
    [],
    ['CAMPO', 'DESCRIÇÃO', 'VALORES ACEITOS / FORMATO', 'OBRIG.'],
    ['Nome', 'Nome completo do funcionário', 'Texto livre, em maiúsculas é o padrão', 'SIM'],
    ['Categoria', 'Função/categoria do colaborador', 'Agente Escolta, Agente Apoio, Entregador Motolink, Motorista, Apoio Logístico, Operacional, Administrativo (ou outra)', 'SIM'],
    ['Status', 'Estado atual', 'ATIVO ou INATIVO (padrão: ATIVO)', 'NÃO'],
    ['CPF', 'CPF do funcionário', 'Pode ser com ou sem máscara (000.000.000-00)', 'NÃO'],
    ['RG', 'Documento de identidade', 'Texto livre', 'NÃO'],
    ['Data Nascimento', 'Data de nascimento', 'DD/MM/AAAA (ex: 15/03/1985) ou data Excel', 'NÃO'],
    ['Estado Civil', 'Estado civil', 'Solteiro(a), Casado(a), União Estável, Divorciado(a), Viúvo(a)', 'NÃO'],
    ['Nacionalidade', 'Nacionalidade', 'Padrão: Brasileira', 'NÃO'],
    ['Telefone', 'Telefone celular', 'Pode ter máscara (21) 98765-4321', 'NÃO'],
    ['E-mail', 'E-mail de contato', 'Formato padrão de e-mail', 'NÃO'],
    ['Endereço', 'Endereço completo', 'Rua, número, complemento, bairro', 'NÃO'],
    ['CEP', 'CEP', '00000-000', 'NÃO'],
    ['Cidade', 'Cidade', 'Texto livre', 'NÃO'],
    ['UF', 'Unidade Federativa', 'Sigla com 2 letras (ex: RJ, SP, MG)', 'NÃO'],
    ['Salário Fixo', 'Valor mensal fixo', 'Número decimal (ex: 1500 ou 1500,00). Em branco = sem salário fixo', 'NÃO'],
    ['Valor Diária', 'Valor de diária por escolta', 'Número decimal. Em branco = usa o valor do serviço', 'NÃO'],
    ['Tipo PIX', 'Tipo da chave PIX', 'CPF, CNPJ, E-mail, Telefone, Aleatória', 'NÃO'],
    ['Chave PIX', 'Chave PIX para recebimentos', 'Texto livre conforme o tipo escolhido', 'NÃO'],
    ['Função', 'Função/cargo específico', 'Texto livre (opcional, complementa a Categoria)', 'NÃO'],
    ['Observações', 'Anotações livres', 'Texto livre', 'NÃO'],
    [],
    ['DICAS:'],
    ['1. Para importar muitos funcionários, copie e cole a partir de outra planilha — apenas ajuste o cabeçalho.'],
    ['2. Foto e documentos não podem ser importados via planilha — adicione manualmente após importar.'],
    ['3. Após importar, revise os dados pessoais e financeiros antes de gerar folhas.'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(inst);
  ws2['!cols'] = [{ wch: 22 }, { wch: 50 }, { wch: 60 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Instruções');

  XLSX.writeFile(wb, 'Modelo_Importacao_Funcionarios.xlsx');
}

// Mapa de aliases para identificar colunas mesmo com pequenas variações de escrita.
const ALIASES_FUNCIONARIO = (() => {
  const m = {};
  COLUNAS_FUNCIONARIO.forEach(c => { m[normCol(c.col)] = c.campo; });
  // Aliases extras
  Object.assign(m, {
    [normCol('Nome Completo')]: 'nome', [normCol('Funcionario')]: 'nome', [normCol('Funcionário')]: 'nome', [normCol('Colaborador')]: 'nome',
    [normCol('Cargo')]: 'categoria', [normCol('Função')]: 'funcao', [normCol('Funcao')]: 'funcao',
    [normCol('Nascimento')]: 'dataNascimento', [normCol('Data de Nascimento')]: 'dataNascimento', [normCol('DataNasc')]: 'dataNascimento',
    [normCol('Celular')]: 'telefone', [normCol('Tel')]: 'telefone', [normCol('Fone')]: 'telefone',
    [normCol('Email')]: 'email', [normCol('E mail')]: 'email',
    [normCol('Endereco')]: 'endereco', [normCol('Logradouro')]: 'endereco',
    [normCol('Estado')]: 'uf',
    [normCol('Salario')]: 'salarioFixo', [normCol('Salário')]: 'salarioFixo', [normCol('Salario Fixo')]: 'salarioFixo',
    [normCol('Diaria')]: 'valorDiaria', [normCol('Diária')]: 'valorDiaria', [normCol('Valor Diaria')]: 'valorDiaria',
    [normCol('PIX')]: 'chavePix', [normCol('Chave')]: 'chavePix',
    [normCol('TipoChave')]: 'tipoPix', [normCol('TipoPIX')]: 'tipoPix', [normCol('Tipo Chave')]: 'tipoPix',
    [normCol('Obs')]: 'notas', [normCol('Observacoes')]: 'notas', [normCol('Notas')]: 'notas', [normCol('Anotacoes')]: 'notas',
  });
  return m;
})();

function parseFuncionariosFromAOA(linhas) {
  if (!linhas || linhas.length < 2) return { erros: ['Planilha vazia'], funcionarios: [] };
  // Acha a linha de header (primeira que tenha "Nome" ou similar)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(linhas.length, 5); i++) {
    const row = (linhas[i] || []).map(x => normCol(String(x || '')));
    if (row.some(c => c === 'NOME' || c === 'NOMECOMPLETO' || c === 'FUNCIONARIO')) { headerIdx = i; break; }
  }
  const header = linhas[headerIdx] || [];
  const colMap = {}; // index -> campo
  header.forEach((h, idx) => {
    const k = normCol(String(h || ''));
    if (ALIASES_FUNCIONARIO[k]) colMap[idx] = ALIASES_FUNCIONARIO[k];
  });
  if (!Object.values(colMap).includes('nome')) {
    return { erros: ['Coluna "Nome" não encontrada na planilha. Verifique se está usando o modelo correto.'], funcionarios: [] };
  }
  const funcionarios = [];
  const erros = [];
  for (let r = headerIdx + 1; r < linhas.length; r++) {
    const row = linhas[r] || [];
    if (!row.length) continue;
    const obj = {};
    Object.entries(colMap).forEach(([idx, campo]) => {
      const val = row[Number(idx)];
      if (val === undefined || val === null || val === '') return;
      obj[campo] = val;
    });
    // Pula linhas vazias (sem nome) ou que parecem ser exemplos do template
    if (!obj.nome || String(obj.nome).trim() === '') continue;
    if (String(obj.nome).trim().toUpperCase() === 'JOÃO DA SILVA SANTOS') continue; // linha de exemplo do modelo
    // Normalizações
    const f = {
      nome: String(obj.nome).trim().toUpperCase(),
      categoria: obj.categoria ? String(obj.categoria).trim() : 'Operacional',
      status: (obj.status && String(obj.status).trim().toUpperCase() === 'INATIVO') ? 'INATIVO' : 'ATIVO',
      cpf: obj.cpf ? String(obj.cpf).trim() : '',
      rg: obj.rg ? String(obj.rg).trim() : '',
      dataNascimento: (() => {
        const v = obj.dataNascimento;
        if (!v) return '';
        if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
        if (typeof v === 'number') {
          // Data serializada do Excel (dias desde 1900-01-01, com bug do 1900 leap year)
          const ms = (v - 25569) * 86400 * 1000;
          const d = new Date(ms);
          if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        }
        return parseDataBR(String(v)) || '';
      })(),
      estadoCivil: obj.estadoCivil ? String(obj.estadoCivil).trim() : '',
      nacionalidade: obj.nacionalidade ? String(obj.nacionalidade).trim() : 'Brasileira',
      telefone: obj.telefone ? String(obj.telefone).trim() : '',
      email: obj.email ? String(obj.email).trim() : '',
      endereco: obj.endereco ? String(obj.endereco).trim() : '',
      cep: obj.cep ? String(obj.cep).trim() : '',
      cidade: obj.cidade ? String(obj.cidade).trim() : '',
      uf: obj.uf ? String(obj.uf).trim().toUpperCase().slice(0, 2) : '',
      salarioFixo: parseNumeroBR(obj.salarioFixo) || 0,
      valorDiaria: parseNumeroBR(obj.valorDiaria) || 0,
      tipoPix: obj.tipoPix ? String(obj.tipoPix).trim() : 'CPF',
      chavePix: obj.chavePix ? String(obj.chavePix).trim() : '',
      funcao: obj.funcao ? String(obj.funcao).trim() : '',
      notas: obj.notas ? String(obj.notas).trim() : '',
      documentos: [],
    };
    funcionarios.push(f);
  }
  if (funcionarios.length === 0) erros.push('Nenhum funcionário encontrado nas linhas (todas estão vazias ou sem nome).');
  return { erros, funcionarios };
}

// ============ HELPER: VALOR POR EXTENSO ============
function valorPorExtensoBR(v) {
  v = Number(v) || 0;
  const inteiro = Math.floor(v);
  const centavos = Math.round((v - inteiro) * 100);
  function ext(n) {
    if (n === 0) return 'zero';
    if (n === 100) return 'cem';
    const u = ['','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
    const d = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
    const c = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
    function ate999(n) {
      if (n < 20) return u[n];
      if (n < 100) { const dz = Math.floor(n / 10); const un = n % 10; return d[dz] + (un ? ' e ' + u[un] : ''); }
      const ce = Math.floor(n / 100); const r = n % 100;
      return c[ce] + (r ? ' e ' + ate999(r) : '');
    }
    if (n < 1000) return ate999(n);
    if (n < 1000000) {
      const m = Math.floor(n / 1000); const r = n % 1000;
      const milPart = m === 1 ? 'mil' : ate999(m) + ' mil';
      return milPart + (r ? (r < 100 ? ' e ' : ' ') + ate999(r) : '');
    }
    const mi = Math.floor(n / 1000000); const r = n % 1000000;
    const miPart = mi === 1 ? 'um milhão' : ate999(mi) + ' milhões';
    return miPart + (r ? ' ' + ext(r) : '');
  }
  let txt = ext(inteiro) + (inteiro === 1 ? ' real' : ' reais');
  if (centavos > 0) txt += ' e ' + ext(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

// ============ MODELO E IMPORTAÇÃO DE SALÁRIOS FIXOS ============
function gerarModeloSalariosFixosXLSX() {
  const wb = XLSX.utils.book_new();
  const headers = ['Nome do Colaborador*', 'Salário Fixo*', 'Grupo Folha'];
  const exemplos = [
    ['JOÃO DA SILVA', 1500.00, 'ARMADA'],
    ['MARIA SANTOS', 2200.00, 'ESCRITÓRIO'],
    ['PEDRO OLIVEIRA', 1800.00, 'ARMADA'],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet([headers, ...exemplos]);
  ws1['!cols'] = [{ wch: 36 }, { wch: 16 }, { wch: 22 }];
  ws1['!freeze'] = { ySplit: 1 };
  for (let r = 1; r < 200; r++) {
    const cell = ws1[XLSX.utils.encode_cell({ r, c: 1 })];
    if (cell) cell.z = '"R$ "#,##0.00';
  }
  XLSX.utils.book_append_sheet(wb, ws1, 'Salários');
  const inst = [
    ['MODELO DE IMPORTAÇÃO DE SALÁRIOS FIXOS'],
    [],
    ['INSTRUÇÕES:'],
    ['• Use a aba "Salários" para preencher os dados.'],
    ['• Apenas colaboradores JÁ CADASTRADOS serão atualizados (busca por nome).'],
    ['• Para criar novo colaborador, use a importação completa em "Funcionários".'],
    ['• Valores aceitos: 1500 ou 1500,00 (vírgula ou ponto decimal).'],
    ['• Grupo Folha é livre — se não existir, será criado automaticamente.'],
    ['• Linhas sem nome são ignoradas.'],
    [],
    ['CAMPO', 'DESCRIÇÃO', 'OBRIGATÓRIO'],
    ['Nome do Colaborador', 'Nome cadastrado (busca por similaridade)', 'SIM'],
    ['Salário Fixo', 'Valor mensal em reais', 'SIM'],
    ['Grupo Folha', 'Categoria de folha fixa (ex: ARMADA, ESCRITÓRIO)', 'NÃO (vazio = sem grupo)'],
    [],
    ['ALIASES ACEITOS no cabeçalho:'],
    ['• Nome: Nome, Funcionario, Funcionário, Colaborador, Nome Completo'],
    ['• Salário: Salário, Salario, Salario Fixo, Valor'],
    ['• Grupo: Grupo, Grupo Folha, Folha, Categoria Folha'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(inst);
  ws2['!cols'] = [{ wch: 22 }, { wch: 50 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Instruções');
  XLSX.writeFile(wb, 'Modelo_Importacao_Salarios_Fixos.xlsx');
}

function parseSalariosFixosFromAOA(linhas) {
  if (!linhas || linhas.length < 2) return { erros: ['Planilha vazia'], itens: [] };
  let headerIdx = 0;
  for (let i = 0; i < Math.min(linhas.length, 5); i++) {
    const row = (linhas[i] || []).map(x => normCol(String(x || '')));
    if (row.some(c => c === 'NOME' || c === 'NOMECOMPLETO' || c === 'COLABORADOR' || c === 'FUNCIONARIO')) { headerIdx = i; break; }
  }
  const header = (linhas[headerIdx] || []).map(c => normCol(String(c || '')));
  const idxNome = header.findIndex(c => ['NOME', 'NOMECOMPLETO', 'COLABORADOR', 'FUNCIONARIO', 'NOMEDOCOLABORADOR'].includes(c));
  const idxSal  = header.findIndex(c => ['SALARIO', 'SALARIOFIXO', 'VALOR', 'VALORSALARIO'].includes(c));
  const idxGrp  = header.findIndex(c => ['GRUPO', 'GRUPOFOLHA', 'FOLHA', 'CATEGORIAFOLHA', 'GRUPODAFOLHA', 'GRUPOFIXODAFOLHA'].includes(c));
  if (idxNome < 0) return { erros: ['Coluna "Nome" não encontrada na planilha.'], itens: [] };
  if (idxSal < 0)  return { erros: ['Coluna "Salário" não encontrada na planilha.'], itens: [] };
  const itens = [];
  const erros = [];
  for (let i = headerIdx + 1; i < linhas.length; i++) {
    const row = linhas[i] || [];
    const nome = String(row[idxNome] || '').trim();
    if (!nome) continue;
    const salario = parseNumeroBR(row[idxSal]);
    if (!salario || salario <= 0) { erros.push(`Linha ${i + 1}: salário inválido para "${nome}".`); continue; }
    const grupo = idxGrp >= 0 ? String(row[idxGrp] || '').trim().toUpperCase() : '';
    itens.push({ nome: nome.toUpperCase(), salarioFixo: salario, folhaGrupo: grupo });
  }
  return { erros, itens };
}

// Parser de texto colado: aceita TSV (Tab), ; ou pipe |. Cabeçalho: NOME, SALÁRIO, GRUPO (opcional).
function parseSalariosFixosFromText(texto) {
  const linhas = (texto || '').replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
  if (linhas.length < 2) return { erros: ['Cole pelo menos o cabeçalho e uma linha de dados.'], itens: [] };
  const split = (l) => l.split(/\t|;|\|/).map(c => c.trim());
  const aoa = linhas.map(split);
  return parseSalariosFixosFromAOA(aoa);
}

// ============ MODELO E IMPORTAÇÃO DE DIÁRIAS AVULSAS (XLSX) ============
function gerarModeloDiariasXLSX() {
  const wb = XLSX.utils.book_new();
  const headers = ['data', 'Colaborador', 'Valor', 'Grupo Folha'];
  const exemplos = [
    ['01/04/2026', 'ARNALDO CEZARIANO DA SILVA JUNIOR', 2090.00, 'M ROCHA ENGENHARIA'],
    ['01/04/2026', 'EDUARDO PEDRO DE OLIVEIRA PIMENTA', 5712.81, 'ESCOLTA ARMADA'],
    ['01/04/2026', 'EVANDRO SALGUES RODRIGUES',         1850.00, 'CONDOMÍNIO SPRING PARK'],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet([headers, ...exemplos]);
  ws1['!cols'] = [{ wch: 14 }, { wch: 40 }, { wch: 14 }, { wch: 28 }];
  ws1['!freeze'] = { ySplit: 1 };
  for (let r = 1; r < 200; r++) {
    const cellV = ws1[XLSX.utils.encode_cell({ r, c: 2 })];
    if (cellV) cellV.z = '"R$ "#,##0.00';
  }
  XLSX.utils.book_append_sheet(wb, ws1, 'Lançamentos');
  const inst = [
    ['MODELO DE IMPORTAÇÃO DE LANÇAMENTOS AVULSOS'],
    [],
    ['INSTRUÇÕES:'],
    ['• Use a aba "Lançamentos" para preencher os dados.'],
    ['• Apenas colaboradores JÁ CADASTRADOS serão importados (busca por nome).'],
    ['• Data: DD/MM/AAAA (ex: 01/04/2026) ou data Excel.'],
    ['• Valor: 2090 ou 2090,00 ou R$ 2 090,00 (aceita formatos brasileiros).'],
    ['• Grupo Folha: opcional. Se a categoria não existir no Cat. Folha, será criada automaticamente.'],
    [],
    ['CAMPO', 'DESCRIÇÃO', 'OBRIGATÓRIO'],
    ['data',         'Data do lançamento (DD/MM/AAAA)',                              'SIM'],
    ['Colaborador',  'Nome cadastrado em Funcionários (busca por similaridade)',     'SIM'],
    ['Valor',        'Valor a pagar em reais',                                       'SIM'],
    ['Grupo Folha',  'Categoria de folha (ESCOLTA ARMADA, M ROCHA ENGENHARIA etc.)', 'NÃO'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(inst);
  ws2['!cols'] = [{ wch: 22 }, { wch: 60 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Instruções');
  XLSX.writeFile(wb, 'Modelo_Importacao_Lancamentos_Avulsos.xlsx');
}

// ============ MODELO E IMPORTAÇÃO DE DESPESAS (XLSX + TEXTO) ============
function gerarModeloDespesasXLSX() {
  const wb = XLSX.utils.book_new();
  const headers = ['Data', 'Descrição', 'Tipo', 'Valor', 'Centro de Custo', 'Origem', 'Competência', 'Status', 'Observações'];
  const exemplos = [
    ['01/04/2026', 'Aluguel escritório',          'FIXA',     3500.00, 'Administrativo', 'CARTÃO CORPORATIVO', '2026-04', 'pago',     ''],
    ['05/04/2026', 'Combustível frota',           'AVULSA',    980.50, 'Operacional',    'POSTO IPIRANGA',     '2026-04', 'pago',     'Abastecimento semanal'],
    ['10/04/2026', 'Parcela 3/12 financiamento',  'PARCELA',  1250.00, 'Financeiro',     'BANCO',              '2026-04', 'pendente', 'Veículo FUF-6321'],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet([headers, ...exemplos]);
  ws1['!cols'] = [{ wch: 12 }, { wch: 38 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 36 }];
  ws1['!freeze'] = { ySplit: 1 };
  for (let r = 1; r < 200; r++) {
    const cellV = ws1[XLSX.utils.encode_cell({ r, c: 3 })];
    if (cellV) cellV.z = '"R$ "#,##0.00';
  }
  XLSX.utils.book_append_sheet(wb, ws1, 'Despesas');
  const inst = [
    ['MODELO DE IMPORTAÇÃO DE DESPESAS'],
    [],
    ['INSTRUÇÕES:'],
    ['• Use a aba "Despesas" para preencher os dados.'],
    ['• Tipo: FIXA (mensal recorrente), PARCELA (parcelamento) ou AVULSA (pontual).'],
    ['• Valor: 3500 ou 3500,00 ou R$ 3.500,00 (formatos brasileiros aceitos).'],
    ['• Competência: AAAA-MM. Se vazia, usa o mês da data.'],
    ['• Status: pendente, pago ou cancelado.'],
    [],
    ['CAMPO',           'DESCRIÇÃO',                                        'OBRIGATÓRIO'],
    ['Data',            'Data da despesa (DD/MM/AAAA)',                     'SIM'],
    ['Descrição',       'Descrição/lançamento da despesa',                  'SIM'],
    ['Tipo',            'FIXA / PARCELA / AVULSA',                          'SIM'],
    ['Valor',           'Valor da despesa em reais',                        'SIM'],
    ['Centro de Custo', 'Categoria de centro de custo (ex: Administrativo)', 'NÃO'],
    ['Origem',          'Forma de pagamento ou pagador (ex: CARTÃO CORP.)',  'NÃO'],
    ['Competência',     'Mês de competência (AAAA-MM, default = data)',     'NÃO'],
    ['Status',          'pendente / pago / cancelado (default: pendente)',   'NÃO'],
    ['Observações',     'Notas livres',                                      'NÃO'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(inst);
  ws2['!cols'] = [{ wch: 22 }, { wch: 50 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Instruções');
  XLSX.writeFile(wb, 'Modelo_Importacao_Despesas.xlsx');
}

function parseDespesasFromAOA(linhas) {
  if (!linhas || linhas.length < 2) return { erros: ['Planilha vazia'], itens: [] };
  let headerIdx = 0;
  for (let i = 0; i < Math.min(linhas.length, 5); i++) {
    const row = (linhas[i] || []).map(x => normCol(String(x || '')));
    if (row.some(c => c.startsWith('DESCRI') || c === 'LANCAMENTO' || c === 'LANCTO' || c === 'ITEM') && row.some(c => c === 'VALOR' || c === 'VLR')) { headerIdx = i; break; }
  }
  const header = (linhas[headerIdx] || []).map(c => normCol(String(c || '')));
  const idxData  = header.findIndex(c => c === 'DATA' || c === 'DT' || c === 'DTLANCAMENTO');
  const idxDesc  = header.findIndex(c => c.startsWith('DESCRI') || ['LANCAMENTO', 'LANCTO', 'ITEM'].includes(c));
  const idxTipo  = header.findIndex(c => c === 'TIPO' || c === 'TIPODESPESA');
  const idxVal   = header.findIndex(c => c === 'VALOR' || c === 'VLR' || c === 'VALORRS' || c === 'PRECO');
  const idxCC    = header.findIndex(c => ['CENTRODECUSTO', 'CENTROCUSTO', 'CCUSTO', 'CARTAO', 'BANCO'].includes(c));
  const idxOrig  = header.findIndex(c => ['ORIGEM', 'PAGADOR', 'RESPONSAVEL', 'FORMAPAGAMENTO'].includes(c));
  const idxComp  = header.findIndex(c => ['COMPETENCIA', 'COMPENTENCIA', 'MES', 'MESCOMPETENCIA'].includes(c));
  const idxStatus = header.findIndex(c => c === 'STATUS' || c === 'SITUACAO');
  const idxObs   = header.findIndex(c => ['OBSERVACOES', 'OBSERVACAO', 'OBS', 'NOTAS'].includes(c));
  if (idxDesc < 0) return { erros: ['Coluna "Descrição" não encontrada.'], itens: [] };
  if (idxVal < 0)  return { erros: ['Coluna "Valor" não encontrada.'], itens: [] };
  const itens = [];
  const erros = [];
  const tipoNormalizado = (t) => {
    const u = String(t || '').trim().toUpperCase();
    if (['FIXA', 'PARCELA', 'AVULSA'].includes(u)) return u;
    if (u.startsWith('FIX')) return 'FIXA';
    if (u.startsWith('PARC')) return 'PARCELA';
    return 'AVULSA';
  };
  for (let i = headerIdx + 1; i < linhas.length; i++) {
    const row = linhas[i] || [];
    const desc = String(row[idxDesc] || '').trim();
    if (!desc) continue;
    const valor = parseNumeroBR(row[idxVal]);
    if (!valor || valor <= 0) { erros.push(`Linha ${i + 1}: valor inválido para "${desc}".`); continue; }
    let dataISO = '';
    if (idxData >= 0) {
      const rawData = row[idxData];
      if (rawData instanceof Date && !isNaN(rawData)) {
        dataISO = rawData.toISOString().slice(0, 10);
      } else {
        const s = String(rawData || '').trim();
        const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
        if (m) {
          const yy = m[3].length === 2 ? '20' + m[3] : m[3];
          dataISO = `${yy}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
        } else if (/^\d{4}-\d{2}-\d{2}/.test(s)) dataISO = s.slice(0, 10);
      }
    }
    const competencia = idxComp >= 0 ? String(row[idxComp] || '').trim() : '';
    const compFinal = competencia || (dataISO ? dataISO.slice(0, 7) : '');
    if (!compFinal) { erros.push(`Linha ${i + 1}: data ou competência obrigatória para "${desc}".`); continue; }
    itens.push({
      descricao: desc,
      tipo: idxTipo >= 0 ? tipoNormalizado(row[idxTipo]) : 'AVULSA',
      valor,
      centroCusto: idxCC >= 0 ? String(row[idxCC] || '').trim() : '',
      origem: idxOrig >= 0 ? String(row[idxOrig] || '').trim() : '',
      competencia: compFinal,
      dataLancamento: dataISO || '',
      status: idxStatus >= 0 ? String(row[idxStatus] || 'pendente').trim().toLowerCase() : 'pendente',
      observacoes: idxObs >= 0 ? String(row[idxObs] || '').trim() : '',
    });
  }
  return { erros, itens };
}

function parseDespesasFromText(texto) {
  const linhas = (texto || '').replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
  if (linhas.length < 2) return { erros: ['Cole pelo menos o cabeçalho e uma linha de dados.'], itens: [] };
  const split = (l) => l.split(/\t|;|\|/).map(c => c.trim());
  const aoa = linhas.map(split);
  return parseDespesasFromAOA(aoa);
}

// ============ IMPORT DESPESAS DA CHEFIA ============
function gerarModeloDespesasChefiaXLSX() {
  const wb = XLSX.utils.book_new();
  const headers = ['Data', 'Descrição', 'Tipo', 'Valor', 'Origem', 'Competência', 'Status', 'Observações'];
  const exemplos = [
    ['01/04/2026', 'Combustível veículo',      'AVULSA', 450.00, 'MANHÃES', '2026-04', 'pago', ''],
    ['03/04/2026', 'Jantar de negócios',        'AVULSA', 280.00, 'RICARDO', '2026-04', 'pago', 'Cliente Natura'],
    ['10/04/2026', 'Parcela celular 3/12',      'PARCELA', 199.00, 'MANHÃES', '2026-04', 'pendente', ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...exemplos]);
  ws['!cols'] = [{ wch: 12 }, { wch: 38 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 36 }];
  for (let r = 1; r < 200; r++) { const c = ws[XLSX.utils.encode_cell({ r, c: 3 })]; if (c) c.z = '"R$ "#,##0.00'; }
  XLSX.utils.book_append_sheet(wb, ws, 'Desp. Chefia');
  const inst = [
    ['MODELO DE IMPORTAÇÃO — DESPESAS DA CHEFIA'], [],
    ['INSTRUÇÕES:'],
    ['• Origem: MANHÃES ou RICARDO (obrigatório).'],
    ['• Tipo: FIXA, PARCELA ou AVULSA.'],
    ['• Valor: aceita formatos 3500, 3500,00 ou R$ 3.500,00.'],
    ['• Competência: AAAA-MM. Se vazia, usa o mês da data.'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(inst), 'Instruções');
  XLSX.writeFile(wb, 'Modelo_Importacao_Desp_Chefia.xlsx');
}

function parseDespesasChefiaFromAOA(linhas) {
  if (!linhas || linhas.length < 2) return { erros: ['Planilha vazia'], itens: [] };
  let headerIdx = 0;
  for (let i = 0; i < Math.min(linhas.length, 5); i++) {
    const row = (linhas[i] || []).map(x => normCol(String(x || '')));
    if (row.some(c => c.startsWith('DESCRI') || c === 'LANCAMENTO') && row.some(c => c === 'VALOR' || c === 'VLR')) { headerIdx = i; break; }
  }
  const header = (linhas[headerIdx] || []).map(c => normCol(String(c || '')));
  const idxData   = header.findIndex(c => c === 'DATA' || c === 'DT');
  const idxDesc   = header.findIndex(c => c.startsWith('DESCRI') || c === 'LANCAMENTO');
  const idxTipo   = header.findIndex(c => c === 'TIPO');
  const idxVal    = header.findIndex(c => c === 'VALOR' || c === 'VLR');
  const idxOrig   = header.findIndex(c => ['ORIGEM', 'RESPONSAVEL', 'PAGADOR'].includes(c));
  const idxComp   = header.findIndex(c => ['COMPETENCIA', 'MES'].includes(c));
  const idxStatus = header.findIndex(c => c === 'STATUS');
  const idxObs    = header.findIndex(c => ['OBSERVACOES', 'OBS'].includes(c));
  if (idxDesc < 0) return { erros: ['Coluna "Descrição" não encontrada.'], itens: [] };
  if (idxVal < 0)  return { erros: ['Coluna "Valor" não encontrada.'], itens: [] };
  const ORIGENS_VALIDAS = ['MANHÃES', 'MANHAES', 'MANHÃES', 'RICARDO'];
  const normOrigem = (o) => {
    const u = normCol(String(o || ''));
    if (u === 'MANHAES' || u === 'MANHAES' || u.includes('MANH')) return 'MANHÃES';
    if (u === 'RICARDO' || u.includes('RICARD')) return 'RICARDO';
    return String(o || '').trim().toUpperCase();
  };
  const tipoNorm = (t) => { const u = normCol(String(t || '')); if (u.startsWith('FIX')) return 'FIXA'; if (u.startsWith('PARC')) return 'PARCELA'; return 'AVULSA'; };
  const itens = []; const erros = [];
  for (let i = headerIdx + 1; i < linhas.length; i++) {
    const row = linhas[i] || [];
    const desc = String(row[idxDesc] || '').trim();
    if (!desc) continue;
    const valor = parseNumeroBR(row[idxVal]);
    if (!valor || valor <= 0) { erros.push(`Linha ${i + 1}: valor inválido para "${desc}".`); continue; }
    const origemRaw = idxOrig >= 0 ? String(row[idxOrig] || '').trim() : '';
    const origem = normOrigem(origemRaw);
    if (!origem || !['MANHÃES', 'RICARDO'].includes(origem)) { erros.push(`Linha ${i + 1}: origem inválida "${origemRaw}". Use MANHÃES ou RICARDO.`); continue; }
    let dataISO = '';
    if (idxData >= 0) {
      const rawData = row[idxData];
      if (rawData instanceof Date && !isNaN(rawData)) dataISO = rawData.toISOString().slice(0, 10);
      else { const s = String(rawData || '').trim(); const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/); if (m) { const yy = m[3].length === 2 ? '20' + m[3] : m[3]; dataISO = `${yy}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; } else if (/^\d{4}-\d{2}-\d{2}/.test(s)) dataISO = s.slice(0, 10); }
    }
    const comp = (idxComp >= 0 ? String(row[idxComp] || '').trim() : '') || (dataISO ? dataISO.slice(0, 7) : '');
    if (!comp) { erros.push(`Linha ${i + 1}: data ou competência obrigatória para "${desc}".`); continue; }
    itens.push({ descricao: desc, tipo: tipoNorm(idxTipo >= 0 ? row[idxTipo] : ''), valor, origem, competencia: comp, dataLancamento: dataISO || '', status: idxStatus >= 0 ? String(row[idxStatus] || 'pendente').trim().toLowerCase() : 'pendente', observacoes: idxObs >= 0 ? String(row[idxObs] || '').trim() : '' });
  }
  return { erros, itens };
}

function parseDespesasChefiaFromText(texto) {
  const linhas = (texto || '').replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
  if (linhas.length < 2) return { erros: ['Cole pelo menos o cabeçalho e uma linha de dados.'], itens: [] };
  const aoa = linhas.map(l => l.split(/\t|;|\|/).map(c => c.trim()));
  return parseDespesasChefiaFromAOA(aoa);
}

function parseDiariasFromAOA(linhas) {
  if (!linhas || linhas.length < 2) return { erros: ['Planilha vazia'], itens: [] };
  let headerIdx = 0;
  for (let i = 0; i < Math.min(linhas.length, 5); i++) {
    const row = (linhas[i] || []).map(x => normCol(String(x || '')));
    if (row.some(c => c === 'DATA') && row.some(c => c.startsWith('NOME') || c === 'COLABORADOR' || c === 'FUNCIONARIO')) { headerIdx = i; break; }
  }
  const header = (linhas[headerIdx] || []).map(c => normCol(String(c || '')));
  const idxData = header.findIndex(c => c === 'DATA' || c === 'DT' || c === 'DTA');
  const idxNome = header.findIndex(c => ['NOME', 'NOMECOMPLETO', 'COLABORADOR', 'FUNCIONARIO', 'NOMEDOCOLABORADOR'].includes(c));
  const idxVal  = header.findIndex(c => ['VALOR', 'VLR', 'VALORDIARIA', 'VALORDIARIASS'].includes(c));
  const idxFolha = header.findIndex(c => ['TIPODEFOLHA', 'TIPOFOLHA', 'GRUPO', 'GRUPOFOLHA', 'FOLHA', 'CATEGORIAFOLHA', 'TIPOFIXODAFOLHA'].includes(c));
  const idxCli  = header.findIndex(c => c === 'CLIENTE' || c === 'TOMADOR' || c === 'EMPRESA');
  if (idxData < 0) return { erros: ['Coluna "Data" não encontrada.'], itens: [] };
  if (idxNome < 0) return { erros: ['Coluna "Nome" não encontrada.'], itens: [] };
  if (idxVal < 0)  return { erros: ['Coluna "Valor" não encontrada.'], itens: [] };
  const itens = [];
  const erros = [];
  for (let i = headerIdx + 1; i < linhas.length; i++) {
    const row = linhas[i] || [];
    const nome = String(row[idxNome] || '').trim();
    if (!nome) continue;
    const valor = parseNumeroBR(row[idxVal]);
    if (!valor || valor <= 0) { erros.push(`Linha ${i + 1}: valor inválido para "${nome}".`); continue; }
    const rawData = row[idxData];
    let dataISO = '';
    if (rawData instanceof Date && !isNaN(rawData)) {
      dataISO = rawData.toISOString().slice(0, 10);
    } else {
      const s = String(rawData || '').trim();
      const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
      if (m) {
        const yy = m[3].length === 2 ? '20' + m[3] : m[3];
        dataISO = `${yy}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      } else if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        dataISO = s.slice(0, 10);
      }
    }
    if (!dataISO) { erros.push(`Linha ${i + 1}: data inválida ("${rawData}").`); continue; }
    const cliente = idxCli >= 0 ? String(row[idxCli] || '').trim() : '';
    const folhaGrupo = idxFolha >= 0 ? String(row[idxFolha] || '').trim().toUpperCase() : '';
    itens.push({ data: dataISO, competencia: dataISO.slice(0, 7), nome: nome.toUpperCase(), valor, clienteNome: cliente, folhaGrupo });
  }
  return { erros, itens };
}

// Parser de texto colado para Lançamentos Avulsos (TSV/CSV/pipe).
// Cabeçalho aceito: data, Colaborador, Valor, Grupo Folha (com aliases).
function parseLancamentosAvulsosFromText(texto) {
  const linhas = (texto || '').replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
  if (linhas.length < 2) return { erros: ['Cole pelo menos o cabeçalho e uma linha de dados.'], itens: [] };
  const split = (l) => l.split(/\t|;|\|/).map(c => c.trim());
  const aoa = linhas.map(split);
  return parseDiariasFromAOA(aoa);
}

// ============ APP ============
export default function App({ onVoltarHub, onLogout } = {}) {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('mr-theme') === 'dark');
  useEffect(() => { localStorage.setItem('mr-theme', darkMode ? 'dark' : 'light'); }, [darkMode]);
  const [aba, setAba] = useState('dashboard');
  const [servicos, setServicos] = useState(SERVICOS_INICIAIS);
  const [lancamentos, setLancamentos] = useState([]);
  const [fechamentos, setFechamentos] = useState([]);
  const [funcionarios, setFuncionarios] = useState(FUNCIONARIOS_INICIAIS);
  const [folhas, setFolhas] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [despChefia, setDespChefia] = useState([]);
  const [sidebarExpandida, setSidebarExpandida] = useState(true);
  const [descontos, setDescontos] = useState([]);
  const [diarias, setDiarias] = useState([]);
  const [categoriasFolha, setCategoriasFolha] = useState([]);
  const [clientes, setClientes] = useState(CLIENTES_INICIAIS);
  const [feriadosExtra, setFeriadosExtra] = useState([]);
  const [resumosSalvos, setResumosSalvos] = useState([]);
  // v97: módulo de propostas (carregado direto via API, fora do storage-shim)
  const [propostas, setPropostas] = useState([]);
  const [loadingPropostas, setLoadingPropostas] = useState(false);
  const [filtroStatusProposta, setFiltroStatusProposta] = useState('todos');
  const [filtroCategoriaProposta, setFiltroCategoriaProposta] = useState('');
  const [buscaProposta, setBuscaProposta] = useState('');
  const [filtroMesDashboard, setFiltroMesDashboard] = useState('');
  const [filtroSemPixFunc, setFiltroSemPixFunc] = useState(false);
  const [filtroStatusFolha, setFiltroStatusFolha] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modal, setModal] = useState(null);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroCatServico, setFiltroCatServico] = useState('');
  const [filtroMesFolha, setFiltroMesFolha] = useState('');
  const [filtroCompetencia, setFiltroCompetencia] = useState('');
  const [competenciaResumo, setCompetenciaResumo] = useState(mesAtual());
  const [busca, setBusca] = useState('');
  const [toast, setToast] = useState(null);
  const [selServicos, setSelServicos] = useState(new Set());
  const [selFuncionarios, setSelFuncionarios] = useState(new Set());
  const [filtroMesLanc, setFiltroMesLanc] = useState('');
  const [filtroCategoriaLanc, setFiltroCategoriaLanc] = useState('');
  const [filtroDataInicioLanc, setFiltroDataInicioLanc] = useState('');
  const [filtroDataFimLanc, setFiltroDataFimLanc] = useState('');
  const [filtroPrestadorLanc, setFiltroPrestadorLanc] = useState('');
  const [filtroCategoriaFolhaLanc, setFiltroCategoriaFolhaLanc] = useState('');
  const [filtroCompetenciaLanc, setFiltroCompetenciaLanc] = useState('');
  const [filtroOsLanc, setFiltroOsLanc] = useState('');
  const [selLancs, setSelLancs] = useState(new Set());
  const [selFolhas, setSelFolhas] = useState(new Set());
  const [selPropostas, setSelPropostas] = useState(new Set());
  const [osCounter, setOsCounter] = useState(0);
  const osCounterRef = useRef(0);

  useEffect(() => {
    const anterior = document.title;
    document.title = 'MRSys - Sistema de Gestão';
    return () => { document.title = anterior; };
  }, []);

  // v97: carrega propostas só ao entrar na aba (lazy)
  useEffect(() => {
    if (aba === 'propostas') {
      carregarPropostas({ status: filtroStatusProposta, categoria: filtroCategoriaProposta, q: buscaProposta });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, filtroStatusProposta, filtroCategoriaProposta]);

  useEffect(() => {
    (async () => {
      try {
        const carregar = async (key, setter, fallback) => {
          const r = await window.storage.get(key).catch(() => null);
          if (r) setter(JSON.parse(r.value));
          else if (fallback) await window.storage.set(key, JSON.stringify(fallback)).catch(() => { });
        };
        await carregar('servicos', setServicos, SERVICOS_INICIAIS);
        await carregar('lancamentos', setLancamentos);
        await carregar('fechamentos', setFechamentos);
        await carregar('funcionarios', setFuncionarios, FUNCIONARIOS_INICIAIS);
        await carregar('folhas', setFolhas);
        await carregar('despesas', setDespesas);
        await carregar('despChefia', setDespChefia);
        await carregar('descontos', setDescontos);
        await carregar('diarias', setDiarias);
        await carregar('categoriasFolha', setCategoriasFolha);
        await carregar('clientes', setClientes, CLIENTES_INICIAIS);
        await carregar('feriadosExtra', setFeriadosExtra);
        await carregar('resumosSalvos', setResumosSalvos, []);
        await carregar('osCounter', (val) => {
          const n = typeof val === 'number' ? val : 0;
          osCounterRef.current = n;
          setOsCounter(n);
        });
      } catch (e) { }
      setCarregando(false);
    })();
  }, []);

  // v63: Auto-refresh ao trocar de aba — força sincronização com o backend
  // antes de exibir dados, evitando duplicações ou dados defasados de outros clientes.
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    if (carregando) return;
    if (typeof window.storage?.refresh !== 'function') return;
    // Mapeia aba → chaves de dados a refazer fetch
    const chavesPorAba = {
      lancamentos: ['lancamentos', 'servicos'],
      fechamentos: ['fechamentos', 'lancamentos'],
      faturas: ['lancamentos', 'fechamentos'],
      diarias: ['diarias', 'funcionarios', 'categoriasFolha'],
      folha: ['lancamentos', 'fechamentos', 'diarias', 'descontos', 'funcionarios', 'categoriasFolha'],
      despesas: ['despesas'],
      despChefia: ['despChefia'],
      descontos: ['descontos', 'funcionarios'],
      funcionarios: ['funcionarios', 'categoriasFolha'],
      clientes: ['clientes'],
      catalogo: ['servicos', 'clientes'],
      catFolha: ['categoriasFolha', 'lancamentos', 'funcionarios'],
      resumo: ['lancamentos', 'fechamentos', 'diarias', 'descontos', 'despesas', 'despChefia', 'funcionarios', 'categoriasFolha'],
      dashboard: ['fechamentos', 'lancamentos'],
    };
    const setters = {
      lancamentos: setLancamentos, fechamentos: setFechamentos, servicos: setServicos,
      funcionarios: setFuncionarios, folhas: setFolhas, despesas: setDespesas,
      descontos: setDescontos, diarias: setDiarias, categoriasFolha: setCategoriasFolha,
      clientes: setClientes, despChefia: setDespChefia,
    };
    const chaves = chavesPorAba[aba] || [];
    if (chaves.length === 0) return;
    let cancelled = false;
    setRefreshing(true);
    (async () => {
      // Flush any pending debounced saves before fetching fresh data
      const snapshotPendentes = { ...pendentesRef.current };
      for (const key of Object.keys(snapshotPendentes)) {
        if (cancelled) break;
        if (timersRef.current[key]) { clearTimeout(timersRef.current[key]); delete timersRef.current[key]; }
        try { await salvarChave(key, snapshotPendentes[key]); } catch (_) {}
      }
      for (const key of chaves) {
        if (cancelled) break;
        try {
          const r = await window.storage.refresh(key);
          if (r && !cancelled && setters[key]) setters[key](JSON.parse(r.value));
        } catch (_) {}
      }
      if (!cancelled) setRefreshing(false);
    })();
    return () => { cancelled = true; };
  }, [aba, carregando]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-marca como "Vencida" qualquer fatura cujo vencimento já passou e que não esteja paga.
  useEffect(() => {
    if (carregando) return;
    const hojeStr = hoje();
    setFechamentos(prev => {
      let mudou = false;
      const novos = prev.map(f => {
        const st = f.statusFatura || 'Enviada';
        if (f.dataVencimento && f.dataVencimento < hojeStr && st !== 'Paga' && st !== 'Vencida' && st !== 'NF-emitida' && st !== 'Aprovada') {
          mudou = true;
          const hist = [...(f.historicoStatus || []), { status: 'Vencida', em: new Date().toISOString(), auto: true }];
          return { ...f, statusFatura: 'Vencida', historicoStatus: hist };
        }
        return f;
      });
      return mudou ? novos : prev;
    });
  }, [carregando]);

  // Migração: corrige cadastro do serviço #202604 que estava como ESCOLTECH (deveria ser TOMBINI VELADA do GRUPO TOMBINI).
  useEffect(() => {
    if (carregando) return;
    setServicos(prev => {
      const i = prev.findIndex(s => s.cod === '202604');
      if (i < 0) return prev;
      const s = prev[i];
      if (s.template === 'TOMBINI' && s.cliente === 'GRUPO TOMBINI' && s.descricao === 'TOMBINI VELADA') return prev;
      const cp = [...prev];
      cp[i] = { ...s, template: 'TOMBINI', descricao: 'TOMBINI VELADA', cliente: 'GRUPO TOMBINI' };
      return cp;
    });
  }, [carregando]);

  // Migração v26: renomeia categorias antigas para os novos nomes.
  useEffect(() => {
    if (carregando) return;
    const MAP_CAT = { 'MOTOLINK': 'MOTOLINK RJ', 'PRONTA RESPOSTA': 'ARMADA' };
    setServicos(prev => {
      const proximo = prev.map(s => {
        const cat = s.categoriaServico || '';
        if (MAP_CAT[cat]) return { ...s, categoriaServico: MAP_CAT[cat] };
        if (cat === 'VELADA') {
          const nova = (s.template === 'NATURA_NOTURNA' || s.template === 'NATURA_MOTOLINK') ? 'VELADA RJ' : 'VELADA SP';
          return { ...s, categoriaServico: nova };
        }
        return s;
      });
      const mudou = proximo.some((s, i) => s.categoriaServico !== prev[i].categoriaServico);
      return mudou ? proximo : prev;
    });
  }, [carregando]);

  // Migração v27: atribui número OS sequencial a lançamentos que não têm.
  useEffect(() => {
    if (carregando) return;
    const semOS = lancamentos.filter(l => !l.os);
    if (semOS.length === 0) return;
    const sorted = [...semOS].sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id));
    const map = new Map();
    sorted.forEach((l, i) => {
      const n = osCounterRef.current + i + 1;
      map.set(l.id, `OS-${String(n).padStart(4, '0')}`);
    });
    osCounterRef.current += semOS.length;
    setOsCounter(osCounterRef.current);
    setLancamentos(prev => prev.map(l => map.has(l.id) ? { ...l, os: map.get(l.id) } : l));
  }, [carregando]); // eslint-disable-line react-hooks/exhaustive-deps

  // Migração v34: normaliza categoriaServico — qualquer valor fora de CATEGORIAS_SERVICO
  // é convertido. 'VELADA' (legacy) → VELADA SP/RJ baseado em template; 'MOTOLINK' → MOTOLINK RJ.
  useEffect(() => {
    if (carregando) return;
    setServicos(prev => {
      const proximo = prev.map(s => {
        const cat = s.categoriaServico;
        if (CATEGORIAS_SERVICO.includes(cat)) return s;
        let nova;
        if (cat === 'MOTOLINK') nova = 'MOTOLINK RJ';
        else if (cat === 'PRONTA RESPOSTA') nova = 'ARMADA';
        else if (cat === 'VELADA') nova = (s.template === 'NATURA_NOTURNA' || s.template === 'NATURA_MOTOLINK') ? 'VELADA RJ' : 'VELADA SP';
        else nova = CATEGORIAS_SERVICO[0]; // fallback p/ valores totalmente desconhecidos
        return { ...s, categoriaServico: nova };
      });
      const mudou = proximo.some((s, i) => s.categoriaServico !== prev[i].categoriaServico);
      return mudou ? proximo : prev;
    });
  }, [carregando]);

  // Migração v32: recalcula lançamentos zerados pelo fix incorreto do v29.
  // Critério: status pendente, totalFatura=0, mas tem serviço cadastrado com valorFatura>0.
  useEffect(() => {
    if (carregando) return;
    let mudou = 0;
    const reCalc = lancamentos.map(l => {
      if (l.status === 'fechado') return l; // Não mexe em lançamentos já em fatura fechada
      if (num(l.totalFatura) > 0) return l; // Já tem valor — ok
      const s = servicos.find(x => x.cod === l.codServico);
      if (!s || num(s.valorFatura) === 0) return l;
      const t = TEMPLATES[s.template];
      const calc = calcular(s, l, t);
      if (calc.totalFatura > 0) { mudou++; return { ...l, ...calc, atualizadoEm: new Date().toISOString() }; }
      return l;
    });
    if (mudou > 0) {
      setLancamentos(reCalc);
      showToast(`v32: ${mudou} lançamento(s) recalculado(s) (cobrança base restaurada)`, 'success');
    }
  }, [carregando]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-seleciona o período mais recente com fechamentos quando o mês atual não tem dados.
  const autoSelecionadoResumo = useRef(false);
  useEffect(() => {
    if (carregando || autoSelecionadoResumo.current || fechamentos.length === 0) return;
    autoSelecionadoResumo.current = true;
    const temDados = fechamentos.some(f => f.periodo === competenciaResumo);
    if (!temDados) {
      const periodos = [...new Set(fechamentos.map(f => f.periodo))].sort().reverse();
      if (periodos.length > 0) setCompetenciaResumo(periodos[0]);
    }
  }, [carregando]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============ PERSISTÊNCIA ROBUSTA ============
  // Garante que TODA edição é salva. Usa debounce para evitar excesso de writes,
  // retry automático em falha e bloqueio do fechamento da aba se houver dados não salvos.
  const pendentesRef = useRef({});         // { key: valueAtual }
  const ultimoSalvoRef = useRef({});       // { key: hash do último valor salvo }
  const timersRef = useRef({});            // { key: timeoutId }
  const [erroSalvar, setErroSalvar] = useState(null);

  // Limite seguro do window.storage (declarado como 5MB; deixamos margem para overhead).
  const LIMITE_STORAGE_BYTES = 4_500_000;

  const salvarChave = useCallback(async (key, value, tentativa = 1) => {
    try {
      const serialized = JSON.stringify(value);
      const tamanho = serialized.length;
      // Pré-checagem de tamanho — evita request que sabidamente vai falhar.
      if (tamanho > LIMITE_STORAGE_BYTES) {
        throw new Error(`QUOTA_EXCEEDED: dados de "${key}" têm ${(tamanho / 1024 / 1024).toFixed(2)} MB, acima do limite de ${(LIMITE_STORAGE_BYTES / 1024 / 1024).toFixed(1)} MB.`);
      }
      await window.storage.set(key, serialized);
      ultimoSalvoRef.current[key] = tamanho + ':' + (Array.isArray(value) ? value.length : 0);
      delete pendentesRef.current[key];
      if (Object.keys(pendentesRef.current).length === 0) setSalvando(false);
      // Limpa erro apenas se foi resolvido para esta chave
      setErroSalvar(prev => (prev && prev.key === key) ? null : prev);
    } catch (e) {
      const msg = e?.message || 'Erro desconhecido';
      const isQuota = /quota|too large|exceed|QUOTA_EXCEEDED|5\s*MB|size/i.test(msg);
      // Para erros de quota, não adianta retry — interrompe e avisa.
      if (isQuota) {
        const tamMB = ((JSON.stringify(value).length || 0) / 1024 / 1024).toFixed(2);
        const qtd = Array.isArray(value) ? value.length : '?';
        setErroSalvar({ key, mensagem: `Erro ao salvar "${key}" (${tamMB} MB, ${qtd} registros). Verifique a conexão com o servidor.`, tipo: 'quota' });
        setSalvando(false);
        showToast(`⚠ "${key}" excedeu o limite de armazenamento (${tamMB} MB)`, 'error');
        delete pendentesRef.current[key];
        return;
      }
      // Demais erros (rede, etc.): tenta de novo até 3x.
      if (tentativa < 3) {
        setTimeout(() => salvarChave(key, value, tentativa + 1), 500 * tentativa);
      } else {
        setErroSalvar({ key, mensagem: msg, tipo: 'rede' });
        setSalvando(false);
        showToast(`⚠ Erro ao salvar "${key}". Verifique a conexão.`, 'error');
      }
    }
  }, []);

  const agendarSalvamento = useCallback((key, value) => {
    pendentesRef.current[key] = value;
    setSalvando(true);
    if (timersRef.current[key]) clearTimeout(timersRef.current[key]);
    timersRef.current[key] = setTimeout(() => {
      salvarChave(key, value);
      delete timersRef.current[key];
    }, 300);
  }, [salvarChave]);

  // Hooks de persistência: cada chave dispara debounced save quando seu estado muda.
  useEffect(() => { if (!carregando) agendarSalvamento('servicos', servicos); }, [servicos, carregando, agendarSalvamento]);
  useEffect(() => { if (!carregando) agendarSalvamento('lancamentos', lancamentos); }, [lancamentos, carregando, agendarSalvamento]);
  useEffect(() => { if (!carregando) agendarSalvamento('fechamentos', fechamentos); }, [fechamentos, carregando, agendarSalvamento]);
  useEffect(() => { if (!carregando) agendarSalvamento('funcionarios', funcionarios); }, [funcionarios, carregando, agendarSalvamento]);
  useEffect(() => { if (!carregando) agendarSalvamento('folhas', folhas); }, [folhas, carregando, agendarSalvamento]);
  useEffect(() => { if (!carregando) agendarSalvamento('despesas', despesas); }, [despesas, carregando, agendarSalvamento]);
  useEffect(() => { if (!carregando) agendarSalvamento('despChefia', despChefia); }, [despChefia, carregando, agendarSalvamento]);
  useEffect(() => { if (!carregando) agendarSalvamento('descontos', descontos); }, [descontos, carregando, agendarSalvamento]);
  useEffect(() => { if (!carregando) agendarSalvamento('diarias', diarias); }, [diarias, carregando, agendarSalvamento]);
  useEffect(() => { if (!carregando) agendarSalvamento('categoriasFolha', categoriasFolha); }, [categoriasFolha, carregando, agendarSalvamento]);
  useEffect(() => { if (!carregando) agendarSalvamento('clientes', clientes); }, [clientes, carregando, agendarSalvamento]);
  useEffect(() => { if (!carregando) agendarSalvamento('feriadosExtra', feriadosExtra); }, [feriadosExtra, carregando, agendarSalvamento]);
  useEffect(() => { if (!carregando) agendarSalvamento('resumosSalvos', resumosSalvos); }, [resumosSalvos, carregando, agendarSalvamento]);
  useEffect(() => { if (!carregando) agendarSalvamento('osCounter', osCounter); }, [osCounter, carregando, agendarSalvamento]);

  // Bloqueia fechamento da aba se há dados pendentes.
  useEffect(() => {
    const handler = (e) => {
      if (Object.keys(pendentesRef.current).length > 0) {
        e.preventDefault();
        e.returnValue = 'Há alterações não salvas. Sair mesmo assim?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Quando a aba fica oculta, força o save imediato (sem aguardar debounce)
  // — protege contra perda quando o usuário muda de aba ou minimiza.
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden') {
        Object.entries(pendentesRef.current).forEach(([key, value]) => {
          if (timersRef.current[key]) { clearTimeout(timersRef.current[key]); delete timersRef.current[key]; }
          salvarChave(key, value);
        });
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [salvarChave]);

  const showToast = (msg, tipo = 'success') => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 2800); };

  const mesesLanc = useMemo(() => [...new Set(lancamentos.map(l => l.data?.slice(0, 7)).filter(Boolean))].sort().reverse(), [lancamentos]);

  const lancFiltrados = useMemo(() => lancamentos.filter(l => {
    if (filtroMesLanc && l.data?.slice(0, 7) !== filtroMesLanc) return false;
    if (filtroDataInicioLanc && l.data && l.data < filtroDataInicioLanc) return false;
    if (filtroDataFimLanc && l.data && l.data > filtroDataFimLanc) return false;
    if (filtroCliente && l.cliente !== filtroCliente) return false;
    if (filtroStatus && l.status !== filtroStatus) return false;
    if (filtroCategoriaLanc) {
      const sv = servicos.find(x => x.cod === l.codServico);
      const cat = sv?.categoriaServico || l.categoriaServico || '';
      if (cat !== filtroCategoriaLanc) return false;
    }
    if (filtroPrestadorLanc) {
      const nomes = nomesNoLancamento(l);
      if (filtroPrestadorLanc === '__sem__') {
        if (nomes.length > 0) return false; // só lançamentos sem prestador
      } else {
        if (!nomes.includes(normalizar(filtroPrestadorLanc))) return false;
      }
    }
    if (filtroOsLanc) {
      if (!String(l.os || '').toUpperCase().includes(filtroOsLanc.toUpperCase())) return false;
    }
    if (filtroCategoriaFolhaLanc) {
      const catLanc = (l.categoriaFolha || '').toUpperCase();
      if (filtroCategoriaFolhaLanc === '__sem__') {
        if (catLanc) return false; // só sem categoria
      } else {
        if (catLanc !== filtroCategoriaFolhaLanc.toUpperCase()) return false;
      }
    }
    if (filtroCompetenciaLanc) {
      const comp = l.competencia || (l.data || '').slice(0, 7);
      if (comp !== filtroCompetenciaLanc) return false;
    }
    if (busca) { const q = busca.toLowerCase(); const blob = `${l.descricao} ${l.cliente} ${l.codServico} ${l.os || ''} ${l.categoriaFolha || ''} ${(nomesNoLancamento(l) || []).join(' ')} ${JSON.stringify(l.extras || {})}`.toLowerCase(); if (!blob.includes(q)) return false; }
    return true;
  }).sort((a, b) => b.data.localeCompare(a.data)), [lancamentos, servicos, filtroMesLanc, filtroDataInicioLanc, filtroDataFimLanc, filtroCliente, filtroStatus, filtroCategoriaLanc, filtroPrestadorLanc, filtroOsLanc, filtroCategoriaFolhaLanc, filtroCompetenciaLanc, busca]);

  const totais = useMemo(() => {
    const fechs = fechamentos
      .filter(f => !filtroCliente || f.cliente === filtroCliente)
      .filter(f => !filtroMesDashboard || f.periodo === filtroMesDashboard);
    const fat = fechs.reduce((s, f) => s + num(f.totalFatura), 0);
    const pagFech = fechs.reduce((s, f) => s + num(f.totalPago), 0);
    const imp = fechs.reduce((s, f) => s + num(f.totalImposto), 0);
    // v63: total pago inclui lançamentos avulsos (diárias) — só conta se não houver filtro de cliente
    // ou se o lançamento tiver clienteNome correspondente
    const competsFech = new Set(fechs.map(f => f.periodo));
    const pagAvulsos = diarias.filter(d => competsFech.has(d.competencia) && (!filtroCliente || (d.clienteNome || '').toUpperCase() === filtroCliente.toUpperCase())).reduce((s, d) => s + num(d.valor), 0);
    const pag = pagFech + pagAvulsos;
    const luc = fat - pag - imp;
    return { fat, pag, pagFech, pagAvulsos, imp, luc, margem: fat > 0 ? (luc / fat * 100) : 0, qtd: fechs.length };
  }, [fechamentos, filtroCliente, filtroMesDashboard, diarias]);

  const clientesUnicos = useMemo(() => {
    const fromClientes = clientes.filter(c => c.status === 'ATIVO').map(c => c.nome);
    const fromServicos = servicos.map(s => s.cliente);
    return [...new Set([...fromClientes, ...fromServicos])].filter(Boolean).sort();
  }, [clientes, servicos]);
  const categoriasUsadas = useMemo(() => [...new Set([...CATEGORIAS_PADRAO, ...funcionarios.map(f => f.categoria).filter(Boolean)])].sort(), [funcionarios]);
  const competenciasUsadas = useMemo(() => [...new Set([...despesas.map(d => d.competencia), ...descontos.map(d => d.competencia), mesAtual()].filter(Boolean))].sort().reverse(), [despesas, descontos]);

  const dadosPorCliente = useMemo(() => {
    const m = {};
    fechamentos
      .filter(f => !filtroCliente || f.cliente === filtroCliente)
      .filter(f => !filtroMesDashboard || f.periodo === filtroMesDashboard)
      .forEach(f => {
      if (!m[f.cliente]) m[f.cliente] = { cliente: f.cliente, faturado: 0, pago: 0, imposto: 0, lucro: 0, qtd: 0 };
      m[f.cliente].faturado += num(f.totalFatura);
      m[f.cliente].pago += num(f.totalPago);
      m[f.cliente].imposto += num(f.totalImposto);
      m[f.cliente].lucro += num(f.totalFatura) - num(f.totalPago) - num(f.totalImposto);
      m[f.cliente].qtd += num(f.qtdLancamentos) || 0;
    });
    return Object.values(m).sort((a, b) => b.faturado - a.faturado);
  }, [fechamentos, filtroCliente, filtroMesDashboard]);

  const faturas = useMemo(() => {
    const m = {};
    lancamentos.forEach(l => {
      // Usa o template do lançamento para calcular o período (BRK usa ciclo 26-25)
      const t = TEMPLATES[l.template]; const periodo = getPeriodo(l.data, t);
      const k = `${l.cliente}|${periodo}`;
      if (!m[k]) m[k] = { cliente: l.cliente, periodo, lancs: [], templatesSet: new Set() };
      m[k].lancs.push(l);
      m[k].templatesSet.add(l.template);
    });
    return Object.values(m).map(f => {
      const templates = [...f.templatesSet];
      const fat = f.lancs.reduce((s, l) => s + num(l.totalFatura), 0);
      const pag = f.lancs.reduce((s, l) => s + num(l.totalPago), 0);
      // template = primeiro template (para compatibilidade com modais que ainda usam template singular)
      return { cliente: f.cliente, periodo: f.periodo, templates, template: templates[0], lancs: f.lancs, totalFatura: fat, totalPago: pag, lucro: fat - pag, qtd: f.lancs.length };
    }).sort((a, b) => b.periodo.localeCompare(a.periodo) || a.cliente.localeCompare(b.cliente));
  }, [lancamentos]);

  const folhasPorFunc = useMemo(() => {
    // Apenas lançamentos que estão dentro de uma fatura gerada (status: 'fechado').
    // Folha = participação do funcionário no que efetivamente foi faturado.
    // A COMPETÊNCIA agora vem do lançamento (l.competencia override) — permite mover
    // lançamentos de meses diferentes para a mesma folha. Fallback: data do lançamento.
    const lancsFaturados = lancamentos.filter(l => l.status === 'fechado');
    const m = {};
    funcionarios.forEach(f => {
      lancamentosDoFunc(f, lancsFaturados).forEach(l => {
        const periodo = l.competencia || l.data.slice(0, 7);
        const k = `${f.id}|${periodo}`;
        if (!m[k]) m[k] = { funcionario: f, periodo, lancs: [], total: 0 };
        m[k].lancs.push(l); m[k].total += valorParticipacao(f, l);
      });
    });
    // v63: garantir que funcionários com APENAS lançamentos avulsos (diárias) também apareçam
    // na folha, mesmo sem participação em lançamentos faturados.
    funcionarios.forEach(f => {
      const nomeNorm = normalizar(f.nome);
      diarias.forEach(d => {
        if (normalizar(d.nome) !== nomeNorm) return;
        const periodo = d.competencia || (d.data || '').slice(0, 7);
        if (!periodo) return;
        const k = `${f.id}|${periodo}`;
        if (!m[k]) m[k] = { funcionario: f, periodo, lancs: [], total: 0 };
      });
    });
    // v62: removida a auto-inclusão de funcionários ATIVOs com salário fixo
    // — folha agora vem só de lançamentos + diárias avulsas.
    return Object.values(m).map(g => {
      const folha = folhas.find(x => x.funcionarioId === g.funcionario.id && x.periodo === g.periodo);
      const ajustes = folha?.ajustes || [];
      const nomeNorm = normalizar(g.funcionario.nome);
      const valesPeriodo = descontos.filter(d => d.competencia === g.periodo && normalizar(d.alvoNome) === nomeNorm);
      const totalVales = sumMoney(valesPeriodo, v => v.valor);
      const diariasPeriodo = diarias.filter(d => d.competencia === g.periodo && normalizar(d.nome) === nomeNorm);
      const totalDiariasAvulsas = sumMoney(diariasPeriodo, d => d.valor);
      const adicionais = sumMoney(ajustes.filter(a => a.tipo === 'adicional'), a => a.valor);
      const descontosManuais = sumMoney(ajustes.filter(a => a.tipo === 'desconto'), a => a.valor);
      const descontosTotal = roundMoney(descontosManuais + totalVales);
      const totalParticipacao = roundMoney(g.total);
      // v81: bruto = lançamentos (totalPago participação) + avulsos. Adicionais agora compõem o líquido.
      const bruto = roundMoney(totalParticipacao + totalDiariasAvulsas);
      // Categoria da folha: derivada dos lançamentos (mais comum). Fallback: folhaGrupo do funcionário.
      const catCount = {};
      g.lancs.forEach(l => { if (l.categoriaFolha) catCount[l.categoriaFolha] = (catCount[l.categoriaFolha] || 0) + 1; });
      const catTop = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];
      const categoriaFolha = catTop ? catTop[0] : (g.funcionario.folhaGrupo || '');
      // v88: status — pendente / transferido / pago / cancelada (mapeia legados aberta/processada → pendente; paga → pago)
      const statusBruto = folha?.status || 'pendente';
      const status = (statusBruto === 'aberta' || statusBruto === 'processada') ? 'pendente' : (statusBruto === 'paga' ? 'pago' : statusBruto);
      return { ...g, total: totalParticipacao, ajustes, vales: valesPeriodo, totalVales, diariasPeriodo, totalDiariasAvulsas, adicionais, descontos: descontosTotal, descontosManuais, salarioFixo: 0, bruto, liquido: roundMoney(bruto + adicionais - descontosTotal), status, folhaId: folha?.id, categoriaFolha, periodoExibicao: g.periodo };
    }).sort((a, b) => b.periodo.localeCompare(a.periodo) || a.funcionario.nome.localeCompare(b.funcionario.nome));
  }, [funcionarios, lancamentos, fechamentos, folhas, descontos, diarias]);

  const folhasFiltradas = useMemo(() => folhasPorFunc.filter(f => {
    if (filtroMesFolha && f.periodo !== filtroMesFolha) return false;
    if (filtroCategoria && f.funcionario.categoria !== filtroCategoria) return false;
    if (filtroStatusFolha && f.status !== filtroStatusFolha) return false;
    if (busca && !f.funcionario.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  }), [folhasPorFunc, filtroMesFolha, filtroCategoria, filtroStatusFolha, busca]);

  const mesesFolha = useMemo(() => [...new Set(folhasPorFunc.map(f => f.periodo))].sort().reverse(), [folhasPorFunc]);

  const despesasFiltradas = useMemo(() => despesas.filter(d => {
    if (filtroCompetencia && d.competencia !== filtroCompetencia) return false;
    if (filtroCategoria && (d.tipo || 'AVULSA') !== filtroCategoria) return false;
    if (filtroStatus && d.status !== filtroStatus) return false;
    if (busca) { const q = busca.toLowerCase(); if (!`${d.descricao} ${d.centroCusto} ${d.origem}`.toLowerCase().includes(q)) return false; }
    return true;
  }).sort((a, b) => (b.competencia || '').localeCompare(a.competencia || '')), [despesas, filtroCompetencia, filtroCategoria, filtroStatus, busca]);

  const descontosFiltrados = useMemo(() => descontos.filter(d => {
    if (filtroCompetencia && d.competencia !== filtroCompetencia) return false;
    if (filtroCategoria && d.tipoVale !== filtroCategoria) return false;
    if (busca) { const q = busca.toLowerCase(); if (!`${d.alvoNome} ${d.observacoes}`.toLowerCase().includes(q)) return false; }
    return true;
  }).sort((a, b) => (b.competencia || '').localeCompare(a.competencia || '')), [descontos, filtroCompetencia, filtroCategoria, busca]);

  const totaisDespesas = useMemo(() => despesasFiltradas.reduce((s, d) => s + num(d.valor), 0), [despesasFiltradas]);
  const totaisDescontos = useMemo(() => descontosFiltrados.reduce((s, d) => s + num(d.valor), 0), [descontosFiltrados]);

  const resumoFechamento = useMemo(() => {
    const cp = competenciaResumo;
    if (!cp) return null;
    // Faturamento: não-NATURA lê fechamento direto; NATURA expande lançamentos por categoriaServico.
    const fechCp = fechamentos.filter(f => f.periodo === cp);
    const fatGroup = {};
    const addFatGroup = (k, cliente, nomeModelo, valor, imposto) => {
      if (!fatGroup[k]) fatGroup[k] = { key: k, cliente, nomeModelo, valor: 0, imposto: 0, qtd: 0 };
      fatGroup[k].valor += valor;
      fatGroup[k].imposto += imposto;
      fatGroup[k].qtd += 1;
    };
    fechCp.forEach(f => {
      const isNatura = (f.cliente || '').toUpperCase().includes('NATURA');
      if (isNatura) {
        // Categorização NATURA: usa categoria, template E descrição (fallback robusto).
        // Default = VELADA RJ (engloba diurno + noturno + qualquer não classificado).
        // VELADA SP só por categoria explícita. ARMADA/MOTOLINK detectados em qualquer um dos campos.
        const nomePorServicoNatura = (s, l) => {
          const cat  = (s?.categoriaServico || l?.categoriaServico || '').toUpperCase();
          const tpl  = (s?.template || l?.template || '').toUpperCase();
          const desc = (s?.descricao || l?.descricao || '').toUpperCase();
          const blob = `${cat} ${tpl} ${desc}`;
          if (blob.includes('ARMADA'))   return 'NATURA COSMÉTICOS - ARMADA';
          if (blob.includes('MOTOLINK')) return 'NATURA COSMÉTICOS - MOTOLINK';
          if (cat.includes('VELADA SP')) return 'NATURA COSMÉTICOS - VELADA SP';
          // Default: VELADA RJ — engloba VELADA RJ explícito, NATURA_NOTURNA, "DIURNO", "NOTURNO" etc.
          return 'NATURA COSMÉTICOS - VELADA RJ';
        };

        // Camada 1: expandir pelos IDs de lançamentos armazenados no fechamento
        const ids = f.lancamentos || [];
        // Usa String() para evitar mismatch number/string entre localStorage e estado
        const lancsExpandidos = ids.map(lid => lancamentos.find(x => String(x.id) === String(lid))).filter(Boolean);

        if (lancsExpandidos.length > 0) {
          lancsExpandidos.forEach(l => {
            const s = servicos.find(x => x.cod === l.codServico);
            const dn = nomePorServicoNatura(s, l);
            addFatGroup(`NATURA|||${dn}`, dn, '', num(l.totalFatura), num(l.imposto));
          });
        } else {
          // Camada 2: IDs não disponíveis — busca lançamentos fechados do MESMO cliente no período
          // (filtra por cliente NATURA — não por template, p/ não perder ARMADA com template diferente)
          const periodoF = f.periodo;
          const clienteF = (f.cliente || '').toUpperCase();
          const lancsCliente = lancamentos.filter(l => {
            if (l.status !== 'fechado') return false;
            if (l.data?.slice(0, 7) !== periodoF) return false;
            const s = servicos.find(x => x.cod === l.codServico);
            const cli = (s?.cliente || l.cliente || '').toUpperCase();
            return cli === clienteF;
          });

          if (lancsCliente.length > 0) {
            lancsCliente.forEach(l => {
              const s = servicos.find(x => x.cod === l.codServico);
              const dn = nomePorServicoNatura(s, l);
              addFatGroup(`NATURA|||${dn}`, dn, '', num(l.totalFatura), num(l.imposto));
            });
          } else {
            // Camada 3: fallback puro pelo template do fechamento
            const tpl = (f.template || '').toUpperCase();
            const dn = tpl.includes('MOTOLINK') ? 'NATURA COSMÉTICOS - MOTOLINK'
                     : tpl.includes('ARMADA')   ? 'NATURA COSMÉTICOS - ARMADA'
                     : 'NATURA COSMÉTICOS - VELADA RJ';
            addFatGroup(`NATURA|||${dn}`, dn, '', num(f.totalFatura), num(f.totalImposto));
          }
        }
      } else {
        // Demais clientes: agrupado apenas pelo nome do cliente
        addFatGroup(f.cliente, f.cliente, '', num(f.totalFatura), num(f.totalImposto));
      }
    });
    const faturamento = Object.values(fatGroup).map(g => ({ ...g, valor: roundMoney(g.valor), imposto: roundMoney(g.imposto) }))
      .sort((a, b) => (a.cliente || '').localeCompare(b.cliente || '') || (a.nomeModelo || '').localeCompare(b.nomeModelo || ''));
    const totalFaturamento = sumMoney(faturamento, f => f.valor);
    const totalImpostoFat = sumMoney(faturamento, f => f.imposto);
    const totalPagoFat = sumMoney(fechCp, f => f.totalPago);
    const numerosFaturas = fechCp.map(f => f.numeroFmt).filter(Boolean);

    // Folha: agrupa por modelo de exportação (template do serviço).
    const folhaGroup = {};
    folhasPorFunc.filter(fp => fp.periodo === cp).forEach(fp => {
      const func = fp.funcionario;
      fp.lancs.forEach(l => {
        const s = servicos.find(x => x.cod === l.codServico);
        const template = s?.template || l.template || 'SEM MODELO';
        if (!folhaGroup[template]) folhaGroup[template] = { key: template, template, valor: 0, qtd: 0 };
        folhaGroup[template].valor += valorParticipacao(func, l);
        folhaGroup[template].qtd += 1;
      });
    });
    const folhaItems = Object.values(folhaGroup).map(g => ({ ...g, valor: roundMoney(g.valor) }))
      .sort((a, b) => (a.template || '').localeCompare(b.template || '') || b.valor - a.valor);
    const totalFolha = sumMoney(folhaItems, f => f.valor);

    // Salários fixos agrupados por folhaGrupo (independente de fechamentos)
    const gruposFixosMap = {};
    funcionarios.filter(f => f.status === 'ATIVO' && num(f.salarioFixo) > 0 && f.folhaGrupo).forEach(f => {
      const g = f.folhaGrupo;
      if (!gruposFixosMap[g]) gruposFixosMap[g] = { key: g, grupo: g, nomes: [], total: 0, qtd: 0 };
      gruposFixosMap[g].nomes.push(f.nome);
      gruposFixosMap[g].total += num(f.salarioFixo);
      gruposFixosMap[g].qtd += 1;
    });
    const salariosFixosGrupos = Object.values(gruposFixosMap)
      .map(g => ({ ...g, total: roundMoney(g.total) }))
      .sort((a, b) => a.grupo.localeCompare(b.grupo));
    const totalSalariosFixos = sumMoney(salariosFixosGrupos, g => g.total);

    // Folha por categoria — v82: soma DIRETA por l.categoriaFolha (lançamentos fechados do período)
    // e d.folhaGrupo (diárias avulsas do período). Não usa fp.categoriaFolha (obsoleto).
    // Conta 1× por lançamento (não por funcionário) → alinhado com Dashboard "Folha das faturas".
    const folhaCatMap = {};
    (categoriasFolha || []).forEach(c => {
      const k = (c.nome || '').toUpperCase().trim();
      if (k && !folhaCatMap[k]) folhaCatMap[k] = { key: k, categoria: k, qtd: 0, total: 0 };
    });
    const addFolhaCat = (cat, val) => {
      if (!(val > 0)) return;
      const k = ((cat || '').toUpperCase().trim()) || 'SEM CATEGORIA';
      if (!folhaCatMap[k]) folhaCatMap[k] = { key: k, categoria: k, qtd: 0, total: 0 };
      folhaCatMap[k].qtd += 1;
      folhaCatMap[k].total += num(val);
    };
    // Lançamentos faturados (status='fechado') no período cp
    lancamentos.filter(l => l.status === 'fechado').forEach(l => {
      const periodo = l.competencia || (l.data || '').slice(0, 7);
      if (periodo !== cp) return;
      addFolhaCat(l.categoriaFolha, num(l.totalPago));
    });
    // Diárias avulsas do período cp
    diarias.filter(d => d.competencia === cp).forEach(d => {
      addFolhaCat(d.folhaGrupo, num(d.valor));
    });
    const folhaPorCategoria = Object.values(folhaCatMap)
      .map(g => ({ ...g, total: roundMoney(g.total) }))
      .filter(g => g.categoria !== 'SEM CATEGORIA' || g.total > 0)
      .sort((a, b) => {
        if (a.categoria === 'SEM CATEGORIA') return 1;
        if (b.categoria === 'SEM CATEGORIA') return -1;
        return a.categoria.localeCompare(b.categoria);
      });
    const totalFolhaPorCategoria = sumMoney(folhaPorCategoria, g => g.total);

    // Adiantamentos/vales da competência
    const adiantamentos = descontos.filter(d => d.competencia === cp).sort((a, b) => (a.alvoNome || '').localeCompare(b.alvoNome || ''));
    const totalAdiantamentos = sumMoney(adiantamentos, d => d.valor);

    // Despesas operacionais
    const despCp = despesas.filter(d => d.competencia === cp);
    const despesasFixas = despCp.filter(d => d.tipo === 'FIXA');
    const parcelamentos = despCp.filter(d => d.tipo === 'PARCELA');
    const despesasAvulsas = despCp.filter(d => !d.tipo || d.tipo === 'AVULSA');
    const totalFixas = sumMoney(despesasFixas, d => d.valor);
    const totalParcelamentos = sumMoney(parcelamentos, d => d.valor);
    const totalAvulsas = sumMoney(despesasAvulsas, d => d.valor);

    // Despesas da Chefia (tabela separada)
    const despChefiasCp = despChefia.filter(d => d.competencia === cp);
    const totalDespChefia = sumMoney(despChefiasCp, d => d.valor);

    // v99 — Parcelamentos consolidados (despesas op + chefia + vales). INFORMATIVO — não soma em custoTotal.
    // Cada item já é contado em seu bloco original (despesas/chefia/adiantamentos),
    // este painel só agrupa pra dar visibilidade do que está parcelado.
    const parcelaInfo = (d) => ({
      atual: d.parcelaAtual ?? null,
      total: d.parcelaTotal ?? null,
      grupoId: d.grupoParcelaId || null,
    });
    const isParcelaDespesa = (d) => d.tipo === 'PARCELA' || !!d.grupoParcelaId;
    const isParcelaVale = (d) => d.tipo === 'PARCELA' || !!d.grupoParcelaId;
    const isParcelaChefia = (d) => d.tipo === 'PARCELA' || !!d.grupoParcelaId;
    const parcelaDespesasItens = despCp.filter(isParcelaDespesa).map(d => ({
      _origem: 'Despesa', key: `desp:${d.id}`,
      descricao: d.descricao || '(sem descrição)',
      origem: d.origem || '',
      valor: num(d.valor),
      ...parcelaInfo(d),
    }));
    const parcelaChefiaItens = despChefiasCp.filter(isParcelaChefia).map(d => ({
      _origem: 'Chefia', key: `chef:${d.id}`,
      descricao: d.descricao || '(sem descrição)',
      origem: d.origem || '',
      valor: num(d.valor),
      ...parcelaInfo(d),
    }));
    const parcelaValeItens = adiantamentos.filter(isParcelaVale).map(d => ({
      _origem: 'Vale', key: `vale:${d.id}`,
      descricao: d.alvoNome || '(beneficiário)',
      origem: d.tipoVale || 'VALE',
      valor: num(d.valor),
      ...parcelaInfo(d),
    }));
    const parcelamentosTodos = [...parcelaDespesasItens, ...parcelaChefiaItens, ...parcelaValeItens]
      .sort((a, b) => a._origem.localeCompare(b._origem) || a.descricao.localeCompare(b.descricao));
    const totalParcelamentosTodos = sumMoney(parcelamentosTodos, x => x.valor);
    const totalParcelasDespesa = sumMoney(parcelaDespesasItens, x => x.valor);
    const totalParcelasChefia = sumMoney(parcelaChefiaItens, x => x.valor);
    const totalParcelasVale = sumMoney(parcelaValeItens, x => x.valor);

    return {
      faturamento, totalFaturamento, totalImpostoFat, totalPagoFat, numerosFaturas, qtdFaturas: fechCp.length,
      folha: folhaItems, totalFolha,
      folhaPorCategoria, totalFolhaPorCategoria,
      salariosFixosGrupos, totalSalariosFixos,
      adiantamentos, totalAdiantamentos,
      despesasFixas, totalFixas,
      despesasAvulsas, totalAvulsas,
      parcelamentos, totalParcelamentos,
      despesasChefia: despChefiasCp, totalDespChefia,
      parcelamentosTodos, totalParcelamentosTodos,
      totalParcelasDespesa, totalParcelasChefia, totalParcelasVale,
    };
  }, [competenciaResumo, lancamentos, fechamentos, servicos, folhasPorFunc, descontos, despesas, despChefia, funcionarios, categoriasFolha, diarias]);

  // Estado de exclusões manuais por bloco (não exclui dados, só remove do resumo/export atual)
  const [excluidosResumo, setExcluidosResumo] = useState({});
  useEffect(() => { setExcluidosResumo({}); }, [competenciaResumo]);
  const isExclResumo = (bloco, k) => (excluidosResumo[bloco] || []).includes(String(k));
  const toggleExclResumo = (bloco, k) => setExcluidosResumo(prev => {
    const lista = prev[bloco] || []; const ks = String(k);
    return { ...prev, [bloco]: lista.includes(ks) ? lista.filter(x => x !== ks) : [...lista, ks] };
  });
  const limparExclusoesResumo = () => setExcluidosResumo({});

  // Resumo já filtrado pelas exclusões manuais — usado pela UI e pelo export
  const resumoLimpo = useMemo(() => {
    if (!resumoFechamento) return null;
    const r = resumoFechamento;
    const filtrar = (arr, bloco, keyFn) => arr.filter(x => !(excluidosResumo[bloco] || []).includes(String(keyFn(x))));
    const fat = filtrar(r.faturamento, 'faturamento', f => f.key);
    const fol = filtrar(r.folha, 'folha', f => f.key);
    const folCat = filtrar(r.folhaPorCategoria, 'folhaCategoria', g => g.key);
    const sal = filtrar(r.salariosFixosGrupos, 'salariosFixos', g => g.key);
    const adi = filtrar(r.adiantamentos, 'adiantamentos', a => a.id);
    const fix = filtrar(r.despesasFixas, 'fixas', d => d.id);
    const av = filtrar(r.despesasAvulsas, 'avulsas', d => d.id);
    const par = filtrar(r.parcelamentos, 'parcelamentos', d => d.id);
    const chf = filtrar(r.despesasChefia, 'despChefia', d => d.id);
    // v99 — visão geral de parcelamentos (informativa): aplica exclusão por key composta
    const parTodos = filtrar(r.parcelamentosTodos || [], 'parcelamentosTodos', x => x.key);
    return {
      ...r,
      faturamento: fat,
      totalFaturamento: sumMoney(fat, x => x.valor),
      totalImpostoFat: sumMoney(fat, x => x.imposto),
      folha: fol,
      totalFolha: sumMoney(fol, x => x.valor),
      folhaPorCategoria: folCat,
      totalFolhaPorCategoria: sumMoney(folCat, x => x.total),
      salariosFixosGrupos: sal,
      totalSalariosFixos: sumMoney(sal, x => x.total),
      adiantamentos: adi,
      totalAdiantamentos: sumMoney(adi, x => x.valor),
      despesasFixas: fix,
      totalFixas: sumMoney(fix, x => x.valor),
      despesasAvulsas: av,
      totalAvulsas: sumMoney(av, x => x.valor),
      parcelamentos: par,
      totalParcelamentos: sumMoney(par, x => x.valor),
      despesasChefia: chf,
      totalDespChefia: sumMoney(chf, x => x.valor),
      parcelamentosTodos: parTodos,
      totalParcelamentosTodos: sumMoney(parTodos, x => x.valor),
      totalParcelasDespesa: sumMoney(parTodos.filter(x => x._origem === 'Despesa'), x => x.valor),
      totalParcelasChefia: sumMoney(parTodos.filter(x => x._origem === 'Chefia'), x => x.valor),
      totalParcelasVale: sumMoney(parTodos.filter(x => x._origem === 'Vale'), x => x.valor),
    };
  }, [resumoFechamento, excluidosResumo]);
  const totalExcluidos = Object.values(excluidosResumo).reduce((s, arr) => s + (arr?.length || 0), 0);

  // === AÇÕES ===
  const gerarOS = useCallback(() => {
    osCounterRef.current += 1;
    const n = osCounterRef.current;
    setOsCounter(n);
    return `OS-${String(n).padStart(4, '0')}`;
  }, []);

  const salvarLancamento = (dados) => {
    if (!dados.codServico) { showToast('Selecione um serviço antes de salvar', 'error'); return; }
    const s = servicos.find(x => x.cod === dados.codServico);
    if (!s) { showToast(`Serviço #${dados.codServico} não encontrado no catálogo. Cadastre-o primeiro ou selecione outro.`, 'error'); return; }
    if (!dados.data) { showToast('Informe a data do lançamento', 'error'); return; }
    const t = TEMPLATES[s.template]; const calc = calcular(s, dados, t);
    // Competência: só persiste override quando o usuário explicitamente escolhe um mês ≠ data.slice(0,7).
    const compInput = String(dados.competencia || '').trim();
    const compFromData = String(dados.data || '').slice(0, 7);
    const competencia = (compInput && compInput !== compFromData) ? compInput : '';
    // Categoria de folha: preserva exatamente o que veio do form (em caixa alta), aceita string vazia.
    const categoriaFolha = String(dados.categoriaFolha ?? '').trim().toUpperCase();
    // Se a categoria não existe no Cat. Folha, cria automaticamente
    if (categoriaFolha) garantirCategoriasFolha([categoriaFolha]);
    const lanc = { id: dados.id || `L${Date.now()}`, os: dados.os || gerarOS(), data: dados.data, competencia, categoriaFolha, codServico: dados.codServico, descricao: s.descricao, cliente: s.cliente, cnpj: s.cnpj, template: s.template, horasTrabalhadas: num(dados.horasTrabalhadas), kmRodados: num(dados.kmRodados), pedagio: num(dados.pedagio), batidaExtra: num(dados.batidaExtra), outros: num(dados.outros), isDomingo: dados.isDomingo === undefined ? eDomingo(dados.data) : !!dados.isDomingo, isFeriado: !!dados.isFeriado, nomeFeriado: dados.nomeFeriado || '', extras: dados.extras || {}, observacoes: dados.observacoes || '', status: dados.status || 'pendente', ...calc, atualizadoEm: new Date().toISOString() };
    setLancamentos(prev => { const i = prev.findIndex(x => x.id === lanc.id); if (i >= 0) { const cp = [...prev]; cp[i] = lanc; return cp; } return [lanc, ...prev]; });
    showToast(dados.id ? 'Lançamento atualizado' : 'Lançamento adicionado'); setModal(null);
  };
  const excluirLancamento = (id) => { setLancamentos(prev => prev.filter(l => l.id !== id)); showToast('Excluído'); setModal(null); };

  // Edita SOMENTE valores pagos do lançamento (mesmo se status='fechado').
  // Não afeta fatura — folha do funcionário usa esses valores via valorParticipacao.
  const salvarPagoLancamento = (id, pago) => {
    setLancamentos(prev => prev.map(l => {
      if (l.id !== id) return l;
      const diariaPaga = num(pago.diariaPaga);
      const extraHorasPaga = num(pago.extraHorasPaga);
      const extraKmPago = num(pago.extraKmPago);
      const adicDomPago = num(pago.adicDomPago);
      const pedagioReembolso = num(pago.pedagioReembolso);
      const totalPago = roundMoney(diariaPaga + extraHorasPaga + extraKmPago + adicDomPago + pedagioReembolso);
      const aliquota = num(l.aliquotaAplicada || l.aliquota);
      const imposto = num(l.imposto);
      const totalFatura = num(l.totalFatura);
      const lucro = roundMoney(totalFatura - totalPago - imposto);
      return { ...l, diariaPaga, extraHorasPaga, extraKmPago, adicDomPago, pedagioReembolso, totalPago, lucro, atualizadoEm: new Date().toISOString() };
    }));
    showToast('Valores pagos atualizados — fatura não foi alterada');
    setModal(null);
  };

  // CRUD categorias de folha (cadastrar previamente, depois usar nos lançamentos)
  const salvarCategoriaFolha = (cat) => {
    const dados = { id: cat.id || `CF${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, nome: (cat.nome || '').trim().toUpperCase(), cor: cat.cor || 'blue' };
    if (!dados.nome) { showToast('Informe o nome da categoria', 'error'); return; }
    setCategoriasFolha(prev => {
      const dup = prev.find(c => c.nome === dados.nome && c.id !== dados.id);
      if (dup) { showToast('Já existe uma categoria com esse nome', 'error'); return prev; }
      const i = prev.findIndex(c => c.id === dados.id);
      if (i >= 0) { const cp = [...prev]; cp[i] = dados; return cp; }
      return [...prev, dados].sort((a, b) => a.nome.localeCompare(b.nome));
    });
    showToast(cat.id ? 'Categoria atualizada' : 'Categoria criada');
    setModal(null);
  };
  const excluirCategoriaFolha = (id) => {
    setCategoriasFolha(prev => prev.filter(c => c.id !== id));
    showToast('Categoria removida');
    setModal(null);
  };

  // Bulk: muda competência de N lançamentos.
  // Se novaComp for vazio, limpa o override (volta a usar data.slice(0,7)).
  // Se novaComp == data.slice(0,7) do lançamento, não persiste override.
  const atualizarCompetenciaLancamentosMassa = (ids, novaComp) => {
    if (!ids || ids.length === 0) return;
    const c = (novaComp || '').trim();
    setLancamentos(prev => prev.map(l => {
      if (!ids.includes(l.id)) return l;
      const dataComp = (l.data || '').slice(0, 7);
      const competencia = (c && c !== dataComp) ? c : '';
      return { ...l, competencia, atualizadoEm: new Date().toISOString() };
    }));
    showToast(c ? `Competência atualizada em ${ids.length} lançamento(s)` : `Competência limpa em ${ids.length} lançamento(s) — voltou a seguir a data`);
  };
  // Bulk: muda categoria de folha de N lançamentos
  const atualizarCategoriaFolhaLancamentosMassa = (ids, cat) => {
    if (!ids || ids.length === 0) return;
    const c = (cat || '').toUpperCase();
    // Se a categoria não existe no Cat. Folha, cria automaticamente
    if (c) garantirCategoriasFolha([c]);
    setLancamentos(prev => prev.map(l => ids.includes(l.id) ? { ...l, categoriaFolha: c, atualizadoEm: new Date().toISOString() } : l));
    showToast(`Categoria de folha atualizada em ${ids.length} lançamento(s)`);
  };
  // Bulk: atribui um prestador (funcionário) aos lançamentos selecionados.
  // slot='auto' preenche o primeiro vazio na ordem agente1 → agente → agente2 → motorista;
  // slot='agente1'/'agente'/'agente2'/'motorista' substitui o slot indicado.
  const atualizarPrestadorLancamentosMassa = (ids, nomePrestador, slotAlvo = 'auto') => {
    if (!ids || ids.length === 0 || !nomePrestador) return;
    const nome = String(nomePrestador).trim();
    if (!nome) return;
    let aplicados = 0, pulados = 0;
    setLancamentos(prev => prev.map(l => {
      if (!ids.includes(l.id)) return l;
      const e = { ...(l.extras || {}) };
      if (slotAlvo === 'auto') {
        const ordem = ['agente1', 'agente', 'agente2', 'motorista'];
        const slot = ordem.find(s => !e[s]);
        if (!slot) { pulados++; return l; }
        e[slot] = nome;
      } else {
        e[slotAlvo] = nome;
      }
      aplicados++;
      return { ...l, extras: e, atualizadoEm: new Date().toISOString() };
    }));
    showToast(`Prestador atribuído em ${aplicados} lançamento(s)${pulados > 0 ? ` · ${pulados} pulado(s) (todos os slots preenchidos)` : ''}`);
  };

  // v86: salva snapshot do resumoLimpo + relatório gerencial calculado
  const salvarResumo = (nome) => {
    if (!nome || !resumoLimpo) return;
    const totalFolha = num(resumoLimpo.totalFolhaPorCategoria);
    const totalVales = num(resumoLimpo.totalAdiantamentos);
    const folhaLiquida = roundMoney(totalFolha - totalVales);
    const todasOp = [...(resumoLimpo.despesasFixas || []), ...(resumoLimpo.despesasAvulsas || []), ...(resumoLimpo.parcelamentos || [])];
    const totalCartaoEmpresa = sumMoney(todasOp.filter(d => ['CARTAO CORPORATIVO', 'EMPRESA'].includes(normalizar(d.origem))), d => d.valor);
    const totalGalop = sumMoney((resumoLimpo.despesasAvulsas || []).filter(d => normalizar(d.origem).includes('GALOP')), d => d.valor);
    const totalManhaes = sumMoney((resumoLimpo.despesasChefia || []).filter(d => normalizar(d.origem) === normalizar('MANHÃES')), d => d.valor);
    const totalRicardo = sumMoney((resumoLimpo.despesasChefia || []).filter(d => normalizar(d.origem) === 'RICARDO'), d => d.valor);
    const totalGeralPagar = roundMoney(folhaLiquida + totalCartaoEmpresa + totalGalop + totalManhaes + totalRicardo);
    const novo = {
      id: `RS${Date.now()}`,
      nome: nome.trim(),
      competencia: competenciaResumo,
      criadoEm: new Date().toISOString(),
      totalFaturamento: num(resumoLimpo.totalFaturamento),
      totalImpostoFat: num(resumoLimpo.totalImpostoFat),
      totalFolha,
      totalVales,
      folhaLiquida,
      totalCartaoEmpresa,
      totalGalop,
      totalManhaes,
      totalRicardo,
      totalGeralPagar,
      qtdFaturas: resumoLimpo.qtdFaturas || 0,
      numerosFaturas: resumoLimpo.numerosFaturas || [],
    };
    setResumosSalvos(prev => [novo, ...prev]);
    showToast(`Resumo "${novo.nome}" salvo`);
  };
  const excluirResumoSalvo = (id) => {
    setResumosSalvos(prev => prev.filter(r => r.id !== id));
    showToast('Resumo salvo excluído');
  };

  // Recalcula valores de todos os lançamentos pendentes (não fechados em fatura).
  // Útil para corrigir lançamentos importados em versões antigas onde HORAS TRAB
  // não era respeitada e os totais ficaram subestimados.
  const recalcularPendentes = () => {
    let mudou = 0;
    const recalc = lancamentos.map(l => {
      if (l.status === 'fechado') return l;
      const s = servicos.find(x => x.cod === l.codServico);
      if (!s) return l;
      const t = TEMPLATES[s.template];
      const calc = calcular(s, l, t);
      const fatAntes = num(l.totalFatura), fatDepois = num(calc.totalFatura);
      if (Math.abs(fatAntes - fatDepois) > 0.01) { mudou++; return { ...l, ...calc, atualizadoEm: new Date().toISOString() }; }
      return l;
    });
    if (mudou > 0) {
      setLancamentos(recalc);
      showToast(`${mudou} lançamento(s) recalculado(s)`, 'success');
    } else {
      showToast('Nenhum lançamento precisa ser recalculado', 'success');
    }
  };

  const importarLancamentos = (rows) => {
    const novos = []; const baseId = Date.now();
    let semHoras = 0;
    rows.forEach((dados, idx) => {
      const s = servicos.find(x => x.cod === dados.codServico); if (!s || !dados.data) return;
      const t = TEMPLATES[s.template]; const ext = dados.extras || {};
      // Prioridade: 1) coluna HORAS TRABALHADAS explícita da planilha (respeita 0)
      //             2) inicio/termino 3) inicioMissao/terminoMissao
      const htExplicito = 'horasTrabalhadas' in dados;
      let horasTrabalhadas = htExplicito ? num(dados.horasTrabalhadas) : 0;
      if (!htExplicito) {
        if (ext.inicio && ext.termino) horasTrabalhadas = diffHorasDecimal(ext.inicio, ext.termino, dados.data);
        else if (ext.inicioMissao && ext.terminoMissao) horasTrabalhadas = diffHorasDecimal(ext.inicioMissao, ext.terminoMissao, dados.data);
      }
      const kmExplicito = 'kmRodados' in dados;
      let kmRodados = kmExplicito ? num(dados.kmRodados) : 0;
      if (!kmExplicito && ext.kmInicial != null && ext.kmFinal != null && ext.kmFinal !== '' && ext.kmInicial !== '') kmRodados = Math.max(0, num(ext.kmFinal) - num(ext.kmInicial));
      // Sinaliza linhas que esperaríamos ter horas mas ficaram zeradas (serviço com franquia > 0)
      if (horasTrabalhadas === 0 && num(s.franquiaHoras) > 0) semHoras++;
      const nomeFeriado = detectarFeriado(dados.data, feriadosExtra) || '';
      const isFeriado = !!nomeFeriado;
      const lancData = { horasTrabalhadas, kmRodados, pedagio: num(dados.pedagio ?? ext.pedagio), batidaExtra: num(dados.batidaExtra ?? ext.batidaExtra), outros: 0, isDomingo: eDomingo(dados.data), isFeriado };
      const calc = calcular(s, lancData, t);
      // Preserva competencia/categoriaFolha do dados se vierem da planilha
      const compInput = String(dados.competencia || '').trim();
      const compFromData = String(dados.data || '').slice(0, 7);
      const competencia = (compInput && compInput !== compFromData) ? compInput : '';
      const categoriaFolha = String(dados.categoriaFolha ?? '').trim().toUpperCase();
      novos.push({ id: `L${baseId}_${idx}`, os: gerarOS(), data: dados.data, competencia, categoriaFolha, codServico: dados.codServico, descricao: s.descricao, cliente: s.cliente, cnpj: s.cnpj, template: s.template, horasTrabalhadas, kmRodados, pedagio: lancData.pedagio, batidaExtra: lancData.batidaExtra, outros: 0, isDomingo: lancData.isDomingo, isFeriado, nomeFeriado, extras: ext, observacoes: ext.observacao || ext.obs || '', status: 'pendente', ...calc, atualizadoEm: new Date().toISOString() });
    });
    setLancamentos(prev => [...novos, ...prev]);
    let msg = `${novos.length} lançamentos importados`;
    if (rows.length - novos.length > 0) msg += ` (${rows.length - novos.length} ignorados)`;
    if (semHoras > 0) msg += ` ⚠ ${semHoras} sem horas — verifique colunas inicio/termino ou HORAS TRABALHADAS`;
    showToast(msg, semHoras > 0 ? 'error' : 'success'); setModal(null);
  };

  const salvarServico = (s, codAnterior) => {
    // id = cod garante que o shim pode recuperar o _apiId via _idMap para serviços novos
    const svc = { ...s, id: s.id ?? s.cod };
    if (codAnterior && codAnterior !== svc.cod) {
      if (servicos.some(x => x.cod === svc.cod)) { alert('Já existe outro serviço com esse código'); return; }
      setServicos(prev => [...prev.filter(x => x.cod !== codAnterior), svc]);
      setLancamentos(prev => prev.map(l => l.codServico === codAnterior ? { ...l, codServico: svc.cod } : l));
      showToast(`Código alterado de #${codAnterior} para #${svc.cod}`);
    } else {
      setServicos(prev => { const i = prev.findIndex(x => x.cod === svc.cod); if (i >= 0) { const cp = [...prev]; cp[i] = svc; return cp; } return [...prev, svc]; });
      showToast('Serviço salvo');
    }
    setModal(null);
  };
  const excluirServico = (cod) => { setServicos(prev => prev.filter(s => s.cod !== cod)); showToast('Removido'); setModal(null); };
  const salvarCliente = (dados) => {
    setClientes(prev => {
      const idx = prev.findIndex(c => c.id === dados.id);
      if (idx >= 0) { const cp = [...prev]; cp[idx] = dados; return cp; }
      return [{ ...dados, id: `C${Date.now()}` }, ...prev];
    });
    showToast(dados.id ? 'Cliente atualizado' : 'Cliente adicionado'); setModal(null);
  };
  const excluirCliente = (id) => { setClientes(prev => prev.filter(c => c.id !== id)); showToast('Cliente removido'); setModal(null); };
  const atualizarCategoriaServico = (cod, cat) => {
    setServicos(prev => prev.map(s => s.cod === cod ? { ...s, categoriaServico: cat } : s));
  };

  const salvarFuncionario = (f) => {
    const dados = { ...f, id: f.id || `F${Date.now()}`, criadoEm: f.criadoEm || new Date().toISOString() };
    setFuncionarios(prev => { const i = prev.findIndex(x => x.id === dados.id); if (i >= 0) { const cp = [...prev]; cp[i] = dados; return cp; } return [...prev, dados]; });
    showToast(f.id ? 'Atualizado' : 'Cadastrado'); setModal(null);
  };
  const excluirFuncionario = async (id) => {
    const func = funcionarios.find(f => f.id === id);
    if (func) {
      if (func.fotoMeta) await deleteArquivoStorage(fotoKey(id));
      for (const d of (func.documentos || [])) await deleteArquivoStorage(docKey(id, d.id));
    }
    setFuncionarios(prev => prev.filter(f => f.id !== id));
    showToast('Removido'); setModal(null);
  };

  const importarFuncionarios = ({ novos, atualizar }) => {
    const agora = new Date().toISOString();
    const novosComId = novos.map((f, i) => ({
      ...f,
      id: `F${Date.now()}${String(i).padStart(3, '0')}`,
      criadoEm: agora,
      documentos: f.documentos || [],
      fotoMeta: null,
    }));
    setFuncionarios(prev => {
      // Atualiza existentes mesclando — preserva foto, documentos e id originais
      let atualizado = prev.map(f => {
        const u = atualizar.find(x => x.existente.id === f.id);
        if (!u) return f;
        const merged = { ...f };
        Object.entries(u.novo).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '' && k !== 'id' && k !== 'criadoEm' && k !== 'documentos' && k !== 'fotoMeta') {
            merged[k] = v;
          }
        });
        merged.atualizadoEm = agora;
        return merged;
      });
      return [...atualizado, ...novosComId];
    });
    const partes = [];
    if (novos.length > 0) partes.push(`${novos.length} novo${novos.length > 1 ? 's' : ''}`);
    if (atualizar.length > 0) partes.push(`${atualizar.length} atualizado${atualizar.length > 1 ? 's' : ''}`);
    showToast(`Importação concluída: ${partes.join(' · ')}`);
    setModal(null);
  };

  // Importação dedicada de salários fixos (atualiza apenas salarioFixo e folhaGrupo de quem já existe)
  // Helper: cria categorias de folha que ainda não existem no catálogo, com base em uma lista de nomes
  const garantirCategoriasFolha = (nomes) => {
    const validos = [...new Set(nomes.map(n => (n || '').trim().toUpperCase()).filter(Boolean))];
    if (validos.length === 0) return 0;
    let criadas = 0;
    setCategoriasFolha(prev => {
      const existentes = new Set(prev.map(c => c.nome));
      const novas = validos.filter(n => !existentes.has(n)).map(n => ({
        id: `CF${Date.now()}_${Math.random().toString(36).slice(2, 5)}_${n.slice(0, 3)}`,
        nome: n,
        cor: 'blue',
      }));
      criadas = novas.length;
      if (novas.length === 0) return prev;
      return [...prev, ...novas].sort((a, b) => a.nome.localeCompare(b.nome));
    });
    return criadas;
  };

  const garantirFuncionarios = (nomes) => {
    const validos = [...new Set(nomes.map(n => (n || '').trim()).filter(Boolean))];
    if (validos.length === 0) return 0;
    let criados = 0;
    setFuncionarios(prev => {
      const existentes = new Set(prev.map(f => (f.nome || '').trim().toLowerCase()));
      const novos = validos
        .filter(n => !existentes.has(n.toLowerCase()))
        .map(n => ({
          id: `F${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          nome: n,
          status: 'Ativo',
          criadoEm: new Date().toISOString(),
        }));
      criados = novos.length;
      if (novos.length === 0) return prev;
      return [...prev, ...novos].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    });
    return criados;
  };

  const importarSalariosFixos = ({ atualizar }) => {
    if (!atualizar || atualizar.length === 0) { showToast('Nenhum colaborador atualizado', 'error'); setModal(null); return; }
    const agora = new Date().toISOString();
    // Cria categorias novas que vieram na importação e ainda não existem
    const criadas = garantirCategoriasFolha(atualizar.map(u => u.novo.folhaGrupo).filter(Boolean));
    setFuncionarios(prev => prev.map(f => {
      const u = atualizar.find(x => x.existente.id === f.id);
      if (!u) return f;
      return { ...f, salarioFixo: num(u.novo.salarioFixo), folhaGrupo: u.novo.folhaGrupo || f.folhaGrupo || '', atualizadoEm: agora };
    }));
    const msg = `Salários atualizados: ${atualizar.length}` + (criadas > 0 ? ` · ${criadas} categoria(s) nova(s) criada(s)` : '');
    showToast(msg, 'success');
    setModal(null);
  };

  // Importação XLSX de diárias avulsas (mesmo padrão dos demais imports)
  const importarDiariasXLSX = ({ itens }) => {
    if (!itens || itens.length === 0) { showToast('Nenhuma diária válida encontrada', 'error'); setModal(null); return; }
    const criados = garantirFuncionarios(itens.map(it => it.nome).filter(Boolean));
    const criadas = garantirCategoriasFolha(itens.map(it => it.folhaGrupo).filter(Boolean));
    const novos = itens.map((it, i) => ({
      ...it,
      id: `DI_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
    }));
    setDiarias(prev => [...prev, ...novos]);
    const msg = `${novos.length} diária(s) importada(s)`
      + (criados > 0 ? ` · ${criados} funcionário(s) cadastrado(s)` : '')
      + (criadas > 0 ? ` · ${criadas} categoria(s) nova(s)` : '');
    showToast(msg, 'success');
    setModal(null);
  };

  const salvarFolha = (folhaData) => {
    setFolhas(prev => {
      const existing = prev.find(f => f.funcionarioId === folhaData.funcionarioId && f.periodo === folhaData.periodo);
      if (existing) return prev.map(f => f.id === existing.id ? { ...f, ...folhaData } : f);
      return [...prev, { id: `FP${Date.now()}`, ...folhaData }];
    });
  };

  // Atualiza um campo (categoriaFolha ou periodoExibicao) numa folha — cria registro se não existir
  const atualizarCampoFolha = (funcionarioId, periodo, campo, valor) => {
    setFolhas(prev => {
      const existing = prev.find(f => f.funcionarioId === funcionarioId && f.periodo === periodo);
      if (existing) return prev.map(f => f.id === existing.id ? { ...f, [campo]: valor } : f);
      return [...prev, { id: `FP${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, funcionarioId, periodo, [campo]: valor }];
    });
  };

  // Bulk: atualiza status de N folhas (chaves no formato funcId|periodo)
  const atualizarStatusFolhasMassa = (chaves, novoStatus) => {
    if (!chaves || chaves.length === 0) return;
    const validos = ['pendente', 'transferido', 'pago', 'cancelada'];
    if (!validos.includes(novoStatus)) return;
    chaves.forEach(k => {
      const [funcionarioId, periodo] = k.split('|');
      atualizarCampoFolha(funcionarioId, periodo, 'status', novoStatus);
      if (novoStatus === 'pago') atualizarCampoFolha(funcionarioId, periodo, 'dataPagamento', new Date().toISOString().slice(0, 10));
    });
    showToast(`${chaves.length} folha(s) marcada(s) como ${novoStatus}`);
  };

  // Bulk: atualiza categoria em massa de uma lista de folhas (chaves no formato funcId|periodo)
  const atualizarCategoriaFolhasMassa = (chaves, novaCategoria) => {
    if (!chaves || chaves.length === 0) return;
    chaves.forEach(k => {
      const [funcionarioId, periodo] = k.split('|');
      atualizarCampoFolha(funcionarioId, periodo, 'categoriaFolha', novaCategoria);
    });
    showToast(`Categoria atualizada em ${chaves.length} folha(s)`);
  };

  // Bulk: muda competência exibida (não move dados, só rótulo)
  const atualizarCompetenciaFolhasMassa = (chaves, novoPeriodo) => {
    if (!chaves || chaves.length === 0) return;
    chaves.forEach(k => {
      const [funcionarioId, periodo] = k.split('|');
      atualizarCampoFolha(funcionarioId, periodo, 'periodoExibicao', novoPeriodo);
    });
    showToast(`Competência atualizada em ${chaves.length} folha(s)`);
  };

  const salvarDespesa = async (d) => {
    if (d.__parcelado) return criarParceladoAPI('despesas', d, d.id || null);
    const dados = { ...d, id: d.id || `D${Date.now()}`, valor: num(d.valor), criadoEm: d.criadoEm || new Date().toISOString() };
    setDespesas(prev => { const i = prev.findIndex(x => x.id === dados.id); if (i >= 0) { const cp = [...prev]; cp[i] = dados; return cp; } return [dados, ...prev]; });
    showToast(d.id ? 'Despesa atualizada' : 'Despesa adicionada'); setModal(null);
  };
  const excluirDespesa = (id) => { setDespesas(prev => prev.filter(d => d.id !== id)); showToast('Removida'); setModal(null); };

  // v96 — Helper único pra criar parcelamento via API. Recarrega a lista no shim.
  // payload `d` traz: descricao/alvoNome, valor, competencia, parcelaTotal,
  // origem/centroCusto/observacoes/tipoVale/etc dependendo da entidade.
  // v99 — `idAntigo` opcional: quando informado, o registro pré-existente é apagado
  // após a criação das parcelas (fluxo "Editar despesa → marcar Parcelada → migrar").
  const criarParceladoAPI = async (entidade, d, idAntigo = null) => {
    const valorParc = num(d.valor);
    const parcelaTotal = parseInt(d.parcelaTotal, 10);
    if (!parcelaTotal || parcelaTotal < 2) { showToast('Total de parcelas inválido (mínimo 2)', 'error'); return; }
    if (!valorParc) { showToast('Valor por parcela inválido', 'error'); return; }
    if (!d.competencia) { showToast('Competência inicial é obrigatória', 'error'); return; }

    const payloadBase = {
      entidade,
      parcela_total: parcelaTotal,
      valor_parcela: valorParc,
      competencia_inicial: d.competencia,
      data_inicial: d.dataLancamento || d.data || null,
      observacoes: d.observacoes || null,
    };
    let payload = payloadBase;
    if (entidade === 'despesas') {
      payload = { ...payloadBase, descricao: d.descricao, centro_custo: d.centroCusto || null, origem: d.origem || null };
    } else if (entidade === 'despesas_chefia') {
      payload = { ...payloadBase, descricao: d.descricao, origem: d.origem || 'MANHÃES' };
    } else if (entidade === 'descontos') {
      payload = { ...payloadBase, alvo_nome: d.alvoNome, tipo_vale: d.tipoVale || 'VALE', centro_custo: d.centroCusto || null, forma_pagamento: d.formaPagamento || null, funcionario_id: d.funcionarioId || null };
    }
    try {
      const resp = await fetch('/api/parcelas/criar.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await resp.json();
      if (!resp.ok || !json.ok) throw new Error(json?.error || `Erro HTTP ${resp.status}`);

      // v99 — se vier de uma edição, remove o registro original (já substituído pela 1ª parcela)
      let apagouOriginal = false;
      if (idAntigo) {
        const endpointMap = { despesas: 'despesas', despesas_chefia: 'despesas_chefia', descontos: 'descontos' };
        const ent = endpointMap[entidade];
        try {
          const respDel = await fetch(`/api/${ent}/item.php?id=${encodeURIComponent(idAntigo)}`, { method: 'DELETE', credentials: 'include' });
          if (respDel.ok) apagouOriginal = true;
        } catch (_) {}
      }

      showToast(idAntigo
        ? `Convertida em ${json.data.parcelas_criadas} parcela(s)${apagouOriginal ? '' : ' (revisar duplicata da 1ª)'}`
        : `${json.data.parcelas_criadas} parcela(s) criada(s)`, 'success');
      // Repuxa do servidor pra refletir as N novas linhas (e a exclusão da antiga, se houver)
      const chave = entidade === 'despesas' ? 'despesas' : entidade === 'despesas_chefia' ? 'despesasChefia' : 'descontos';
      try { await window.storage?.refresh?.(chave); } catch (_) {}
      setModal(null);
    } catch (e) {
      showToast(e.message || 'Falha ao criar parcelamento', 'error');
    }
  };

  // v96 — Botão one-shot: roda a heurística no backend pra inferir grupos e
  // criar as parcelas faltantes. Confirma antes (operação destrutiva-criação).
  const migrarParcelasExistentes = async (entidade) => {
    const labelMap = { despesas: 'Despesas', despesas_chefia: 'Despesas da Chefia', descontos: 'Vales' };
    const label = labelMap[entidade] || entidade;
    if (!window.confirm(`MIGRAÇÃO de ${label}\n\nIsso vai:\n1. Agrupar parcelas existentes (mesma descrição+valor+total)\n2. Criar as parcelas faltantes nos meses seguintes\n\nÉ irreversível pelo sistema (você pode apagar manualmente depois). Continuar?`)) return;
    try {
      const resp = await fetch('/api/parcelas/migrar.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ entidade, dry_run: false }),
      });
      const json = await resp.json();
      if (!resp.ok || !json.ok) throw new Error(json?.error || `Erro HTTP ${resp.status}`);
      const r = json.data;
      const linhas = [
        `Grupos processados: ${r.grupos_processados}`,
        `Parcelas existentes vinculadas: ${r.parcelas_atualizadas}`,
        `Parcelas criadas (faltantes): ${r.parcelas_criadas}`,
      ];
      if (r.anomalias?.length) linhas.push(`Anomalias (não migradas): ${r.anomalias.length} — ver console`);
      console.log('[migrar parcelas]', r);
      alert(`Migração de ${label} concluída:\n\n${linhas.join('\n')}`);
      const chave = entidade === 'despesas' ? 'despesas' : entidade === 'despesas_chefia' ? 'despesasChefia' : 'descontos';
      try { await window.storage?.refresh?.(chave); } catch (_) {}
    } catch (e) {
      alert(`Falha na migração: ${e.message || e}`);
    }
  };

  // ============ v97 — MÓDULO DE PROPOSTAS ============
  // Comunicação direta com /api/propostas/* (não usa storage-shim)

  const carregarPropostas = async (filtros = {}) => {
    setLoadingPropostas(true);
    try {
      const params = new URLSearchParams();
      if (filtros.status && filtros.status !== 'todos') params.set('status', filtros.status);
      if (filtros.categoria) params.set('categoria', filtros.categoria);
      if (filtros.q) params.set('q', filtros.q);
      const url = `/api/propostas/index.php${params.toString() ? '?' + params.toString() : ''}`;
      const resp = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } });
      const json = await resp.json();
      if (!resp.ok || !json.ok) throw new Error(json?.error || `Erro HTTP ${resp.status}`);
      setPropostas(json.data || []);
    } catch (e) {
      showToast(`Falha ao carregar propostas: ${e.message}`, 'error');
    } finally {
      setLoadingPropostas(false);
    }
  };

  // Abre o modal de proposta garantindo que os itens estejam carregados.
  // O GET da lista já retorna itens desde v1.0.8, mas se vier vazio (cache)
  // faz um fetch individual como fallback.
  const abrirPropostaComItens = async (p) => {
    if (p.itens && p.itens.length > 0) {
      setModal({ tipo: 'proposta', dados: p });
      return;
    }
    try {
      const apiId = p._apiId || p.id;
      const resp = await fetch(`/api/propostas/item.php?id=${apiId}`, { credentials: 'include' });
      if (resp.ok) {
        const json = await resp.json();
        const full = json.data || json;
        setModal({ tipo: 'proposta', dados: { ...p, ...full, itens: full.itens || [] } });
        return;
      }
    } catch { /* usa o que tem */ }
    setModal({ tipo: 'proposta', dados: p });
  };

  const salvarProposta = async (form) => {
    const payload = {
      cliente_id: form.cliente_id || null,
      cliente_nome: form.cliente_nome || null,
      cliente_cnpj: form.cliente_cnpj,
      cliente_email: form.cliente_email || null,
      categoria: form.categoria,
      prestador: form.prestador || null,
      condicoes_comerciais: form.condicoes_comerciais || null,
      condicoes_faturamento: form.condicoes_faturamento || null,
      prazos: form.prazos || null,
      vencimento: form.vencimento || null,
      observacoes: form.observacoes || null,
      itens: (form.itens || []).map((it, idx) => ({
        ordem: idx,
        descricao: it.descricao || '',
        quantidade: num(it.quantidade ?? 1),
        valor_unitario: num(it.valor_unitario ?? 0),
        valor_total: num(it.valor_total ?? (num(it.quantidade ?? 1) * num(it.valor_unitario ?? 0))),
        efetivo: it.efetivo ? parseInt(it.efetivo, 10) : null,
        escala: it.escala || null,
        servico_origem_id: it.servico_origem_id || null,
        template: it.template || null,
        categoria_servico: it.categoria_servico || null,
        // v98: campos operacionais (ESCOLTA)
        franquia_horas: num(it.franquia_horas ?? 0),
        franquia_km: num(it.franquia_km ?? 0),
        hora_extra_fatura: num(it.hora_extra_fatura ?? 0),
        km_extra_fatura: num(it.km_extra_fatura ?? 0),
        adicional_domingos_fatura: num(it.adicional_domingos_fatura ?? 0),
        aliquota: num(it.aliquota ?? 0),
      })),
    };
    try {
      const isEdit = !!form.id;
      const url = isEdit ? `/api/propostas/item.php?id=${form.id}` : '/api/propostas/index.php';
      const resp = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await resp.json();
      if (!resp.ok || !json.ok) throw new Error(json?.error || `Erro HTTP ${resp.status}`);
      showToast(isEdit ? `Proposta ${json.data.numero_formatado} atualizada` : `Proposta ${json.data.numero_formatado} criada`, 'success');
      setModal(null);
      await carregarPropostas({ status: filtroStatusProposta, categoria: filtroCategoriaProposta, q: buscaProposta });
    } catch (e) {
      showToast(e.message || 'Falha ao salvar proposta', 'error');
    }
  };

  const alterarStatusProposta = async (proposta, novoStatus, motivoRejeicao = null) => {
    try {
      const body = { status: novoStatus };
      if (motivoRejeicao !== null) body.motivo_rejeicao = motivoRejeicao;
      const resp = await fetch(`/api/propostas/item.php?id=${proposta.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const json = await resp.json();
      if (!resp.ok || !json.ok) throw new Error(json?.error || `Erro HTTP ${resp.status}`);
      showToast(`Proposta marcada como ${novoStatus}`, 'success');
      await carregarPropostas({ status: filtroStatusProposta, categoria: filtroCategoriaProposta, q: buscaProposta });
    } catch (e) {
      showToast(e.message || 'Falha ao alterar status', 'error');
    }
  };

  const enviarProposta = async (proposta, destinatariosExtras = []) => {
    try {
      const resp = await fetch('/api/email/enviar_proposta.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          proposta_id: proposta.id,
          destinatarios: destinatariosExtras,
        }),
      });
      const json = await resp.json();
      if (!resp.ok || !json.ok) throw new Error(json?.error || `Erro HTTP ${resp.status}`);
      showToast(`Proposta ${json.data.numero_formatado} enviada para ${json.data.enviados} destinatário(s)`, 'success');
      await carregarPropostas({ status: filtroStatusProposta, categoria: filtroCategoriaProposta, q: buscaProposta });
    } catch (e) {
      showToast(e.message || 'Falha ao enviar proposta', 'error');
    }
  };

  const excluirProposta = async (proposta) => {
    if (!window.confirm(`Excluir proposta ${proposta.numero_formatado}? (será marcada como Rejeitada e arquivada)`)) return;
    try {
      const resp = await fetch(`/api/propostas/item.php?id=${proposta.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await resp.json();
      if (!resp.ok || !json.ok) throw new Error(json?.error || `Erro HTTP ${resp.status}`);
      showToast('Proposta arquivada', 'success');
      await carregarPropostas({ status: filtroStatusProposta, categoria: filtroCategoriaProposta, q: buscaProposta });
    } catch (e) {
      showToast(e.message || 'Falha ao excluir proposta', 'error');
    }
  };

  // ---- Duplicar proposta (cópia: novo número, status 'Criada', itens não-convertidos) ----
  // Garante itens carregados (a lista GET já traz, mas faz fallback individual).
  const carregarPropostaCompleta = async (p) => {
    if (p.itens && p.itens.length > 0) return p;
    try {
      const resp = await fetch(`/api/propostas/item.php?id=${p._apiId || p.id}`, { credentials: 'include' });
      if (resp.ok) { const j = await resp.json(); const full = j.data || j; return { ...p, ...full, itens: full.itens || [] }; }
    } catch { /* usa o que tem */ }
    return { ...p, itens: p.itens || [] };
  };

  const montarPayloadCopia = (p) => ({
    cliente_id: p.cliente_id || null,
    cliente_nome: p.cliente_nome || p.cliente_razao || null,
    cliente_cnpj: p.cliente_cnpj,
    cliente_email: p.cliente_email || null,
    categoria: p.categoria,
    prestador: p.prestador || null,
    condicoes_comerciais: p.condicoes_comerciais || null,
    condicoes_faturamento: p.condicoes_faturamento || null,
    prazos: p.prazos || null,
    vencimento: p.vencimento || null,
    observacoes: p.observacoes || null,
    itens: (p.itens || []).map((it, idx) => ({
      ordem: idx,
      descricao: it.descricao || '',
      quantidade: num(it.quantidade ?? 1),
      valor_unitario: num(it.valor_unitario ?? 0),
      valor_total: num(it.valor_total ?? (num(it.quantidade ?? 1) * num(it.valor_unitario ?? 0))),
      efetivo: it.efetivo ? parseInt(it.efetivo, 10) : null,
      escala: it.escala || null,
      servico_origem_id: it.servico_origem_id || null,
      template: it.template || null,
      categoria_servico: it.categoria_servico || null,
      franquia_horas: num(it.franquia_horas ?? 0),
      franquia_km: num(it.franquia_km ?? 0),
      hora_extra_fatura: num(it.hora_extra_fatura ?? 0),
      km_extra_fatura: num(it.km_extra_fatura ?? 0),
      adicional_domingos_fatura: num(it.adicional_domingos_fatura ?? 0),
      aliquota: num(it.aliquota ?? 0),
      // servico_id propositalmente omitido: a cópia nasce não-convertida
    })),
  });

  const postCopiaProposta = async (p) => {
    const full = await carregarPropostaCompleta(p);
    const resp = await fetch('/api/propostas/index.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(montarPayloadCopia(full)),
    });
    const json = await resp.json();
    if (!resp.ok || !json.ok) throw new Error(json?.error || `Erro HTTP ${resp.status}`);
    return json.data;
  };

  const duplicarProposta = async (p) => {
    if (!window.confirm(`Duplicar proposta ${p.numero_formatado}? Será criada uma nova proposta (status "Criada") com os mesmos dados e itens.`)) return;
    try {
      const nova = await postCopiaProposta(p);
      showToast(`Proposta duplicada → ${nova.numero_formatado}`, 'success');
      await carregarPropostas({ status: filtroStatusProposta, categoria: filtroCategoriaProposta, q: buscaProposta });
    } catch (e) {
      showToast(e.message || 'Falha ao duplicar proposta', 'error');
    }
  };

  // ---- Ações em massa ----
  const duplicarPropostasMassa = async (ids) => {
    if (ids.length === 0) return;
    if (!window.confirm(`Duplicar ${ids.length} proposta(s) selecionada(s)? Cada uma gera uma nova proposta "Criada".`)) return;
    let ok = 0, fail = 0;
    for (const id of ids) {
      const p = propostas.find(x => x.id === id);
      if (!p) { fail++; continue; }
      try { await postCopiaProposta(p); ok++; } catch { fail++; }
    }
    setSelPropostas(new Set());
    showToast(`${ok} duplicada(s)${fail ? ` · ${fail} falha(s)` : ''}`, fail ? 'error' : 'success');
    await carregarPropostas({ status: filtroStatusProposta, categoria: filtroCategoriaProposta, q: buscaProposta });
  };

  const arquivarPropostasMassa = async (ids) => {
    if (ids.length === 0) return;
    if (!window.confirm(`Arquivar ${ids.length} proposta(s)? Serão marcadas como Rejeitada e arquivadas.`)) return;
    let ok = 0, fail = 0;
    for (const id of ids) {
      try {
        const resp = await fetch(`/api/propostas/item.php?id=${id}`, { method: 'DELETE', credentials: 'include' });
        const j = await resp.json();
        if (!resp.ok || !j.ok) throw new Error(j?.error);
        ok++;
      } catch { fail++; }
    }
    setSelPropostas(new Set());
    showToast(`${ok} arquivada(s)${fail ? ` · ${fail} falha(s)` : ''}`, fail ? 'error' : 'success');
    await carregarPropostas({ status: filtroStatusProposta, categoria: filtroCategoriaProposta, q: buscaProposta });
  };

  const rejeitarPropostasMassa = async (ids) => {
    const alvos = ids.filter(id => { const p = propostas.find(x => x.id === id); return p && !['Aceita', 'Rejeitada'].includes(p.status); });
    if (alvos.length === 0) { showToast('Nenhuma proposta elegível (Aceitas/Rejeitadas são ignoradas)', 'error'); return; }
    const motivo = window.prompt(`Rejeitar ${alvos.length} proposta(s). Motivo (opcional, aplicado a todas):`, '');
    if (motivo === null) return;
    let ok = 0, fail = 0;
    for (const id of alvos) {
      try {
        const resp = await fetch(`/api/propostas/item.php?id=${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: 'Rejeitada', motivo_rejeicao: motivo }),
        });
        const j = await resp.json();
        if (!resp.ok || !j.ok) throw new Error(j?.error);
        ok++;
      } catch { fail++; }
    }
    setSelPropostas(new Set());
    showToast(`${ok} rejeitada(s)${fail ? ` · ${fail} falha(s)` : ''}`, fail ? 'error' : 'success');
    await carregarPropostas({ status: filtroStatusProposta, categoria: filtroCategoriaProposta, q: buscaProposta });
  };

  const criarServicosDeProposta = async ({ propostaId, itens }) => {
    try {
      const resp = await fetch('/api/propostas/criar_servicos.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ proposta_id: propostaId, itens }),
      });
      const json = await resp.json();
      if (!resp.ok || !json.ok) throw new Error(json?.error || `Erro HTTP ${resp.status}`);
      const r = json.data;
      const linhas = [
        `Criados: ${r.criados.length}`,
        r.pulados.length ? `Pulados (já convertidos): ${r.pulados.length}` : null,
        r.erros.length ? `Erros: ${r.erros.length} — ver console` : null,
      ].filter(Boolean);
      if (r.erros.length) console.warn('[criar_servicos]', r.erros);
      alert(`Conversão da proposta:\n\n${linhas.join('\n')}`);
      try { await window.storage?.refresh?.('servicos'); } catch (_) {}
      await carregarPropostas({ status: filtroStatusProposta, categoria: filtroCategoriaProposta, q: buscaProposta });
      setModal(null);
    } catch (e) {
      showToast(e.message || 'Falha ao criar serviços', 'error');
    }
  };

  const salvarDespChefia = async (d) => {
    if (d.__parcelado) return criarParceladoAPI('despesas_chefia', d, d.id || null);
    const dados = { ...d, id: d.id || `DC2${Date.now()}`, valor: num(d.valor), criadoEm: d.criadoEm || new Date().toISOString() };
    setDespChefia(prev => { const i = prev.findIndex(x => x.id === dados.id); if (i >= 0) { const cp = [...prev]; cp[i] = dados; return cp; } return [dados, ...prev]; });
    showToast(d.id ? 'Despesa de chefia atualizada' : 'Despesa de chefia adicionada'); setModal(null);
  };
  const excluirDespChefia = (id) => { setDespChefia(prev => prev.filter(d => d.id !== id)); showToast('Removida'); setModal(null); };
  const importarDespesasChefia = ({ itens }) => {
    if (!itens?.length) { showToast('Nenhuma despesa válida encontrada', 'error'); setModal(null); return; }
    const agora = new Date().toISOString();
    const novas = itens.map((d, i) => ({ id: `DC2${Date.now()}_${i}`, competencia: d.competencia, descricao: d.descricao, tipo: d.tipo || 'AVULSA', valor: num(d.valor), origem: d.origem, status: d.status || 'pendente', dataLancamento: d.dataLancamento || '', observacoes: d.observacoes || '', criadoEm: agora }));
    setDespChefia(prev => [...novas, ...prev]);
    showToast(`${novas.length} despesa(s) da chefia importada(s)`, 'success');
    setModal(null);
  };
  const importarDespesas = (rows) => {
    const novas = rows.map((d, i) => ({ id: `D${Date.now()}_${i}`, competencia: d.competencia, descricao: d.descricao || '', tipo: d.tipo || 'AVULSA', valor: num(d.valor), centroCusto: d.centroCusto || '', origem: d.origem || '', status: d.status || 'pendente', observacoes: d.observacoes || '', criadoEm: new Date().toISOString() }));
    setDespesas(prev => [...novas, ...prev]); showToast(`${novas.length} despesas importadas`); setModal(null);
  };

  // v63: import dedicado de despesas via XLSX/texto (modelo padronizado)
  const importarDespesasNovo = ({ itens }) => {
    if (!itens || itens.length === 0) { showToast('Nenhuma despesa válida encontrada', 'error'); setModal(null); return; }
    const agora = new Date().toISOString();
    const novas = itens.map((d, i) => ({
      id: `D${Date.now()}_${i}_${Math.random().toString(36).slice(2, 5)}`,
      competencia: d.competencia,
      descricao: d.descricao,
      tipo: d.tipo || 'AVULSA',
      valor: num(d.valor),
      centroCusto: d.centroCusto || '',
      origem: d.origem || '',
      dataLancamento: d.dataLancamento || '',
      status: d.status || 'pendente',
      observacoes: d.observacoes || '',
      criadoEm: agora,
    }));
    setDespesas(prev => [...novas, ...prev]);
    showToast(`${novas.length} despesa(s) importada(s)`, 'success');
    setModal(null);
  };

  const salvarDesconto = async (d) => {
    if (d.__parcelado) return criarParceladoAPI('descontos', d, d.id || null);
    const dados = { ...d, id: d.id || `DC${Date.now()}`, valor: num(d.valor), criadoEm: d.criadoEm || new Date().toISOString() };
    setDescontos(prev => { const i = prev.findIndex(x => x.id === dados.id); if (i >= 0) { const cp = [...prev]; cp[i] = dados; return cp; } return [dados, ...prev]; });
    showToast(d.id ? 'Vale atualizado' : 'Vale adicionado'); setModal(null);
  };
  const excluirDesconto = (id) => { setDescontos(prev => prev.filter(d => d.id !== id)); showToast('Removido'); setModal(null); };
  const importarDescontos = (rows) => {
    const novos = rows.map((d, i) => ({ id: `DC${Date.now()}_${i}`, competencia: d.competencia, alvoNome: d.alvoNome || '', tipoVale: d.tipoVale || 'VALE', valor: num(d.valor), centroCusto: d.centroCusto || '', formaPagamento: d.formaPagamento || '', observacoes: d.observacoes || '', criadoEm: new Date().toISOString() }));
    setDescontos(prev => [...novos, ...prev]); showToast(`${novos.length} vales importados`); setModal(null);
  };

  const proximoNumeroFatura = () => {
    const max = fechamentos.reduce((m, f) => Math.max(m, num(f.numero) || 0), 0);
    return max + 1;
  };
  const fmtNumeroFatura = (n) => `F-${String(n).padStart(4, '0')}`;

  const fecharFatura = (fatura) => {
    const numero = proximoNumeroFatura();
    // Recalcula totais a partir dos lançamentos (garante consistência mesmo se fatura.totalFatura estiver com drift de FP)
    const totalFatura = sumMoney(fatura.lancs, l => l.totalFatura);
    const totalPago = sumMoney(fatura.lancs, l => l.totalPago);
    const totalImposto = sumMoney(fatura.lancs, l => l.imposto);
    const lucroLiq = roundMoney(totalFatura - totalPago - totalImposto);
    const f = { id: `F${Date.now()}`, numero, numeroFmt: fmtNumeroFatura(numero), cliente: fatura.cliente, templates: fatura.templates || [fatura.template], template: fatura.template, periodo: fatura.periodo, dataInicio: fatura.dataInicio || null, dataFim: fatura.dataFim || null, dataFechamento: new Date().toISOString(), totalFatura, totalPago, totalImposto, lucro: lucroLiq, qtdLancamentos: fatura.qtd, lancamentos: fatura.lancs.map(l => l.id), statusFatura: 'Enviada', historicoStatus: [{ status: 'Enviada', em: new Date().toISOString() }] };
    setFechamentos(prev => [f, ...prev.filter(x => !(x.cliente === f.cliente && x.periodo === f.periodo && !x.dataInicio && !x.custom))]);
    setLancamentos(prev => prev.map(l => fatura.lancs.find(x => x.id === l.id) ? { ...l, status: 'fechado' } : l));
    showToast(`Fatura ${fmtNumeroFatura(numero)} fechada`); setModal(null);
  };

  const gerarFaturaCustom = ({ cliente, dataInicio, dataFim, competencia }) => {
    const lancsRange = lancamentos.filter(l => l.cliente === cliente && l.data >= dataInicio && l.data <= dataFim);
    if (!lancsRange.length) { showToast('Nenhum lançamento no intervalo', 'error'); return; }
    const templates = [...new Set(lancsRange.map(l => l.template))];
    const totalFatura = sumMoney(lancsRange, l => l.totalFatura);
    const totalPago = sumMoney(lancsRange, l => l.totalPago);
    const totalImposto = sumMoney(lancsRange, l => l.imposto);
    const numero = proximoNumeroFatura();
    const f = { id: `F${Date.now()}`, numero, numeroFmt: fmtNumeroFatura(numero), cliente, templates, template: templates[0], periodo: competencia, dataInicio, dataFim, dataFechamento: new Date().toISOString(), totalFatura, totalPago, totalImposto, lucro: roundMoney(totalFatura - totalPago - totalImposto), qtdLancamentos: lancsRange.length, lancamentos: lancsRange.map(l => l.id), custom: true, statusFatura: 'Enviada', historicoStatus: [{ status: 'Enviada', em: new Date().toISOString() }] };
    setFechamentos(prev => [f, ...prev]);
    setLancamentos(prev => prev.map(l => lancsRange.find(x => x.id === l.id) ? { ...l, status: 'fechado' } : l));
    showToast(`Fatura ${fmtNumeroFatura(numero)} gerada com ${lancsRange.length} lançamentos`); setModal(null);
  };

  const gerarFaturaDeXML = ({ nfNumero, nfData, cliente, competencia, totalFatura, descricao, template }) => {
    const numero = proximoNumeroFatura();
    const f = {
      id: `F${Date.now()}`, numero, numeroFmt: fmtNumeroFatura(numero),
      cliente, templates: [template || ''], template: template || '',
      periodo: competencia, dataInicio: null, dataFim: null,
      dataFechamento: nfData || new Date().toISOString().slice(0, 10),
      totalFatura: num(totalFatura), totalPago: 0, totalImposto: 0,
      lucro: num(totalFatura), qtdLancamentos: 0, lancamentos: [],
      custom: true, nfNumero, nfData,
      statusFatura: 'NF-emitida',
      historicoStatus: [{ status: 'NF-emitida', em: new Date().toISOString() }],
    };
    setFechamentos(prev => [f, ...prev]);
    showToast(`Fatura ${fmtNumeroFatura(numero)} — NF ${nfNumero} importada`);
    setModal(null);
  };

  const gerarFaturaDeProposta = ({ cliente, competencia, totalFatura, origemProposta }) => {
    if (!cliente?.trim()) { showToast('Defina o cliente antes de gerar a fatura', 'error'); return; }
    const numero = proximoNumeroFatura();
    const f = {
      id: `F${Date.now()}`, numero, numeroFmt: fmtNumeroFatura(numero),
      cliente: cliente.trim(), templates: [''], template: '',
      periodo: competencia, dataInicio: null, dataFim: null,
      dataFechamento: new Date().toISOString().slice(0, 10),
      totalFatura: num(totalFatura), totalPago: 0, totalImposto: 0,
      lucro: num(totalFatura), qtdLancamentos: 0, lancamentos: [],
      custom: true, statusFatura: 'Enviada',
      historicoStatus: [{ status: 'Enviada', em: new Date().toISOString() }],
      observacoes: origemProposta,
    };
    setFechamentos(prev => [f, ...prev]);
    showToast(`Fatura ${fmtNumeroFatura(numero)} gerada a partir de ${origemProposta}`);
    setModal(null);
    setAba('fechamentos');
  };

  const atualizarStatusFatura = (fechId, novoStatus, dataVenc, nfNumero, nfData, empresaFaturante) => {
    if (!STATUS_FATURA.includes(novoStatus)) return;
    setFechamentos(prev => prev.map(f => {
      if (f.id !== fechId) return f;
      const hist = [...(f.historicoStatus || []), { status: novoStatus, em: new Date().toISOString() }];
      const upd = { ...f, statusFatura: novoStatus, historicoStatus: hist };
      if (dataVenc !== undefined) upd.dataVencimento = dataVenc;
      if (novoStatus === 'Paga') upd.dataPagamento = new Date().toISOString().slice(0, 10);
      if (nfNumero !== undefined) { upd.nfNumero = nfNumero; upd.nfData = nfData || new Date().toISOString().slice(0, 10); }
      if (empresaFaturante !== undefined) upd.empresaFaturante = empresaFaturante;
      return upd;
    }));
    showToast(`Status alterado para ${novoStatus}`);
  };

  const atualizarPeriodoFatura = (fechId, novoPeriodo) => {
    setFechamentos(prev => prev.map(f => f.id === fechId ? { ...f, periodo: novoPeriodo } : f));
    showToast('Competência atualizada');
    setModal(null);
  };

  const atualizarClienteFatura = (fechId, novoCliente) => {
    setFechamentos(prev => prev.map(f => f.id === fechId ? { ...f, cliente: novoCliente } : f));
    showToast('Cliente atualizado');
    setModal(null);
  };

  const reabrirFatura = (fech) => {
    setFechamentos(prev => prev.filter(f => f.id !== fech.id));
    setLancamentos(prev => prev.map(l => fech.lancamentos.includes(l.id) ? { ...l, status: 'pendente' } : l));
    showToast('Reaberta'); setModal(null);
  };

  if (carregando) return <div className={`min-h-screen bg-slate-50 flex items-center justify-center ${darkMode ? 'dark' : ''}`}><div className="text-slate-500 flex items-center gap-3"><RefreshCw className="w-5 h-5 animate-spin" />Carregando...</div></div>;

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between flex-wrap gap-1.5 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-white text-xs sm:text-sm font-bold tracking-tight">MR</div>
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg leading-tight">MRSys - Sistema de Gestão</h1>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">{lancamentos.length} lanç · {servicos.length} serv · {funcionarios.length} func · {despesas.length} desp</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs flex-shrink-0">
            <span className="text-slate-600 font-mono text-[9px] sm:text-[10px] select-none">{APP_VERSION}</span>
            {erroSalvar ? (
              <button onClick={() => { setErroSalvar(null); Object.entries(pendentesRef.current).forEach(([k, v]) => salvarChave(k, v)); }} className="flex items-center gap-1 text-red-600 hover:text-red-700 bg-red-50 border border-red-200 rounded px-1.5 sm:px-2 py-1" title={erroSalvar.mensagem}><AlertCircle className="w-3 sm:w-3.5 h-3 sm:h-3.5" /><span className="hidden sm:inline">{erroSalvar.tipo === 'quota' ? `"${erroSalvar.key}" muito grande` : 'Erro ao salvar'} — clicar p/ tentar novamente</span><span className="sm:hidden">Erro</span></button>
            ) : salvando ? (
              <span className="flex items-center gap-1 text-amber-600"><Save className="w-3 sm:w-3.5 h-3 sm:h-3.5 animate-pulse" /><span className="hidden sm:inline">Salvando...</span></span>
            ) : refreshing ? (
              <span className="flex items-center gap-1 text-blue-600"><RefreshCw className="w-3 sm:w-3.5 h-3 sm:h-3.5 animate-spin" /><span className="hidden sm:inline">Sincronizando...</span></span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" /><span className="hidden sm:inline">Salvo</span></span>
            )}
            <button onClick={() => setDarkMode(v => !v)} title={darkMode ? 'Modo claro' : 'Modo escuro'} className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-900 transition">
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            {onVoltarHub && (
              <button onClick={onVoltarHub} title="Voltar ao Hub de Sistemas" className="flex items-center gap-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-1.5 sm:px-2 py-1 transition"><Grid3x3 className="w-3 sm:w-3.5 h-3 sm:h-3.5" /><span className="hidden sm:inline">Hub</span></button>
            )}
            {onLogout && (
              <button onClick={onLogout} title="Sair" className="flex items-center gap-1 text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded px-1.5 sm:px-2 py-1 transition"><LogOut className="w-3 sm:w-3.5 h-3 sm:h-3.5" /><span className="hidden sm:inline">Sair</span></button>
            )}
          </div>
        </div>
        {/* Mobile: tabs scrolláveis (sidebar fica oculta em < md) */}
        <div className="md:hidden max-w-7xl mx-auto px-1 flex gap-0 overflow-x-auto overscroll-x-contain scrollbar-none">
          {[
            { id: 'dashboard', l: 'Dashboard', i: BarChart3 },
            { id: 'resumo', l: 'Resumo', i: ClipboardList },
            { id: 'lancamentos', l: 'Lançamentos', i: FileText },
            { id: 'despesas', l: 'Despesas', i: TrendingDown },
            { id: 'despChefia', l: 'Desp. Chefia', i: Briefcase },
            { id: 'descontos', l: 'Vales', i: MinusCircle },
            { id: 'diarias', l: 'Lanç. Avulsos', i: Calendar },
            { id: 'clientes', l: 'Clientes', i: Building2 },
            { id: 'funcionarios', l: 'Funcionários', i: Users },
            { id: 'folha', l: 'Folha', i: Wallet },
            { id: 'catFolha', l: 'Cat. Folha', i: Tag },
            { id: 'catalogo', l: 'Catálogo', i: Package },
            { id: 'propostas', l: 'Propostas', i: FileSignature },
            { id: 'fechamentos', l: 'Faturas', i: Archive },
          ].map(t => { const I = t.i; return (
            <button key={t.id} onClick={() => setAba(t.id)} className={`px-2.5 py-2.5 text-[11px] font-medium border-b-2 transition flex items-center gap-1.5 whitespace-nowrap min-h-[40px] ${aba === t.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <I className="w-3.5 h-3.5 flex-shrink-0" /><span>{t.l}</span>
            </button>
          ); })}
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex print:block print:max-w-none">
        {/* Sidebar lateral (md+) */}
        <aside className="hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 relative print:hidden" style={{ height: 'calc(100vh - 57px)', width: sidebarExpandida ? '164px' : '52px', flexShrink: 0, overflowY: 'auto', transition: 'width 0.2s ease-in-out', position: 'sticky', top: '57px', alignSelf: 'flex-start' }}>
          {/* Brand section */}
          <div className={`flex items-center border-b border-slate-200 dark:border-white/10 flex-shrink-0 overflow-hidden ${sidebarExpandida ? 'px-3 gap-2.5 h-12' : 'justify-center h-12'}`}>
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">MR</div>
            {sidebarExpandida && <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">MRSys</span>}
          </div>
          {/* Nav items */}
          <nav className="flex-1 py-2 px-1.5 flex flex-col gap-0.5">
            {[
              { id: 'dashboard', l: 'Dashboard', i: BarChart3 },
              { id: 'resumo', l: 'Resumo', i: ClipboardList },
              { id: 'lancamentos', l: 'Lançamentos', i: FileText },
              { id: 'propostas', l: 'Propostas', i: FileSignature },
              { id: 'fechamentos', l: 'Faturas', i: Archive },
              { id: 'despesas', l: 'Despesas', i: TrendingDown },
              { id: 'despChefia', l: 'Desp. Chefia', i: Briefcase },
              { id: 'descontos', l: 'Vales', i: MinusCircle },
              { id: 'diarias', l: 'Lanç. Avulsos', i: Calendar },
              { id: 'clientes', l: 'Clientes', i: Building2 },
              { id: 'funcionarios', l: 'Funcionários', i: Users },
              { id: 'folha', l: 'Folha', i: Wallet },
              { id: 'catFolha', l: 'Cat. Folha', i: Tag },
              { id: 'catalogo', l: 'Catálogo', i: Package },
            ].map(t => { const I = t.i; const ativo = aba === t.id; return (
              <button
                key={t.id}
                onClick={() => setAba(t.id)}
                title={!sidebarExpandida ? t.l : undefined}
                className={`w-full rounded-lg flex flex-row items-center gap-2.5 px-2.5 py-2 transition text-left ${ativo ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'}`}
              >
                <I className="w-4 h-4 flex-shrink-0" />
                {sidebarExpandida && <span className="text-xs font-medium leading-tight whitespace-nowrap overflow-hidden">{t.l}</span>}
              </button>
            ); })}
          </nav>
          {/* Toggle flutuante */}
          <button
            onClick={() => setSidebarExpandida(v => !v)}
            title={sidebarExpandida ? 'Recolher' : 'Expandir'}
            className="absolute -right-3 top-14 w-6 h-6 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition shadow z-10"
          >
            <ChevronLeft className={`w-3 h-3 transition-transform duration-200 ${!sidebarExpandida ? 'rotate-180' : ''}`} />
          </button>
        </aside>

        <main className="flex-1 min-w-0 px-3 sm:px-5 py-3 sm:py-6 print:p-0">

        {aba === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 items-center">
              <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm">
                <option value="">Todos os clientes</option>{clientesUnicos.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="month" value={filtroMesDashboard} onChange={e => setFiltroMesDashboard(e.target.value)} title="Filtrar por competência" className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm" />
              {(filtroCliente || filtroMesDashboard) && <button onClick={() => { setFiltroCliente(''); setFiltroMesDashboard(''); }} className="text-xs text-slate-400 hover:text-slate-900 px-2 py-1">Limpar</button>}
              <span className="text-[11px] text-slate-500 ml-auto"><Receipt className="w-3 h-3 inline mr-1" />Baseado em <b className="text-indigo-600">{totais.qtd}</b> fatura(s){filtroCliente ? ` · ${filtroCliente}` : ''}{filtroMesDashboard ? ` · ${fmtMesCurto(filtroMesDashboard)}` : ''}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
              <Card title="Faturado" value={fmt(totais.fat)} sub="Faturas geradas" icon={TrendingUp} cor="from-emerald-500/20 to-emerald-500/5" iconCor="text-emerald-600" />
              <Card title="Pago" value={fmt(totais.pag)} sub="Folha das faturas" icon={DollarSign} cor="from-orange-500/20 to-orange-500/5" iconCor="text-orange-400" />
              <Card title="Imposto" value={fmt(totais.imp)} sub={totais.fat > 0 ? `${(totais.imp / totais.fat * 100).toFixed(2)}% efetiva` : '—'} icon={Receipt} cor="from-amber-500/20 to-amber-500/5" iconCor="text-amber-600" />
              <Card title="Lucro Bruto" value={fmt(totais.luc)} sub={`${totais.margem.toFixed(1)}% margem`} icon={TrendingUp} cor="from-indigo-500/20 to-indigo-500/5" iconCor="text-indigo-400" />
              <Card title="Lucro Líquido" value={fmt(totais.luc - totaisDespesas - totaisDescontos)} sub={`Desp ${fmt(totaisDespesas)} · Desc ${fmt(totaisDescontos)}`} icon={Wallet} cor="from-purple-500/20 to-purple-500/5" iconCor="text-purple-600" />
            </div>
            {fechamentos.length === 0 && lancamentos.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <b>Você tem {lancamentos.length} lançamento(s) mas nenhuma fatura gerada ainda.</b><br />
                  <span className="text-xs">Faturamento, folha e gráfico só consideram faturas geradas. Vá na aba <b>Faturas</b> e clique em <b>Fechar</b> ou <b>Gerar por intervalo</b>.</span>
                </div>
              </div>
            )}
            {lancamentos.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 mb-4">Nenhum lançamento ainda.</p>
                <button onClick={() => { setAba('lancamentos'); setModal({ tipo: 'lancamento', dados: null }); }} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2"><Plus className="w-4 h-4" />Adicionar lançamento</button>
              </div>
            ) : (
              <>
                <Painel titulo="Faturamento por Cliente">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={dadosPorCliente}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                      <XAxis dataKey="cliente" stroke="#64748b" fontSize={10} angle={-15} textAnchor="end" height={70} />
                      <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} formatter={v => fmt(v)} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="faturado" fill="#6366f1" name="Faturado" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pago" fill="#f97316" name="Pago" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="lucro" fill="#10b981" name="Lucro" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Painel>
                <Painel titulo="Resumo por Cliente">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-slate-400 border-b border-slate-200"><tr><th className="text-left py-2 px-3">Cliente</th><th className="text-center px-3">Lanç.</th><th className="text-right px-3">Faturado</th><th className="text-right px-3">Pago</th><th className="text-right px-3">Imposto</th><th className="text-right px-3">Lucro</th><th className="text-right px-3">Margem</th></tr></thead>
                      <tbody>
                        {dadosPorCliente.map(c => <tr key={c.cliente} className="border-b border-slate-200/50">
                          <td className="py-2 px-3">{c.cliente}</td><td className="text-center px-3">{c.qtd}</td>
                          <td className="text-right px-3">{fmt(c.faturado)}</td><td className="text-right px-3 text-orange-400">{fmt(c.pago)}</td>
                          <td className="text-right px-3 text-amber-600">{fmt(c.imposto)}</td>
                          <td className="text-right px-3 text-emerald-600">{fmt(c.lucro)}</td><td className="text-right px-3">{c.faturado > 0 ? `${(c.lucro / c.faturado * 100).toFixed(1)}%` : '-'}</td>
                        </tr>)}
                      </tbody>
                    </table>
                  </div>
                </Painel>
              </>
            )}
          </div>
        )}

        {aba === 'lancamentos' && (() => {
          // Helpers de base (valor sem extras)
          const bFat = l => Math.max(0, num(l.totalFatura) - num(l.extraHorasFatura) - num(l.extraKmFatura) - num(l.adicDomFatura) - num(l.outros) - num(l.pedagioFatura) - num(l.batidaExtra));
          const bPago = l => Math.max(0, num(l.totalPago) - num(l.extraHorasPaga) - num(l.extraKmPago) - num(l.adicDomPago) - num(l.pedagioReembolso));
          // Subtotais dos filtrados (com round monetário p/ evitar drift de floating-point)
          const tot = {
            bFat:    sumMoney(lancFiltrados, bFat),
            hxFat:   sumMoney(lancFiltrados, l => l.extraHorasFatura),
            kmFat:   sumMoney(lancFiltrados, l => l.extraKmFatura),
            outFat:  sumMoney(lancFiltrados, l => num(l.adicDomFatura) + num(l.outros) + num(l.pedagioFatura) + num(l.batidaExtra)),
            fat:     sumMoney(lancFiltrados, l => l.totalFatura),
            bPago:   sumMoney(lancFiltrados, bPago),
            hxPago:  sumMoney(lancFiltrados, l => l.extraHorasPaga),
            kmPago:  sumMoney(lancFiltrados, l => l.extraKmPago),
            outPago: sumMoney(lancFiltrados, l => num(l.adicDomPago) + num(l.pedagioReembolso)),
            pag:     sumMoney(lancFiltrados, l => l.totalPago),
            luc:     sumMoney(lancFiltrados, l => l.lucro),
            // Quantidades operacionais (horas, km)
            qtdHrTrab:  sumQty(lancFiltrados, l => l.horasTrabalhadas),
            qtdHrExtra: sumQty(lancFiltrados, l => l.horasExtras),
            qtdKmTotal: sumQty(lancFiltrados, l => l.kmRodados),
            qtdKmExtra: sumQty(lancFiltrados, l => l.kmExtras),
          };
          // Verifica se algum lançamento tem extras (para exibir colunas)
          const temHxFat  = lancFiltrados.some(l => num(l.extraHorasFatura) > 0);
          const temKmFat  = lancFiltrados.some(l => num(l.extraKmFatura) > 0);
          const temOutFat = lancFiltrados.some(l => num(l.adicDomFatura) + num(l.outros) + num(l.pedagioFatura) + num(l.batidaExtra) > 0);
          const temHxPago = lancFiltrados.some(l => num(l.extraHorasPaga) > 0);
          const temKmPago = lancFiltrados.some(l => num(l.extraKmPago) > 0);
          const temOutPago= lancFiltrados.some(l => num(l.adicDomPago) + num(l.pedagioReembolso) > 0);
          // Seleção em massa
          const qtdSel = lancFiltrados.filter(l => selLancs.has(l.id)).length;
          const todosSelLancs = lancFiltrados.length > 0 && lancFiltrados.every(l => selLancs.has(l.id));
          const toggleSelLanc = (id) => setSelLancs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
          const toggleTodosLancs = () => setSelLancs(todosSelLancs ? new Set() : new Set(lancFiltrados.map(l => l.id)));
          // IDs editáveis entre os selecionados (exclui fechados)
          const selEditaveisIds = [...selLancs].filter(id => { const l = lancamentos.find(x => x.id === id); return l && l.status !== 'fechado'; });
          return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold">Lançamentos</h2>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
                <button onClick={() => { if (confirm('Recalcular todos os lançamentos pendentes? Útil para corrigir totais de imports antigos. Lançamentos em faturas fechadas não serão alterados.')) recalcularPendentes(); }} className="bg-amber-700 hover:bg-amber-600 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><RefreshCw className="w-4 h-4 flex-shrink-0" /><span>Recalcular pendentes</span></button>
                <button onClick={() => setModal({ tipo: 'gerenciarFeriados' })} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Calendar className="w-4 h-4 flex-shrink-0" /><span>Feriados</span></button>
                <button onClick={() => setModal({ tipo: 'importar', destino: 'lancamento' })} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Upload className="w-4 h-4 flex-shrink-0" /><span>Importar planilha</span></button>
                <button onClick={() => setModal({ tipo: 'lancamento', dados: null })} className="bg-indigo-600 hover:bg-indigo-500 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Plus className="w-4 h-4 flex-shrink-0" /><span>Novo lançamento</span></button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
              <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar OS, descrição, cliente, prestador..." className="w-full bg-white border border-slate-300 rounded-lg text-slate-900 pl-9 pr-3 py-2 text-sm" /></div>
              <select value={filtroMesLanc} onChange={e => setFiltroMesLanc(e.target.value)} className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm"><option value="">Todos os meses</option>{mesesLanc.map(m => <option key={m} value={m}>{fmtMes(m)}</option>)}</select>
              <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm"><option value="">Todos os clientes</option>{clientesUnicos.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm"><option value="">Todos status</option><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="fechado">Fechado</option></select>
            </div>
            <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
              <select value={filtroCategoriaLanc} onChange={e => setFiltroCategoriaLanc(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm"><option value="">Todas as categorias</option>{CATEGORIAS_SERVICO.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <select value={filtroPrestadorLanc} onChange={e => setFiltroPrestadorLanc(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm"><option value="">Todos os prestadores</option><option value="__sem__">⚠ Sem prestador</option>{[...funcionarios].sort((a, b) => a.nome.localeCompare(b.nome)).map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}</select>
              <input type="text" value={filtroOsLanc} onChange={e => setFiltroOsLanc(e.target.value)} placeholder="Nº OS" className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm w-full sm:w-32 font-mono" />
              <input type="date" value={filtroDataInicioLanc} onChange={e => setFiltroDataInicioLanc(e.target.value)} title="Data início" className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm" />
              <input type="date" value={filtroDataFimLanc} onChange={e => setFiltroDataFimLanc(e.target.value)} title="Data fim" className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm" />
              {(filtroCategoriaLanc || filtroPrestadorLanc || filtroOsLanc || filtroDataInicioLanc || filtroDataFimLanc) && (
                <button onClick={() => { setFiltroCategoriaLanc(''); setFiltroPrestadorLanc(''); setFiltroOsLanc(''); setFiltroDataInicioLanc(''); setFiltroDataFimLanc(''); }} className="text-xs text-slate-400 hover:text-slate-900 px-3 py-2 rounded bg-white hover:bg-slate-100 whitespace-nowrap">Limpar filtros</button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
              <select value={filtroCategoriaFolhaLanc} onChange={e => setFiltroCategoriaFolhaLanc(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm"><option value="">Todas categorias de folha</option><option value="__sem__">(sem categoria)</option>{categoriasFolha.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}</select>
              <input type="month" value={filtroCompetenciaLanc} onChange={e => setFiltroCompetenciaLanc(e.target.value)} title="Competência" className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm" />
              {(filtroCategoriaFolhaLanc || filtroCompetenciaLanc) && (
                <button onClick={() => { setFiltroCategoriaFolhaLanc(''); setFiltroCompetenciaLanc(''); }} className="text-xs text-slate-400 hover:text-slate-900 px-3 py-2 rounded bg-white hover:bg-slate-100 whitespace-nowrap">Limpar folha</button>
              )}
            </div>
            {(() => {
              const semPrestador = lancFiltrados.filter(l => nomesNoLancamento(l).length === 0).length;
              if (semPrestador === 0 || filtroPrestadorLanc === '__sem__') return null;
              return (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2 text-xs text-orange-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span><b>{semPrestador}</b> lançamento(s) sem prestador atribuído (agente1, agente2, agente ou motorista vazios). Estes lançamentos não geram folha para nenhum funcionário.</span>
                  <button onClick={() => setFiltroPrestadorLanc('__sem__')} className="ml-auto text-orange-600 hover:text-orange-700 underline whitespace-nowrap">Ver todos</button>
                </div>
              );
            })()}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2"><div className="text-slate-500 text-[10px] uppercase">Lançamentos</div><div className="font-bold text-slate-700">{lancFiltrados.length}</div></div>
              <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2"><div className="text-slate-500 text-[10px] uppercase">Hr trab.</div><div className="font-bold text-slate-700">{tot.qtdHrTrab.toFixed(2)}h</div></div>
              <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2"><div className="text-slate-500 text-[10px] uppercase">Hr extras</div><div className="font-bold text-emerald-300">{tot.qtdHrExtra.toFixed(2)}h</div></div>
              <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2"><div className="text-slate-500 text-[10px] uppercase">Km total</div><div className="font-bold text-slate-700">{tot.qtdKmTotal.toFixed(0)} km</div></div>
              <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2"><div className="text-slate-500 text-[10px] uppercase">Km extras</div><div className="font-bold text-emerald-300">{tot.qtdKmExtra.toFixed(0)} km</div></div>
              <div className="bg-orange-500/10 border border-orange-500/30 rounded px-3 py-2"><div className="text-slate-500 text-[10px] uppercase">Total Pago</div><div className="font-bold text-orange-400">{fmt(tot.pag)}</div></div>
            </div>
            {/* Barra de ações em massa */}
            {qtdSel > 0 && (
              <div className="flex flex-wrap items-center gap-2 bg-indigo-600/10 border border-indigo-500/30 rounded-lg px-3 py-2">
                <span className="text-indigo-600 font-semibold text-sm">{qtdSel} selecionado{qtdSel !== 1 ? 's' : ''}</span>
                {selEditaveisIds.length < qtdSel && <span className="text-xs text-slate-500">({qtdSel - selEditaveisIds.length} fechado{qtdSel - selEditaveisIds.length !== 1 ? 's' : ''} — somente leitura)</span>}
                <div className="flex-1" />
                <button
                  disabled={selEditaveisIds.length === 0}
                  onClick={() => setModal({ tipo: 'massaLancData', ids: selEditaveisIds })}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded text-xs flex items-center gap-1.5"
                ><Calendar className="w-3.5 h-3.5" />Mudar data</button>
                <button
                  disabled={selEditaveisIds.length === 0}
                  onClick={() => setModal({ tipo: 'massaLancStatus', ids: selEditaveisIds })}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded text-xs flex items-center gap-1.5"
                ><CheckCircle2 className="w-3.5 h-3.5" />Mudar status</button>
                <button
                  disabled={selEditaveisIds.length === 0}
                  onClick={() => setModal({ tipo: 'massaLancServico', ids: selEditaveisIds })}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded text-xs flex items-center gap-1.5"
                ><Package className="w-3.5 h-3.5" />Mudar serviço</button>
                <button
                  disabled={[...selLancs].length === 0}
                  onClick={() => setModal({ tipo: 'massaLancPrestador', ids: [...selLancs] })}
                  className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded text-xs flex items-center gap-1.5"
                ><User className="w-3.5 h-3.5" />Atribuir prestador</button>
                <button
                  disabled={[...selLancs].length === 0}
                  onClick={() => setModal({ tipo: 'massaLancCompetencia', ids: [...selLancs] })}
                  className="bg-blue-700 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded text-xs flex items-center gap-1.5"
                ><Calendar className="w-3.5 h-3.5" />Mudar competência</button>
                <button
                  disabled={[...selLancs].length === 0}
                  onClick={() => setModal({ tipo: 'massaLancCatFolha', ids: [...selLancs], categorias: categoriasFolha })}
                  className="bg-blue-700 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded text-xs flex items-center gap-1.5"
                ><ClipboardList className="w-3.5 h-3.5" />Mudar cat. folha</button>
                <button
                  disabled={selEditaveisIds.length === 0}
                  onClick={() => setModal({ tipo: 'massaLancFeriado', ids: selEditaveisIds })}
                  className="bg-amber-700/60 hover:bg-amber-600/80 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded text-xs flex items-center gap-1.5 text-amber-700"
                ><Calendar className="w-3.5 h-3.5" />Feriado</button>
                <button
                  disabled={selEditaveisIds.length === 0}
                  onClick={() => setModal({ tipo: 'massaLancExcluir', ids: selEditaveisIds })}
                  className="bg-red-700/60 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded text-xs flex items-center gap-1.5 text-red-700"
                ><Trash2 className="w-3.5 h-3.5" />Excluir</button>
                <button onClick={() => setSelLancs(new Set())} className="text-slate-400 hover:text-slate-900 p-1.5 rounded hover:bg-slate-100"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
            {lancFiltrados.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center"><p className="text-slate-400">Nenhum lançamento encontrado.</p></div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs bg-slate-50 border-b border-slate-200">
                      {/* Linha 1: grupos */}
                      <tr className="text-slate-500 text-[10px] uppercase font-semibold border-b border-slate-200/60">
                        <th rowSpan={2} className="px-3 py-2 w-8">
                          <input type="checkbox" checked={todosSelLancs} onChange={toggleTodosLancs} className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer" />
                        </th>
                        <th rowSpan={2} className="text-left py-2 px-2 text-slate-500 whitespace-nowrap text-[10px]">OS</th>
                        <th rowSpan={2} className="text-left py-2 px-2 text-slate-400">Data</th>
                        <th rowSpan={2} className="text-left px-3 text-slate-400">Serviço</th>
                        <th colSpan={(temHxFat ? 1 : 0) + (temKmFat ? 1 : 0) + (temOutFat ? 1 : 0) + 2} className="text-center px-3 py-1.5 text-emerald-500 border-l border-slate-200">— FATURADO —</th>
                        <th colSpan={(temHxPago ? 1 : 0) + (temKmPago ? 1 : 0) + (temOutPago ? 1 : 0) + 2} className="text-center px-3 py-1.5 text-orange-500 border-l border-slate-200">— PAGO —</th>
                        <th rowSpan={2} className="text-center px-3 text-slate-400">Status</th>
                        <th rowSpan={2} className="text-right px-3 text-slate-400">Ações</th>
                      </tr>
                      {/* Linha 2: sub-colunas */}
                      <tr className="text-slate-400">
                        <th className="text-right py-2 px-2 border-l border-slate-200">Base</th>
                        {temHxFat  && <th className="text-right px-2 whitespace-nowrap">H.Extra</th>}
                        {temKmFat  && <th className="text-right px-2 whitespace-nowrap">KM Extra</th>}
                        {temOutFat && <th className="text-right px-2 whitespace-nowrap">Outros</th>}
                        <th className="text-right px-2 font-bold text-emerald-600">Total</th>
                        <th className="text-right px-2 border-l border-slate-200">Base</th>
                        {temHxPago  && <th className="text-right px-2 whitespace-nowrap">H.Extra</th>}
                        {temKmPago  && <th className="text-right px-2 whitespace-nowrap">KM Extra</th>}
                        {temOutPago && <th className="text-right px-2 whitespace-nowrap">Outros</th>}
                        <th className="text-right px-2 font-bold text-orange-400">Total</th>
                      </tr>
                    </thead>
                    <tbody>{lancFiltrados.map(l => {
                      const hxF  = num(l.extraHorasFatura);
                      const kmF  = num(l.extraKmFatura);
                      const outF = num(l.adicDomFatura) + num(l.outros) + num(l.pedagioFatura) + num(l.batidaExtra);
                      const hxP  = num(l.extraHorasPaga);
                      const kmP  = num(l.extraKmPago);
                      const outP = num(l.adicDomPago) + num(l.pedagioReembolso);
                      const selecionado = selLancs.has(l.id);
                      return (
                      <tr key={l.id} className={`border-b border-slate-200/50 hover:bg-slate-50 text-xs ${selecionado ? 'bg-indigo-900/20' : ''}`}>
                        <td className="px-3 py-2 w-8">
                          <input type="checkbox" checked={selecionado} onChange={() => toggleSelLanc(l.id)} className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer" />
                        </td>
                        <td className="py-2 px-2 text-slate-500 text-[11px] font-mono whitespace-nowrap">{l.os || '—'}</td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          <div>{fmtData(l.data)}</div>
                          {l.isFeriado && <div className="text-[10px] text-amber-600 leading-tight truncate max-w-[90px]" title={l.nomeFeriado || 'Feriado'}>🎉 {l.nomeFeriado || 'Feriado'}</div>}
                        </td>
                        <td className="px-3"><div className="font-medium text-sm">{l.descricao}</div><div className="text-slate-500">#{l.codServico} · {l.cliente}</div>{(() => { const ag = [l.extras?.agente1, l.extras?.agente2, l.extras?.agente, l.extras?.motorista].filter(Boolean); return ag.length > 0 ? <div className="text-[11px] text-cyan-400 mt-0.5 truncate max-w-[260px]" title={ag.join(' · ')}>👤 {ag.join(' · ')}</div> : null; })()}{(l.categoriaFolha || l.competencia) && (<div className="text-[10px] mt-0.5 flex flex-wrap gap-1">{l.categoriaFolha && <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-600 font-medium">📋 {l.categoriaFolha}</span>}{l.competencia && l.competencia !== (l.data || '').slice(0, 7) && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium" title={`Data ${fmtData(l.data)} · Competência ${l.competencia}`}>📅 {fmtMesCurto(l.competencia)}</span>}</div>)}</td>
                        {/* FATURADO */}
                        <td className="text-right px-2 text-slate-600 border-l border-slate-200">{fmt(bFat(l))}</td>
                        {temHxFat  && <td className={`text-right px-2 ${hxF > 0 ? 'text-emerald-300' : 'text-slate-600'}`}>{hxF > 0 ? <><div className="text-[10px] opacity-75 leading-tight">{fmtHorasHHMM(num(l.horasExtras))}</div><div>{fmt(hxF)}</div></> : '—'}</td>}
                        {temKmFat  && <td className={`text-right px-2 ${kmF > 0 ? 'text-emerald-300' : 'text-slate-600'}`}>{kmF > 0 ? <><div className="text-[10px] opacity-75 leading-tight">{num(l.kmExtras)} km</div><div>{fmt(kmF)}</div></> : '—'}</td>}
                        {temOutFat && <td className={`text-right px-2 ${outF > 0 ? 'text-emerald-300' : 'text-slate-600'}`}>{outF > 0 ? fmt(outF) : '—'}</td>}
                        <td className="text-right px-2 font-bold text-emerald-600">{fmt(l.totalFatura)}</td>
                        {/* PAGO */}
                        <td className="text-right px-2 text-slate-600 border-l border-slate-200">{fmt(bPago(l))}</td>
                        {temHxPago  && <td className={`text-right px-2 ${hxP > 0 ? 'text-orange-600' : 'text-slate-600'}`}>{hxP > 0 ? fmt(hxP) : '—'}</td>}
                        {temKmPago  && <td className={`text-right px-2 ${kmP > 0 ? 'text-orange-600' : 'text-slate-600'}`}>{kmP > 0 ? fmt(kmP) : '—'}</td>}
                        {temOutPago && <td className={`text-right px-2 ${outP > 0 ? 'text-orange-600' : 'text-slate-600'}`}>{outP > 0 ? fmt(outP) : '—'}</td>}
                        <td className="text-right px-2 font-bold text-orange-400">{fmt(l.totalPago)}</td>
                        {/* STATUS + AÇÕES */}
                        <td className="text-center px-3"><Badge status={l.status} /></td>
                        <td className="text-right px-3"><div className="flex justify-end gap-1">
                          <button onClick={() => setModal({ tipo: 'lancamento', dados: l })} disabled={l.status === 'fechado'} title={l.status === 'fechado' ? 'Lançamento fechado em fatura' : 'Editar lançamento'} className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed">{l.status === 'fechado' ? <Lock className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}</button>
                          {l.status === 'fechado' && <button onClick={() => setModal({ tipo: 'editarPagoLanc', dados: l })} title="Editar valores pagos (não afeta fatura)" className="p-1.5 hover:bg-orange-700/40 text-orange-400 rounded"><Wallet className="w-4 h-4" /></button>}
                          <button onClick={() => setModal({ tipo: 'confirmExcluirLanc', dados: l })} disabled={l.status === 'fechado'} className="p-1.5 hover:bg-red-900/40 text-red-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"><Trash2 className="w-4 h-4" /></button>
                        </div></td>
                      </tr>
                      );
                    })}</tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs">
                      <tr>
                        <td className="py-2.5 px-3"></td>
                        <td colSpan={3} className="py-2.5 px-2 text-slate-400">TOTAL ({lancFiltrados.length})</td>
                        <td className="text-right px-2 border-l border-slate-200 text-slate-700">{fmt(tot.bFat)}</td>
                        {temHxFat  && <td className="text-right px-2 text-emerald-300">{fmt(tot.hxFat)}</td>}
                        {temKmFat  && <td className="text-right px-2 text-emerald-300">{fmt(tot.kmFat)}</td>}
                        {temOutFat && <td className="text-right px-2 text-emerald-300">{fmt(tot.outFat)}</td>}
                        <td className="text-right px-2 text-emerald-600 text-sm">{fmt(tot.fat)}</td>
                        <td className="text-right px-2 border-l border-slate-200 text-slate-700">{fmt(tot.bPago)}</td>
                        {temHxPago  && <td className="text-right px-2 text-orange-600">{fmt(tot.hxPago)}</td>}
                        {temKmPago  && <td className="text-right px-2 text-orange-600">{fmt(tot.kmPago)}</td>}
                        {temOutPago && <td className="text-right px-2 text-orange-600">{fmt(tot.outPago)}</td>}
                        <td className="text-right px-2 text-orange-400 text-sm">{fmt(tot.pag)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
          );
        })()}

        {aba === 'despesas' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="min-w-0"><h2 className="text-lg sm:text-xl font-bold">Despesas</h2><p className="text-[11px] sm:text-xs text-slate-400">Custos da empresa por competência. Tipos: FIXA, PARCELA, AVULSA.</p></div>
              <div className="flex gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
                <button onClick={() => exportarDespesasXLSX(despesasFiltradas)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Download className="w-4 h-4 flex-shrink-0" /><span>Exportar</span></button>
                <button onClick={() => setModal({ tipo: 'importarDespesasXLSX' })} className="bg-blue-600 hover:bg-blue-500 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Upload className="w-4 h-4 flex-shrink-0" /><span>Importar (XLSX/Texto)</span></button>
                <button onClick={() => migrarParcelasExistentes('despesas')} title="One-shot: detecta parcelas existentes e cria as parcelas faltantes nos meses futuros. Pode ser apagado depois de rodar." className="bg-purple-700 hover:bg-purple-600 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]" type="button"><span>Migrar parcelas</span></button>
                <button onClick={() => setModal({ tipo: 'despesa', dados: null })} className="bg-red-600 hover:bg-red-500 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Plus className="w-4 h-4 flex-shrink-0" /><span>Nova despesa</span></button>
              </div>
            </div>
            {erroSalvar && erroSalvar.key === 'despesas' && erroSalvar.tipo === 'quota' && (
              <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-4 text-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-300 mb-1">Despesas excederam o limite de armazenamento</h4>
                    <p className="text-xs text-slate-600 mb-2">{erroSalvar.mensagem}</p>
                    <p className="text-xs text-slate-400 mb-3">Erro ao sincronizar despesas com o servidor. Verifique a conexão e tente novamente.</p>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => { setErroSalvar(null); salvarChave('despesas', despesas); }} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded flex items-center gap-1.5"><RefreshCw className="w-3 h-3" />Tentar salvar novamente</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <Stat label="Despesas filtradas" valor={despesasFiltradas.length} />
              <Stat label="Total" valor={fmt(totaisDespesas)} cor="text-red-600" />
              <Stat label="Fixas" valor={fmt(despesasFiltradas.filter(d => d.tipo === 'FIXA').reduce((s, d) => s + num(d.valor), 0))} />
              <Stat label="Parcelas" valor={fmt(despesasFiltradas.filter(d => d.tipo === 'PARCELA').reduce((s, d) => s + num(d.valor), 0))} />
              <Stat label="Avulsas" valor={fmt(despesasFiltradas.filter(d => !d.tipo || d.tipo === 'AVULSA').reduce((s, d) => s + num(d.valor), 0))} />
            </div>
            {(() => {
              const origemMap = {};
              despesasFiltradas.forEach(d => { const o = d.origem || '(sem origem)'; origemMap[o] = (origemMap[o] || 0) + num(d.valor); });
              const origens = Object.entries(origemMap).sort((a, b) => b[1] - a[1]);
              if (origens.length === 0) return null;
              return (
                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Por Origem</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {origens.map(([orig, val]) => (
                      <div key={orig} className="flex items-center justify-between gap-2 bg-white rounded px-3 py-1.5">
                        <span className="text-xs text-slate-600 truncate">{orig}</span>
                        <span className="text-xs font-medium text-red-600 whitespace-nowrap">{fmt(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
              <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." className="w-full bg-white border border-slate-300 rounded-lg text-slate-900 pl-9 pr-3 py-2 text-sm" /></div>
              <select value={filtroCompetencia} onChange={e => setFiltroCompetencia(e.target.value)} className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm"><option value="">Todas competências</option>{competenciasUsadas.map(c => <option key={c} value={c}>{fmtMes(c)}</option>)}</select>
              <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm"><option value="">Todos tipos</option>{TIPOS_DESPESA.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm"><option value="">Todos status</option><option value="pago">Pago</option><option value="pendente">Pendente</option></select>
            </div>
            {despesasFiltradas.length === 0 ? <div className="bg-white border border-slate-200 rounded-xl p-12 text-center"><TrendingDown className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">Nenhuma despesa encontrada.</p></div> : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-slate-400 bg-slate-50 border-b border-slate-200"><tr><th className="text-left py-3 px-3">Compet.</th><th className="text-left px-3">Lançamento</th><th className="text-center px-3">Tipo</th><th className="text-center px-3">Parcela</th><th className="hidden sm:table-cell text-left px-3">Origem</th><th className="text-right px-3">Valor</th><th className="text-center px-3">Status</th><th className="text-right px-3">Ações</th></tr></thead>
                    <tbody>{despesasFiltradas.map(d => (
                      <tr key={d.id} className="border-b border-slate-200/50 hover:bg-slate-50">
                        <td className="px-3 text-xs whitespace-nowrap text-slate-600">{fmtMesCurto(d.competencia)}</td>
                        <td className="px-3 font-medium">{d.descricao}</td>
                        <td className="text-center px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${d.tipo === 'FIXA' ? 'bg-blue-500/20 text-blue-600' : d.tipo === 'PARCELA' ? 'bg-purple-500/20 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>{d.tipo === 'PARCELA' ? 'PARCELA' : (d.tipo || 'AVULSA')}</span></td>
                        <td className="text-center px-3 text-xs text-slate-400">{d.tipo === 'PARCELA' && d.parcelaAtual && d.parcelaTotal ? `${d.parcelaAtual}/${d.parcelaTotal}` : '—'}</td>
                        <td className="hidden sm:table-cell px-3 text-xs text-slate-400">{d.origem || '—'}</td>
                        <td className="text-right px-3 text-red-600 font-medium">{fmt(d.valor)}</td>
                        <td className="text-center px-3"><Badge status={d.status} /></td>
                        <td className="text-right px-3"><div className="flex justify-end gap-1">
                          <button onClick={() => setModal({ tipo: 'despesa', dados: d })} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => setModal({ tipo: 'confirmExcluirDesp', dados: d })} className="p-1.5 hover:bg-red-900/40 text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div></td>
                      </tr>
                    ))}</tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-medium"><tr><td colSpan={4} className="py-2.5 px-3 text-slate-400">Total ({despesasFiltradas.length})</td><td className="hidden sm:table-cell"></td><td className="text-right px-3 text-red-600">{fmt(totaisDespesas)}</td><td colSpan={2}></td></tr></tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {aba === 'despChefia' && (() => {
          const despChefiaFiltradas = despChefia.filter(d => {
            if (filtroCompetencia && d.competencia !== filtroCompetencia) return false;
            if (busca) { const q = busca.toLowerCase(); if (!d.descricao?.toLowerCase().includes(q)) return false; }
            return true;
          }).sort((a, b) => (b.competencia || '').localeCompare(a.competencia || '') || (b.criadoEm || '').localeCompare(a.criadoEm || ''));
          const totalChefia = despChefiaFiltradas.reduce((s, d) => s + num(d.valor), 0);
          const compsChefia = [...new Set(despChefia.map(d => d.competencia))].filter(Boolean).sort().reverse();
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2"><Briefcase className="w-5 h-5 text-violet-400 flex-shrink-0" /><span className="truncate">Despesas da Chefia</span></h2>
                  <p className="text-[11px] sm:text-xs text-slate-400">Despesas de Manhães e Ricardo — separadas das despesas operacionais.</p>
                </div>
                <div className="flex gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
                  <button onClick={() => setModal({ tipo: 'importarDespesasChefia' })} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Upload className="w-4 h-4 flex-shrink-0" /><span>Importar (XLSX/Texto)</span></button>
                  <button onClick={() => migrarParcelasExistentes('despesas_chefia')} title="One-shot: detecta parcelas existentes e cria as parcelas faltantes nos meses futuros." className="bg-purple-700 hover:bg-purple-600 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]" type="button"><span>Migrar parcelas</span></button>
                  <button onClick={() => setModal({ tipo: 'despChefia', dados: null })} className="bg-violet-600 hover:bg-violet-500 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Plus className="w-4 h-4 flex-shrink-0" /><span>Nova despesa</span></button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <Stat label="Registros" valor={despChefiaFiltradas.length} />
                <Stat label="Total" valor={fmt(totalChefia)} cor="text-violet-400" />
                <Stat label="Fixas" valor={fmt(despChefiaFiltradas.filter(d => d.tipo === 'FIXA').reduce((s, d) => s + num(d.valor), 0))} />
                <Stat label="Parcelas" valor={fmt(despChefiaFiltradas.filter(d => d.tipo === 'PARCELA').reduce((s, d) => s + num(d.valor), 0))} />
                <Stat label="Avulsas" valor={fmt(despChefiaFiltradas.filter(d => !d.tipo || d.tipo === 'AVULSA').reduce((s, d) => s + num(d.valor), 0))} />
              </div>
              {(() => {
                const origemMap = {};
                despChefiaFiltradas.forEach(d => { const o = d.origem || '(sem origem)'; origemMap[o] = (origemMap[o] || 0) + num(d.valor); });
                const origens = Object.entries(origemMap).sort((a, b) => b[1] - a[1]);
                if (origens.length === 0) return null;
                return (
                  <div className="bg-white border border-slate-200 rounded-xl p-3">
                    <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Por Origem</div>
                    <div className="flex flex-wrap gap-2">
                      {origens.map(([orig, val]) => (
                        <div key={orig} className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/30 rounded px-3 py-1.5">
                          <span className="text-xs font-semibold text-violet-600">{orig}</span>
                          <span className="text-xs font-medium text-violet-400">{fmt(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." className="w-full bg-white border border-slate-300 rounded-lg text-slate-900 pl-9 pr-3 py-2 text-sm" /></div>
                <select value={filtroCompetencia} onChange={e => setFiltroCompetencia(e.target.value)} className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm"><option value="">Todas competências</option>{compsChefia.map(c => <option key={c} value={c}>{fmtMes(c)}</option>)}</select>
              </div>
              {despChefiaFiltradas.length === 0 ? <div className="bg-white border border-slate-200 rounded-xl p-12 text-center"><Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">Nenhuma despesa da chefia encontrada.</p></div> : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-slate-400 bg-slate-50 border-b border-slate-200"><tr><th className="text-left py-3 px-3">Compet.</th><th className="text-left px-3">Lançamento</th><th className="text-center px-3">Tipo</th><th className="text-center px-3">Parcela</th><th className="text-center px-3">Origem</th><th className="text-right px-3">Valor</th><th className="text-center px-3">Status</th><th className="text-right px-3">Ações</th></tr></thead>
                      <tbody>{despChefiaFiltradas.map(d => (
                        <tr key={d.id} className="border-b border-slate-200/50 hover:bg-slate-50">
                          <td className="px-3 text-xs whitespace-nowrap text-slate-600">{fmtMesCurto(d.competencia)}</td>
                          <td className="px-3 font-medium">{d.descricao}</td>
                          <td className="text-center px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${d.tipo === 'FIXA' ? 'bg-blue-500/20 text-blue-600' : d.tipo === 'PARCELA' ? 'bg-purple-500/20 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>{d.tipo === 'PARCELA' ? 'PARCELA' : (d.tipo || 'AVULSA')}</span></td>
                          <td className="text-center px-3 text-xs text-slate-400">{d.tipo === 'PARCELA' && d.parcelaAtual && d.parcelaTotal ? `${d.parcelaAtual}/${d.parcelaTotal}` : '—'}</td>
                          <td className="text-center px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${d.origem === 'MANHÃES' ? 'bg-emerald-500/20 text-emerald-700' : 'bg-blue-500/20 text-blue-600'}`}>{d.origem || 'MANHÃES'}</span></td>
                          <td className="text-right px-3 text-violet-400 font-medium">{fmt(d.valor)}</td>
                          <td className="text-center px-3"><Badge status={d.status} /></td>
                          <td className="text-right px-3"><div className="flex justify-end gap-1">
                            <button onClick={() => setModal({ tipo: 'despChefia', dados: d })} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => setModal({ tipo: 'confirmExcluirDespChefia', dados: d })} className="p-1.5 hover:bg-red-900/40 text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                          </div></td>
                        </tr>
                      ))}</tbody>
                      <tfoot className="bg-slate-50 border-t border-slate-200 font-medium"><tr><td colSpan={4} className="py-2.5 px-3 text-slate-400">Total ({despChefiaFiltradas.length})</td><td></td><td className="text-right px-3 text-violet-400">{fmt(totalChefia)}</td><td colSpan={2}></td></tr></tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {aba === 'descontos' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="min-w-0"><h2 className="text-lg sm:text-xl font-bold">Vales e Adiantamentos</h2><p className="text-[11px] sm:text-xs text-slate-400">Descontados automaticamente da folha do funcionário na competência informada.</p></div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
                <button onClick={() => exportarDescontosXLSX(descontosFiltrados)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Download className="w-4 h-4 flex-shrink-0" /><span>Exportar</span></button>
                <button onClick={() => setModal({ tipo: 'importar', destino: 'desconto' })} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Upload className="w-4 h-4 flex-shrink-0" /><span>Importar</span></button>
                <button onClick={() => migrarParcelasExistentes('descontos')} title="One-shot: detecta vales parcelados existentes e cria as parcelas faltantes nas folhas futuras." className="bg-purple-700 hover:bg-purple-600 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]" type="button"><span>Migrar parcelas</span></button>
                <button onClick={() => setModal({ tipo: 'desconto', dados: null })} className="bg-amber-600 hover:bg-amber-500 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Plus className="w-4 h-4 flex-shrink-0" /><span>Novo vale</span></button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <Stat label="Vales filtrados" valor={descontosFiltrados.length} />
              <Stat label="Total" valor={fmt(totaisDescontos)} cor="text-amber-600" />
              <Stat label="Galop" valor={fmt(descontosFiltrados.filter(d => d.tipoVale === 'COMBUSTÍVEL - GALOP').reduce((s, d) => s + num(d.valor), 0))} />
              <Stat label="Marrakesh" valor={fmt(descontosFiltrados.filter(d => d.tipoVale === 'COMBUSTÍVEL - MARRAKESH').reduce((s, d) => s + num(d.valor), 0))} />
            </div>
            <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
              <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar beneficiário..." className="w-full bg-white border border-slate-300 rounded-lg text-slate-900 pl-9 pr-3 py-2 text-sm" /></div>
              <select value={filtroCompetencia} onChange={e => setFiltroCompetencia(e.target.value)} className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm"><option value="">Todas competências</option>{competenciasUsadas.map(c => <option key={c} value={c}>{fmtMes(c)}</option>)}</select>
              <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm"><option value="">Todos tipos</option>{TIPOS_VALE.map(c => <option key={c} value={c}>{c}</option>)}</select>
            </div>
            {descontosFiltrados.length === 0 ? <div className="bg-white border border-slate-200 rounded-xl p-12 text-center"><MinusCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">Nenhum vale encontrado.</p></div> : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-slate-400 bg-slate-50 border-b border-slate-200"><tr><th className="text-left py-3 px-3">Compet.</th><th className="text-left px-3">Beneficiário</th><th className="text-left px-3">Tipo</th><th className="text-center px-3">Parcela</th><th className="hidden sm:table-cell text-left px-3">Forma Pgto</th><th className="text-right px-3">Valor</th><th className="text-right px-3">Ações</th></tr></thead>
                    <tbody>{descontosFiltrados.map(d => (
                      <tr key={d.id} className="border-b border-slate-200/50 hover:bg-slate-50">
                        <td className="px-3 text-xs whitespace-nowrap text-slate-600">{fmtMesCurto(d.competencia)}</td>
                        <td className="px-3 font-medium">{d.alvoNome}</td>
                        <td className="px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${d.tipoVale === 'VALE' ? 'bg-amber-500/20 text-amber-700' : d.tipoVale?.includes('GALOP') ? 'bg-orange-500/20 text-orange-600' : d.tipoVale?.includes('MARRAKESH') ? 'bg-rose-500/20 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>{d.tipo === 'PARCELA' ? 'PARCELA' : (d.tipoVale || 'VALE')}</span></td>
                        <td className="text-center px-3 text-xs text-slate-400">{d.tipo === 'PARCELA' && d.parcelaAtual && d.parcelaTotal ? `${d.parcelaAtual}/${d.parcelaTotal}` : '—'}</td>
                        <td className="hidden sm:table-cell px-3 text-xs text-slate-400">{d.formaPagamento || '—'}</td>
                        <td className="text-right px-3 text-amber-600 font-medium">{fmt(d.valor)}</td>
                        <td className="text-right px-3"><div className="flex justify-end gap-1">
                          <button onClick={() => setModal({ tipo: 'desconto', dados: d })} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => setModal({ tipo: 'confirmExcluirDesc', dados: d })} className="p-1.5 hover:bg-red-900/40 text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div></td>
                      </tr>
                    ))}</tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-medium"><tr><td colSpan={4} className="py-2.5 px-3 text-slate-400">Total ({descontosFiltrados.length})</td><td className="hidden sm:table-cell"></td><td className="text-right px-3 text-amber-600">{fmt(totaisDescontos)}</td><td></td></tr></tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {aba === 'diarias' && (() => {
          const diariasFiltradas = diarias.filter(d => {
            if (filtroCompetencia && d.competencia !== filtroCompetencia) return false;
            if (filtroCliente && d.clienteNome !== filtroCliente) return false;
            if (busca) { const q = busca.toLowerCase(); if (!d.nome.toLowerCase().includes(q)) return false; }
            return true;
          }).sort((a, b) => b.data.localeCompare(a.data));
          const totalDiarias = diariasFiltradas.reduce((s, d) => s + num(d.valor), 0);
          const competenciasDiarias = [...new Set(diarias.map(d => d.competencia))].sort().reverse();
          const clientesDiarias = [...new Set(diarias.map(d => d.clienteNome).filter(Boolean))].sort();

          const parsearTexto = (texto) => {
            const linhas = texto.trim().split('\n').map(l => l.trim()).filter(Boolean);
            if (linhas.length < 2) return { erros: ['Arquivo vazio ou sem dados.'], itens: [] };
            const cabecalho = linhas[0].split(/\t|;/).map(c => c.trim().toUpperCase());
            const idxData   = cabecalho.findIndex(c => c.includes('DATA'));
            const idxNome   = cabecalho.findIndex(c => c.includes('NOME'));
            const idxValor  = cabecalho.findIndex(c => c.includes('VALOR'));
            const idxCliente = cabecalho.findIndex(c => c.includes('CLIENTE'));
            if (idxData < 0 || idxNome < 0 || idxValor < 0) return { erros: ['Cabeçalho inválido. Esperado: DATA, NOME, VALOR (e opcionalmente CLIENTE).'], itens: [] };
            const erros = [];
            const itens = [];
            for (let i = 1; i < linhas.length; i++) {
              const cols = linhas[i].split(/\t|;/).map(c => c.trim());
              const rawData  = cols[idxData]  || '';
              const rawNome  = cols[idxNome]  || '';
              const rawValor = cols[idxValor] || '';
              const rawCliente = idxCliente >= 0 ? (cols[idxCliente] || '') : '';
              if (!rawNome || !rawData || !rawValor) { erros.push(`Linha ${i + 1}: dados incompletos.`); continue; }
              // Converte data DD/MM/AAAA → AAAA-MM-DD
              const partes = rawData.split('/');
              if (partes.length !== 3) { erros.push(`Linha ${i + 1}: data inválida "${rawData}".`); continue; }
              const dataISO = `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`;
              const competencia = dataISO.slice(0, 7);
              // Converte valor R$ 160,00 → 160.00
              const valorNum = parseFloat(rawValor.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
              if (!valorNum) { erros.push(`Linha ${i + 1}: valor inválido "${rawValor}".`); continue; }
              // Encontra funcionário pelo nome (busca parcial normalizada)
              const nomeNorm = rawNome.trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
              const func = funcionarios.find(f => f.nome.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').includes(nomeNorm) || nomeNorm.includes(f.nome.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'')));
              // Encontra cliente pelo nome (parcial)
              const clienteNormRaw = rawCliente.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
              const clienteObj = servicos.find(s => clienteNormRaw && s.cliente.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').includes(clienteNormRaw));
              itens.push({ competencia, data: dataISO, funcionarioId: func?.id || null, nome: func?.nome || rawNome.trim().toUpperCase(), clienteId: clienteObj?.cliente_id || null, clienteNome: rawCliente || clienteObj?.cliente || '', valor: valorNum });
            }
            return { erros, itens };
          };

          return (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="min-w-0"><h2 className="text-lg sm:text-xl font-bold">Lançamentos Avulsos</h2><p className="text-[11px] sm:text-xs text-slate-400">Pagamentos avulsos a colaboradores (salários, diárias extras, prêmios). Somados automaticamente na folha por categoria.</p></div>
                <div className="flex gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
                  <button onClick={() => setModal({ tipo: 'importarDiariasXLSX' })} className="bg-blue-600 hover:bg-blue-500 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Upload className="w-4 h-4 flex-shrink-0" /><span>Importar (XLSX/Texto)</span></button>
                  <button onClick={() => setModal({ tipo: 'diaria', dados: null })} className="bg-orange-600 hover:bg-orange-500 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Plus className="w-4 h-4 flex-shrink-0" /><span>Novo lançamento avulso</span></button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <Stat label="Registros" valor={diariasFiltradas.length} />
                <Stat label="Total" valor={fmt(totalDiarias)} cor="text-orange-400" />
                <Stat label="Competências" valor={competenciasDiarias.length} />
                <Stat label="Clientes" valor={clientesDiarias.length} />
              </div>
              <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar funcionário..." className="w-full bg-white border border-slate-300 rounded-lg text-slate-900 pl-9 pr-3 py-2 text-sm" /></div>
                <select value={filtroCompetencia} onChange={e => setFiltroCompetencia(e.target.value)} className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm"><option value="">Todas competências</option>{competenciasDiarias.map(c => <option key={c} value={c}>{fmtMes(c)}</option>)}</select>
                <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm"><option value="">Todos clientes</option>{clientesDiarias.map(c => <option key={c} value={c}>{c}</option>)}</select>
              </div>
              {diariasFiltradas.length === 0
                ? <div className="bg-white border border-slate-200 rounded-xl p-12 text-center"><Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">Nenhuma diária encontrada. Importe um arquivo ou adicione manualmente.</p></div>
                : (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-xs text-slate-400 bg-slate-50 border-b border-slate-200">
                          <tr><th className="text-left py-3 px-3">Data</th><th className="hidden sm:table-cell text-left px-3">Compet.</th><th className="text-left px-3">Funcionário</th><th className="hidden sm:table-cell text-left px-3">Tipo de Folha / Cliente</th><th className="text-right px-3">Valor</th><th className="text-right px-3">Ações</th></tr>
                        </thead>
                        <tbody>{diariasFiltradas.map(d => (
                          <tr key={d.id} className="border-b border-slate-200/50 hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-xs whitespace-nowrap">{d.data ? d.data.split('-').reverse().join('/') : '—'}</td>
                            <td className="hidden sm:table-cell px-3 text-xs text-slate-600">{fmtMesCurto(d.competencia)}</td>
                            <td className="px-3 font-medium">{d.nome}</td>
                            <td className="hidden sm:table-cell px-3 text-xs text-slate-400">{d.folhaGrupo ? <span className="text-blue-600 font-medium">{d.folhaGrupo}</span> : (d.clienteNome || '—')}</td>
                            <td className="text-right px-3 text-orange-400 font-medium">{fmt(d.valor)}</td>
                            <td className="text-right px-3"><div className="flex justify-end gap-1">
                              <button onClick={() => setModal({ tipo: 'diaria', dados: d })} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => { if (window.confirm('Excluir esta diária?')) setDiarias(prev => prev.filter(x => x.id !== d.id)); }} className="p-1.5 hover:bg-red-900/40 text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                            </div></td>
                          </tr>
                        ))}</tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200 font-medium"><tr><td colSpan={2} className="py-2.5 px-3 text-slate-400">Total ({diariasFiltradas.length})</td><td className="hidden sm:table-cell"></td><td className="hidden sm:table-cell"></td><td className="text-right px-3 text-orange-400">{fmt(totalDiarias)}</td><td></td></tr></tfoot>
                      </table>
                    </div>
                  </div>
                )
              }
              {modal?.tipo === 'importarDiarias' && (
                <ModalImportarDiarias
                  onImportar={(texto) => {
                    const { erros, itens } = parsearTexto(texto);
                    if (itens.length > 0) {
                      const criados = garantirFuncionarios(itens.map(it => it.nome).filter(Boolean));
                      setDiarias(prev => [...prev, ...itens.map(it => ({ ...it, id: `DI_${Date.now()}_${Math.random().toString(36).slice(2)}` }))]);
                      const msg = `${itens.length} diária(s) importada(s)`
                        + (erros.length ? ` (${erros.length} erro(s))` : '')
                        + (criados > 0 ? ` · ${criados} funcionário(s) cadastrado(s)` : '');
                      showToast(msg, erros.length ? 'warn' : 'success');
                    }
                    if (erros.length && !itens.length) showToast(erros[0], 'error');
                    setModal(null);
                  }}
                  onFechar={() => setModal(null)}
                  errosPreview={[]}
                />
              )}
              {modal?.tipo === 'diaria' && (
                <ModalDiaria
                  dados={modal.dados}
                  funcionarios={funcionarios}
                  categoriasFolha={categoriasFolha}
                  clientesUnicos={clientesDiarias}
                  onSalvar={(d) => {
                    // Se a categoria informada não existe no Cat. Folha, cria automaticamente
                    if (d.folhaGrupo) garantirCategoriasFolha([d.folhaGrupo]);
                    if (d.id) setDiarias(prev => prev.map(x => x.id === d.id ? d : x));
                    else setDiarias(prev => [...prev, { ...d, id: `DI_${Date.now()}` }]);
                    setModal(null);
                  }}
                  onFechar={() => setModal(null)}
                />
              )}
            </div>
          );
        })()}

        {aba === 'clientes' && (() => {
          const clientesFiltrados = clientes.filter(c => {
            if (filtroStatus && c.status !== filtroStatus) return false;
            if (busca) { const q = busca.toLowerCase(); if (!`${c.nome} ${c.cnpj} ${c.cidade} ${c.nomeContato}`.toLowerCase().includes(q)) return false; }
            return true;
          }).sort((a, b) => a.nome.localeCompare(b.nome));
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="min-w-0"><h2 className="text-lg sm:text-xl font-bold">Clientes</h2><p className="text-[11px] sm:text-xs text-slate-400">Cadastro de contratantes. Utilizados em serviços, faturas e relatórios.</p></div>
                <button onClick={() => setModal({ tipo: 'cliente', dados: null })} className="bg-indigo-600 hover:bg-indigo-500 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Plus className="w-4 h-4 flex-shrink-0" /><span>Novo cliente</span></button>
              </div>
              <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, CNPJ, cidade..." className="w-full bg-white border border-slate-300 rounded-lg text-slate-900 pl-9 pr-3 py-2 text-sm" /></div>
                <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm"><option value="">Todos status</option><option value="ATIVO">Ativo</option><option value="INATIVO">Inativo</option></select>
              </div>
              {clientesFiltrados.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center"><Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">Nenhum cliente encontrado.</p></div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {clientesFiltrados.map(c => (
                    <div key={c.id} className={`bg-white border rounded-xl p-4 ${c.status === 'INATIVO' ? 'border-slate-200 opacity-60' : 'border-slate-800'}`}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base truncate">{c.nome}</span>
                            {c.status === 'INATIVO' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">INATIVO</span>}
                          </div>
                          {c.razaoSocial && c.razaoSocial !== c.nome && <div className="text-xs text-slate-400 mt-0.5">{c.razaoSocial}</div>}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => setModal({ tipo: 'cliente', dados: c })} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => setModal({ tipo: 'confirmExcluirCliente', dados: c })} className="p-1.5 hover:bg-red-900/40 text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        {c.cnpj && <div className="flex items-center gap-1.5 text-slate-400"><Fingerprint className="w-3 h-3" />{c.cnpj}</div>}
                        {c.telefone && <div className="flex items-center gap-1.5 text-slate-400"><Phone className="w-3 h-3" />{c.telefone}</div>}
                        {c.email && <div className="flex items-center gap-1.5 text-slate-400 col-span-2 truncate"><Mail className="w-3 h-3 flex-shrink-0" />{c.email}</div>}
                        {(c.cidade || c.uf) && <div className="flex items-center gap-1.5 text-slate-400"><MapPin className="w-3 h-3" />{[c.cidade, c.uf].filter(Boolean).join(' — ')}</div>}
                        {c.nomeContato && <div className="flex items-center gap-1.5 text-slate-400"><User className="w-3 h-3" />{c.nomeContato}{c.cargoContato ? ` · ${c.cargoContato}` : ''}</div>}
                        {c.aliquota > 0 && <div className="flex items-center gap-1.5 text-amber-600"><Receipt className="w-3 h-3" />Alíquota: {c.aliquota}%</div>}
                      </div>
                      {c.observacoes && <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-500 italic">{c.observacoes}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {aba === 'funcionarios' && (() => {
          const ativosSemPix = funcionarios.filter(f => f.status === 'ATIVO' && !((f.chavePix || '').trim()));
          const funcFiltrados = funcionarios.filter(f => {
            if (filtroCategoria && f.categoria !== filtroCategoria) return false;
            if (filtroSemPixFunc && (f.status !== 'ATIVO' || (f.chavePix || '').trim())) return false;
            if (busca && !`${f.nome} ${f.cpf} ${f.rg}`.toLowerCase().includes(busca.toLowerCase())) return false;
            return true;
          }).sort((a, b) => a.nome.localeCompare(b.nome));
          const todosSel = funcFiltrados.length > 0 && funcFiltrados.every(f => selFuncionarios.has(f.id));
          const toggleSelFunc = (id) => setSelFuncionarios(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
          const toggleTodosFunc = () => setSelFuncionarios(todosSel ? new Set() : new Set(funcFiltrados.map(f => f.id)));
          const ativarFuncionarios = (ativo) => { const status = ativo ? 'ATIVO' : 'INATIVO'; setFuncionarios(prev => prev.map(f => selFuncionarios.has(f.id) ? { ...f, status } : f)); setSelFuncionarios(new Set()); showToast(`${selFuncionarios.size} funcionário(s) ${ativo ? 'ativado(s)' : 'inativado(s)'}`, 'success'); };
          const alterarCategoriaEmMassa = (cat) => { if (!cat) return; setFuncionarios(prev => prev.map(f => selFuncionarios.has(f.id) ? { ...f, categoria: cat } : f)); setSelFuncionarios(new Set()); showToast(`Categoria alterada para ${cat}`, 'success'); };
          return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="min-w-0"><h2 className="text-lg sm:text-xl font-bold">Funcionários e Prestadores</h2><p className="text-[11px] sm:text-xs text-slate-400">Cadastro com RG, CPF, endereço, chave Pix e categoria editável.</p></div>
              <div className="flex gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
                <button onClick={() => exportarFuncionariosXLSX(funcionarios)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]" title="Exportar todos os funcionários em XLSX"><Download className="w-4 h-4 flex-shrink-0" /><span>Exportar XLSX</span></button>
                <button onClick={() => gerarModeloFuncionariosXLSX()} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]" title="Baixar modelo de planilha em branco"><Download className="w-4 h-4 flex-shrink-0" /><span>Modelo</span></button>
                <button onClick={() => setModal({ tipo: 'importarFuncionarios' })} className="bg-emerald-600 hover:bg-emerald-500 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Upload className="w-4 h-4 flex-shrink-0" /><span>Importar planilha</span></button>
                <button onClick={() => setModal({ tipo: 'funcionario', dados: null })} className="bg-indigo-600 hover:bg-indigo-500 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Plus className="w-4 h-4 flex-shrink-0" /><span>Novo</span></button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
              <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." className="w-full bg-white border border-slate-300 rounded-lg text-slate-900 pl-9 pr-3 py-2 text-sm" /></div>
              <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm"><option value="">Todas categorias</option>{categoriasUsadas.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <button onClick={() => setFiltroSemPixFunc(v => !v)} className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${filtroSemPixFunc ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-amber-600 border border-amber-300'}`} title="Filtra apenas funcionários ATIVOs sem chave PIX cadastrada">⚠ Sem PIX ({ativosSemPix.length})</button>
            </div>
            {/* Barra de ações em massa */}
            {selFuncionarios.size > 0 && (
              <div className="bg-indigo-600/20 border border-indigo-500/40 rounded-lg px-4 py-2 flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-indigo-600">{selFuncionarios.size} selecionado(s)</span>
                <button onClick={() => ativarFuncionarios(true)} className="text-xs bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded font-medium">Ativar</button>
                <button onClick={() => ativarFuncionarios(false)} className="text-xs bg-slate-600 hover:bg-slate-500 px-3 py-1.5 rounded font-medium">Inativar</button>
                <select onChange={e => alterarCategoriaEmMassa(e.target.value)} className="text-xs bg-white border border-slate-200 text-slate-700 rounded px-2 py-1.5">
                  <option value="">Alterar categoria…</option>
                  {categoriasUsadas.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={() => setSelFuncionarios(new Set())} className="text-xs text-slate-400 hover:text-slate-700 ml-auto">Limpar seleção</button>
              </div>
            )}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-slate-400 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 w-8"><input type="checkbox" checked={todosSel} onChange={toggleTodosFunc} className="rounded cursor-pointer" /></th>
                      <th className="text-left px-3">Nome</th><th className="text-left px-3">Categoria</th><th className="hidden sm:table-cell text-left px-3">CPF</th><th className="hidden sm:table-cell text-left px-3">Pix</th><th className="hidden sm:table-cell text-center px-3">Status</th><th className="text-right px-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>{funcFiltrados.map(f => { const sel = selFuncionarios.has(f.id); return (
                    <tr key={f.id} className={`border-b border-slate-200/50 hover:bg-slate-50 ${sel ? 'bg-indigo-900/20' : ''}`}>
                      <td className="px-3"><input type="checkbox" checked={sel} onChange={() => toggleSelFunc(f.id)} className="rounded cursor-pointer" /></td>
                      <td className="py-2.5 px-3 font-medium">{f.nome}</td>
                      <td className="px-3"><span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{f.categoria}</span></td>
                      <td className="hidden sm:table-cell px-3 text-slate-400 font-mono text-xs">{f.cpf || '—'}</td>
                      <td className="hidden sm:table-cell px-3 text-xs">{f.chavePix ? <span className="text-emerald-600">{f.tipoPix}</span> : <span className="text-slate-500">—</span>}</td>
                      <td className="hidden sm:table-cell text-center px-3"><span className={`text-xs px-2 py-0.5 rounded-full ${f.status === 'ATIVO' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{f.status}</span></td>
                      <td className="text-right px-3"><div className="flex justify-end gap-1">
                        <button onClick={() => setModal({ tipo: 'fichaFuncPDF', dados: f })} className="p-1.5 hover:bg-slate-100 rounded text-indigo-600" title="Ficha cadastral em PDF"><User className="w-4 h-4" /></button>
                        <button onClick={() => setModal({ tipo: 'escolherCompetReciboPSO', dados: f })} className="p-1.5 hover:bg-slate-100 rounded text-amber-300" title="Recibo de prestação de serviços"><Receipt className="w-4 h-4" /></button>
                        <button onClick={() => setModal({ tipo: 'funcionario', dados: f })} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => setModal({ tipo: 'confirmExcluirFunc', dados: f })} className="p-1.5 hover:bg-red-900/40 text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div></td>
                    </tr>
                  ); })}</tbody>
                </table>
              </div>
            </div>
          </div>
          );
        })()}

        {aba === 'folha' && (() => {
          const folhaKey = (f) => `${f.funcionario.id}|${f.periodo}`;
          const todosSelFolha = folhasFiltradas.length > 0 && folhasFiltradas.every(f => selFolhas.has(folhaKey(f)));
          const toggleSelFolha = (k) => setSelFolhas(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
          const toggleTodosFolha = () => setSelFolhas(todosSelFolha ? new Set() : new Set(folhasFiltradas.map(folhaKey)));
          const gruposFolhaUsados = [...new Set(funcionarios.map(f => f.folhaGrupo).filter(Boolean))].sort();
          return (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="min-w-0"><h2 className="text-lg sm:text-xl font-bold">Folha de Pagamento</h2><p className="text-[11px] sm:text-xs text-slate-400">Pagamento por mês calendário. Calculado a partir dos lançamentos e dos lançamentos avulsos da competência.</p></div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
                <button onClick={() => setModal({ tipo: 'historicoCora' })} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Wallet className="w-4 h-4 flex-shrink-0" /><span>Histórico Cora</span></button>
                <button onClick={() => exportarFolhaCategoriaXLSX(folhasFiltradas)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Download className="w-4 h-4 flex-shrink-0" /><span>Exportar XLSX</span></button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
              <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar funcionário..." className="w-full bg-white border border-slate-300 rounded-lg text-slate-900 pl-9 pr-3 py-2 text-sm" /></div>
              <select value={filtroMesFolha} onChange={e => setFiltroMesFolha(e.target.value)} className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm"><option value="">Todos os meses</option>{mesesFolha.map(m => <option key={m} value={m}>{fmtMes(m)}</option>)}</select>
              <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm"><option value="">Todas categorias</option>{categoriasUsadas.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <select value={filtroStatusFolha} onChange={e => setFiltroStatusFolha(e.target.value)} className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm">
                <option value="">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="transferido">Transferido</option>
                <option value="pago">Pago</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>

            {(() => {
              const ativos = funcionarios.filter(f => f.status === 'ATIVO');
              const periodoAlvo = filtroMesFolha || mesesFolha[0] || '';
              const idsComFolha = new Set(folhasPorFunc.filter(fp => !periodoAlvo || fp.periodo === periodoAlvo).map(fp => fp.funcionario.id));
              const semFolha = ativos.filter(f => !idsComFolha.has(f.id));
              // v88: detecta funcionários com folha no período mas sem chave PIX cadastrada (bloqueio para Cora)
              const comFolhaSemPix = folhasFiltradas.filter(fp => !((fp.funcionario.chavePix || '').trim())).map(fp => fp.funcionario);
              const idsSemPix = new Set(comFolhaSemPix.map(f => f.id));
              const semPixUnicos = comFolhaSemPix.filter((f, i, arr) => arr.findIndex(x => x.id === f.id) === i);
              return (
                <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                  <ClipboardList className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span><b className="text-slate-700">{idsComFolha.size}</b> funcionário(s) com folha {periodoAlvo ? `em ${fmtMesCurto(periodoAlvo)}` : 'no histórico'} · <b className="text-slate-700">{ativos.length}</b> ATIVO(s) no total</span>
                  {semPixUnicos.length > 0 && (
                    <button onClick={() => alert(`Funcionários com folha no filtro atual mas SEM chave PIX cadastrada:\n\n${semPixUnicos.map(f => `• ${f.nome}${f.folhaGrupo ? ` (${f.folhaGrupo})` : ''}`).join('\n')}\n\nEstas folhas não podem ser transferidas via Cora — cadastre a chave PIX em Funcionários antes de iniciar a transferência.`)}
                      className="text-rose-400 hover:text-rose-600 underline">
                      ⚠ {semPixUnicos.length} sem PIX
                    </button>
                  )}
                  {semFolha.length > 0 && (
                    <button onClick={() => alert(`Funcionários ATIVOs sem folha${periodoAlvo ? ` em ${fmtMes(periodoAlvo)}` : ''}:\n\n${semFolha.map(f => `• ${f.nome}${f.folhaGrupo ? ` (${f.folhaGrupo})` : ''}`).join('\n')}\n\nPossíveis causas: sem participação em lançamentos fechados nem diárias avulsas no período, ou nome no campo agente1/agente2/motorista do lançamento difere do cadastro.`)}
                      className="ml-auto text-amber-600 hover:text-amber-300 underline">
                      Ver {semFolha.length} sem folha
                    </button>
                  )}
                </div>
              );
            })()}

            {folhasFiltradas.length === 0 ? <div className="bg-white border border-slate-200 rounded-xl p-12 text-center"><Wallet className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">Nenhuma folha encontrada.</p></div> : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <Stat label="Folhas" valor={folhasFiltradas.length} />
                  <Stat label="Bruto" valor={fmt(folhasFiltradas.reduce((s, f) => s + f.bruto, 0))} />
                  <Stat label="Adicionais" valor={fmt(folhasFiltradas.reduce((s, f) => s + f.adicionais, 0))} cor="text-emerald-600" />
                  <Stat label="Descontos" valor={fmt(folhasFiltradas.reduce((s, f) => s + f.descontos, 0))} cor="text-red-600" />
                  <Stat label="Líquido" valor={fmt(folhasFiltradas.reduce((s, f) => s + f.liquido, 0))} cor="text-amber-600" />
                </div>
                {selFolhas.size > 0 && (() => {
                  const selecionadas = folhasFiltradas.filter(f => selFolhas.has(folhaKey(f)));
                  const elegíveis = selecionadas.filter(f => f.status === 'pendente' && f.liquido > 0 && (f.funcionario.chavePix || '').trim());
                  const totalLiquido = elegíveis.reduce((s, f) => s + f.liquido, 0);
                  const chavesSel = [...selFolhas];
                  return (
                    <div className="flex flex-wrap items-center gap-2 bg-emerald-600/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                      <span className="text-emerald-300 font-semibold text-sm">{selFolhas.size} selecionada(s)</span>
                      {elegíveis.length < selecionadas.length && <span className="text-xs text-amber-600">{selecionadas.length - elegíveis.length} inelegível(is) p/ Cora (sem PIX, líquido ≤ 0 ou status ≠ pendente)</span>}
                      <span className="text-xs text-slate-400">Total <b className="text-emerald-300">líquido</b>: <b className="text-emerald-300">{fmt(totalLiquido)}</b></span>
                      <div className="flex-1" />
                      <button
                        onClick={() => { atualizarStatusFolhasMassa(chavesSel, 'pago'); setSelFolhas(new Set()); }}
                        className="bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 text-white"
                        title="Marca as selecionadas como pago manualmente (data = hoje)"
                      ><CheckCircle2 className="w-3.5 h-3.5" />Marcar pago</button>
                      <button
                        onClick={() => { atualizarStatusFolhasMassa(chavesSel, 'pendente'); setSelFolhas(new Set()); }}
                        className="bg-amber-700/60 hover:bg-amber-600/80 text-amber-700 px-3 py-1.5 rounded text-xs flex items-center gap-1.5"
                        title="Volta para pendente (limpa data de pagamento)"
                      ><RefreshCw className="w-3.5 h-3.5" />Pendente</button>
                      <button
                        onClick={() => { if (confirm(`Cancelar ${chavesSel.length} folha(s)?`)) { atualizarStatusFolhasMassa(chavesSel, 'cancelada'); setSelFolhas(new Set()); } }}
                        className="bg-red-700/60 hover:bg-red-600 text-red-700 px-3 py-1.5 rounded text-xs flex items-center gap-1.5"
                      ><X className="w-3.5 h-3.5" />Cancelar</button>
                      <button
                        disabled={elegíveis.length === 0}
                        onClick={() => setModal({ tipo: 'transferirCora', folhas: elegíveis })}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 text-white"
                      ><Send className="w-3.5 h-3.5" />Transferir via Cora ({elegíveis.length})</button>
                      <button onClick={() => setSelFolhas(new Set())} className="text-slate-400 hover:text-slate-900 p-1.5 rounded hover:bg-slate-100" title="Limpar seleção"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  );
                })()}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-slate-400 bg-slate-50 border-b border-slate-200"><tr>
                        <th className="px-3 py-3 w-8"><input type="checkbox" checked={todosSelFolha} onChange={toggleTodosFolha} className="w-3.5 h-3.5 accent-blue-500 cursor-pointer" /></th>
                        <th className="text-left py-3 px-3">Funcionário</th>
                        <th className="hidden sm:table-cell text-left px-3">Cat. Folha</th>
                        <th className="hidden md:table-cell text-left px-3">Cargo</th>
                        <th className="hidden sm:table-cell text-left px-3">Mês</th>
                        <th className="hidden md:table-cell text-center px-3">Lanç.</th>
                        <th className="text-right px-3">Bruto</th>
                        <th className="text-right px-3">+/-</th>
                        <th className="text-right px-3">Líquido</th>
                        <th className="text-center px-3">Status</th>
                        <th className="text-right px-3">Ações</th>
                      </tr></thead>
                      <tbody>{folhasFiltradas.map(f => { const k = folhaKey(f); const sel = selFolhas.has(k); return (
                        <tr key={k} className={`border-b border-slate-200/50 hover:bg-slate-50 ${sel ? 'bg-blue-900/20' : ''}`}>
                          <td className="px-3 py-2.5 w-8"><input type="checkbox" checked={sel} onChange={() => toggleSelFolha(k)} className="w-3.5 h-3.5 accent-blue-500 cursor-pointer" /></td>
                          <td className="py-2.5 px-3 font-medium"><div>{f.funcionario.nome}</div><div className="sm:hidden text-[10px] text-slate-400">{fmtMesCurto(f.periodoExibicao)}</div></td>
                          <td className="hidden sm:table-cell px-3 text-xs">
                            {f.categoriaFolha ? <span className="font-medium text-blue-600" title="Derivada dos lançamentos. Para alterar, edite os lançamentos.">{f.categoriaFolha}</span> : <span className="text-slate-500 italic" title="Nenhum lançamento desta folha tem categoria definida.">—</span>}
                          </td>
                          <td className="hidden md:table-cell px-3 text-xs text-slate-500">{f.funcionario.categoria}</td>
                          <td className="hidden sm:table-cell px-3 whitespace-nowrap text-xs">
                            {f.periodoExibicao !== f.periodo ? <span title={`Original: ${fmtMesCurto(f.periodo)}`}>{fmtMesCurto(f.periodoExibicao)} <span className="text-amber-600">*</span></span> : fmtMesCurto(f.periodo)}
                          </td>
                          <td className="hidden md:table-cell text-center px-3">{f.lancs.length}</td>
                          <td className="text-right px-3 text-xs">{fmt(f.bruto)}</td>
                          <td className="text-right px-3 text-xs">{f.adicionais > 0 && <span className="text-emerald-600">+{fmt(f.adicionais)}</span>}{f.adicionais > 0 && f.descontos > 0 && ' / '}{f.descontos > 0 && <span className="text-red-600">-{fmt(f.descontos)}</span>}{f.adicionais === 0 && f.descontos === 0 && <span className="text-slate-500">—</span>}</td>
                          <td className="text-right px-3 font-bold text-amber-600">{fmt(f.liquido)}</td>
                          <td className="text-center px-3"><span className={`text-xs px-2 py-0.5 rounded-full ${f.status === 'pago' ? 'bg-emerald-500/20 text-emerald-600' : f.status === 'transferido' ? 'bg-blue-500/20 text-blue-600' : f.status === 'cancelada' ? 'bg-red-500/20 text-red-300 line-through' : 'bg-amber-500/20 text-amber-600'}`}>{f.status}</span></td>
                          <td className="text-right px-3"><div className="flex justify-end gap-1">
                            {f.status !== 'pago' ? (
                              <button onClick={() => atualizarStatusFolhasMassa([folhaKey(f)], 'pago')} className="text-xs bg-emerald-700/60 hover:bg-emerald-600 px-2 py-1 rounded flex items-center gap-1 text-emerald-100" title="Marcar como pago"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                            ) : (
                              <button onClick={() => atualizarStatusFolhasMassa([folhaKey(f)], 'pendente')} className="text-xs bg-amber-700/40 hover:bg-amber-600/60 px-2 py-1 rounded flex items-center gap-1 text-amber-700" title="Reverter para pendente"><RefreshCw className="w-3.5 h-3.5" /></button>
                            )}
                            <button onClick={() => setModal({ tipo: 'detalheFolha', dados: f })} className="text-xs bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 rounded flex items-center gap-1"><Eye className="w-3.5 h-3.5" />Ver</button>
                          </div></td>
                        </tr>
                      ); })}</tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
          );
        })()}

        {aba === 'catFolha' && (() => {
          const usadasNoSistema = new Set();
          lancamentos.forEach(l => { if (l.categoriaFolha) usadasNoSistema.add(l.categoriaFolha); });
          funcionarios.forEach(f => { if (f.folhaGrupo) usadasNoSistema.add(f.folhaGrupo); });
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold">Categorias de Folha</h2>
                  <p className="text-[11px] sm:text-xs text-slate-400">Cadastro de categorias usadas em lançamentos e funcionários (espelhadas como grupos de folha fixa). Crie aqui antes de aplicar nos lançamentos.</p>
                </div>
                <button onClick={() => setModal({ tipo: 'categoriaFolha', dados: null })} className="bg-indigo-600 hover:bg-indigo-500 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Plus className="w-4 h-4 flex-shrink-0" /><span>Nova categoria</span></button>
              </div>
              {categoriasFolha.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                  <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Nenhuma categoria cadastrada ainda.</p>
                  <p className="text-xs text-slate-500 mt-2">Categorias controlam o agrupamento da folha de pagamento. Use a mesma para vários colaboradores que pertencem à mesma estrutura de folha (ex: ARMADA, ESCRITÓRIO, MOTOLINK).</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categoriasFolha.map(c => {
                    const qtdLancs = lancamentos.filter(l => l.categoriaFolha === c.nome).length;
                    const qtdFuncs = funcionarios.filter(f => f.folhaGrupo === c.nome).length;
                    return (
                      <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-base text-blue-600">{c.nome}</div>
                            <div className="text-xs text-slate-400 mt-1">{qtdLancs} lançamento(s) · {qtdFuncs} funcionário(s)</div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => setModal({ tipo: 'categoriaFolha', dados: c })} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => { if (window.confirm(`Excluir categoria "${c.nome}"? Lançamentos e funcionários que usam essa categoria continuarão com o nome, mas não estará mais no catálogo.`)) excluirCategoriaFolha(c.id); }} className="p-1.5 hover:bg-red-900/40 text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {[...usadasNoSistema].filter(c => !categoriasFolha.find(cat => cat.nome === c)).length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-700">
                  <p className="font-semibold mb-1 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />Categorias em uso no sistema mas não cadastradas:</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[...usadasNoSistema].filter(c => !categoriasFolha.find(cat => cat.nome === c)).map(c => (
                      <button key={c} onClick={() => salvarCategoriaFolha({ nome: c })} className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 text-xs px-2 py-1 rounded-full flex items-center gap-1.5"><Plus className="w-3 h-3" />{c}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {aba === 'catalogo' && (() => {
          const servicosFiltrados = servicos.filter(s => {
            if (filtroCatServico && (s.categoriaServico || 'VELADA') !== filtroCatServico) return false;
            return !busca || s.cod.toLowerCase().includes(busca.toLowerCase()) || s.descricao.toLowerCase().includes(busca.toLowerCase()) || s.cliente.toLowerCase().includes(busca.toLowerCase());
          });
          const todosSelServicos = servicosFiltrados.length > 0 && servicosFiltrados.every(s => selServicos.has(s.cod));
          const toggleSelServico = (cod) => setSelServicos(prev => { const n = new Set(prev); n.has(cod) ? n.delete(cod) : n.add(cod); return n; });
          const toggleTodosServicos = () => setSelServicos(todosSelServicos ? new Set() : new Set(servicosFiltrados.map(s => s.cod)));
          const ativarServicos = (ativo) => { const status = ativo ? 'ATIVO' : 'INATIVO'; setServicos(prev => prev.map(s => selServicos.has(s.cod) ? { ...s, status } : s)); setSelServicos(new Set()); showToast(`${selServicos.size} serviço(s) ${ativo ? 'ativado(s)' : 'inativado(s)'}`, 'success'); };
          return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="min-w-0"><h2 className="text-lg sm:text-xl font-bold">Catálogo de Serviços</h2><p className="text-[11px] sm:text-xs text-slate-400">Código editável diretamente no formulário. Copie um serviço existente como base.</p></div>
              <div className="flex gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
                <button onClick={() => exportarServicosXLSX(servicos)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]" title="Exportar todos os serviços em XLSX"><Download className="w-4 h-4 flex-shrink-0" /><span>Exportar XLSX</span></button>
                <button onClick={() => setModal({ tipo: 'copiarServico' })} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><ClipboardList className="w-4 h-4 flex-shrink-0" /><span>Copiar serviço</span></button>
                <button onClick={() => setModal({ tipo: 'servico', dados: null })} className="bg-indigo-600 hover:bg-indigo-500 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Plus className="w-4 h-4 flex-shrink-0" /><span>Novo serviço</span></button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
              <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." className="w-full bg-white border border-slate-300 rounded-lg text-slate-900 pl-9 pr-3 py-2 text-sm" /></div>
              <select value={filtroCatServico} onChange={e => setFiltroCatServico(e.target.value)} className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm">
                <option value="">Todas categorias</option>
                {CATEGORIAS_SERVICO.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {CATEGORIAS_SERVICO.map(c => {
                const list = servicos.filter(s => (s.categoriaServico || 'VELADA') === c);
                const cor = CORES_CATEGORIA_SERVICO[c];
                return (
                  <button key={c} onClick={() => setFiltroCatServico(filtroCatServico === c ? '' : c)} className={`text-left ${cor.bg} border ${cor.border} rounded-lg p-2 hover:opacity-80 ${filtroCatServico === c ? 'ring-2 ring-white/30' : ''}`}>
                    <div className={`text-[10px] uppercase ${cor.text} font-semibold`}>{c}</div>
                    <div className="text-base font-bold">{list.length}</div>
                    <div className="text-[10px] text-slate-400">{list.filter(s => s.status === 'ATIVO').length} ativos</div>
                  </button>
                );
              })}
            </div>
            {/* Barra de ações em massa */}
            {selServicos.size > 0 && (
              <div className="bg-indigo-600/20 border border-indigo-500/40 rounded-lg px-4 py-2 flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-indigo-600">{selServicos.size} selecionado(s)</span>
                <button onClick={() => ativarServicos(true)} className="text-xs bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded flex items-center gap-1.5 font-medium">Ativar</button>
                <button onClick={() => ativarServicos(false)} className="text-xs bg-slate-600 hover:bg-slate-500 px-3 py-1.5 rounded flex items-center gap-1.5 font-medium">Inativar</button>
                <button onClick={() => setSelServicos(new Set())} className="text-xs text-slate-400 hover:text-slate-700 ml-auto">Limpar seleção</button>
              </div>
            )}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-slate-400 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 w-8"><input type="checkbox" checked={todosSelServicos} onChange={toggleTodosServicos} className="rounded cursor-pointer" /></th>
                      <th className="text-left px-3">Cód.</th><th className="text-left px-3">Descrição</th><th className="text-center px-3">Categoria</th><th className="hidden sm:table-cell text-left px-3">Cliente / Template</th><th className="hidden md:table-cell text-center px-3">Franquia</th><th className="text-right px-3">Diária Pg</th><th className="text-right px-3">Vlr Fatura</th><th className="hidden md:table-cell text-center px-3">Alíquota</th><th className="text-right px-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>{servicosFiltrados.map(s => { const cat = CATEGORIAS_SERVICO.includes(s.categoriaServico) ? s.categoriaServico : CATEGORIAS_SERVICO[0]; const corC = CORES_CATEGORIA_SERVICO[cat] || CORES_CATEGORIA_SERVICO[CATEGORIAS_SERVICO[0]]; const sel = selServicos.has(s.cod); return (
                    <tr key={s.cod} className={`border-b border-slate-200/50 hover:bg-slate-50 ${sel ? 'bg-indigo-900/20' : ''}`}>
                      <td className="px-3"><input type="checkbox" checked={sel} onChange={() => toggleSelServico(s.cod)} className="rounded cursor-pointer" /></td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-400">#{s.cod}</td>
                      <td className="px-3 font-medium">{s.descricao}{s.status === 'INATIVO' && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">INATIVO</span>}</td>
                      <td className="text-center px-3">
                        <select value={cat} onChange={e => atualizarCategoriaServico(s.cod, e.target.value)} className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border cursor-pointer ${corC.bg} ${corC.text} ${corC.border} focus:ring-2 focus:ring-white/30 focus:outline-none`} title="Clique para alterar a categoria">
                          {CATEGORIAS_SERVICO.map(c => <option key={c} value={c} className="bg-white text-slate-900">{c}</option>)}
                        </select>
                      </td>
                      <td className="hidden sm:table-cell px-3"><div className="text-slate-600">{s.cliente}</div><div className="text-xs text-slate-500">{TEMPLATES[s.template]?.nome}</div></td>
                      <td className="hidden md:table-cell text-center px-3 text-xs text-slate-400">{s.franquiaHoras}h / {s.franquiaKm}km</td>
                      <td className="text-right px-3 text-orange-400">{fmt(s.diariaPaga)}</td>
                      <td className="text-right px-3">{fmt(s.valorFatura)}</td>
                      <td className="hidden md:table-cell text-center px-3"><span className={`text-xs font-mono px-2 py-0.5 rounded ${num(s.aliquota) > 0 ? 'bg-amber-500/20 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{num(s.aliquota).toFixed(2)}%</span></td>
                      <td className="text-right px-3"><div className="flex justify-end gap-1">
                        <button onClick={() => setModal({ tipo: 'copiarServico', fonte: s })} className="p-1.5 hover:bg-slate-100 rounded text-slate-400" title="Copiar serviço"><ClipboardList className="w-4 h-4" /></button>
                        <button onClick={() => setModal({ tipo: 'servico', dados: s })} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => setModal({ tipo: 'confirmExcluirServ', dados: s })} className="p-1.5 hover:bg-red-900/40 text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div></td>
                    </tr>
                  ); })}</tbody>
                </table>
              </div>
            </div>
          </div>
          );
        })()}

        {aba === 'resumo' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold">Resumo de Fechamento</h2>
                <p className="text-[11px] sm:text-xs text-slate-400">Visão consolidada por competência. Clique no <span className="text-red-600 font-bold">×</span> de qualquer linha para excluí-la deste resumo e da planilha exportada (não apaga o dado original).</p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input type="month" value={competenciaResumo} onChange={e => setCompetenciaResumo(e.target.value)} className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm min-h-[36px]" />
                {totalExcluidos > 0 && <button onClick={limparExclusoesResumo} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg flex items-center gap-1.5 min-h-[36px]"><RefreshCw className="w-3.5 h-3.5 flex-shrink-0" /><span>Restaurar {totalExcluidos}</span></button>}
                <button onClick={() => exportarResumoFechamentoXLSX(resumoLimpo, competenciaResumo)} disabled={!resumoLimpo} className="bg-emerald-600 hover:bg-emerald-500 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 min-h-[36px]"><Download className="w-4 h-4 flex-shrink-0" /><span>Exportar XLSX</span></button>
                <button onClick={() => setModal({ tipo: 'resumoPDF' })} disabled={!resumoLimpo} className="bg-rose-600 hover:bg-rose-500 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 min-h-[36px]"><Printer className="w-4 h-4 flex-shrink-0" /><span>Gerar PDF</span></button>
                <button onClick={() => setModal({ tipo: 'salvarResumo' })} disabled={!resumoLimpo} className="bg-blue-600 hover:bg-blue-500 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 min-h-[36px]"><Save className="w-4 h-4 flex-shrink-0" /><span>Salvar resumo</span></button>
                <button onClick={() => setModal({ tipo: 'carregarResumos' })} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><FolderOpen className="w-4 h-4 flex-shrink-0" /><span>Carregar ({resumosSalvos.length})</span></button>
              </div>
            </div>

            {totalExcluidos > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-xs text-amber-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span><b>{totalExcluidos}</b> registro(s) excluído(s) deste resumo. Os totais e a planilha exportada não consideram essas linhas. Clique em <b>Restaurar</b> para voltar todos.</span>
              </div>
            )}

            {resumoLimpo && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                  <Card title="Faturamento" value={fmt(resumoLimpo.totalFaturamento)} sub={`${resumoLimpo.faturamento.length} linhas`} icon={TrendingUp} cor="from-emerald-500/20 to-emerald-500/5" iconCor="text-emerald-600" />
                  <Card title="Folha" value={fmt(resumoLimpo.totalFolhaPorCategoria)} sub={`${resumoLimpo.folhaPorCategoria.length} categoria(s)`} icon={Wallet} cor="from-amber-500/20 to-amber-500/5" iconCor="text-amber-600" />
                  <Card title="Imposto" value={fmt(resumoLimpo.totalImpostoFat)} sub={resumoLimpo.totalFaturamento > 0 ? `${(resumoLimpo.totalImpostoFat / resumoLimpo.totalFaturamento * 100).toFixed(2)}% efetiva` : '—'} icon={Receipt} cor="from-yellow-500/20 to-yellow-500/5" iconCor="text-yellow-400" />
                  <Card title="Despesas + Parcelas" value={fmt(resumoLimpo.totalFixas + resumoLimpo.totalAvulsas + resumoLimpo.totalParcelamentos)} sub={`Fixas ${fmt(resumoLimpo.totalFixas)} · Av ${fmt(resumoLimpo.totalAvulsas)} · Parc ${fmt(resumoLimpo.totalParcelamentos)}`} icon={TrendingDown} cor="from-red-500/20 to-red-500/5" iconCor="text-red-600" />
                  <Card title="Desp. Chefia" value={fmt(resumoLimpo.totalDespChefia || 0)} sub={`${(resumoLimpo.despesasChefia || []).length} registro(s)`} icon={Briefcase} cor="from-violet-500/20 to-violet-500/5" iconCor="text-violet-400" />
                  <Card title="Adiantamentos" value={fmt(resumoLimpo.totalAdiantamentos)} sub={`${resumoLimpo.adiantamentos.length} vales`} icon={MinusCircle} cor="from-orange-500/20 to-orange-500/5" iconCor="text-orange-400" />
                </div>

                {(() => {
                  // Folha já contém salário fixo (bruto). Adiantamentos não são somados separadamente
                  // pois compõem os vales/descontos do funcionário (saída de caixa intermediária).
                  const custoTotal = resumoLimpo.totalFolhaPorCategoria + resumoLimpo.totalFixas + resumoLimpo.totalAvulsas + resumoLimpo.totalParcelamentos + (resumoLimpo.totalDespChefia || 0);
                  const resultado = resumoLimpo.totalFaturamento - custoTotal - resumoLimpo.totalImpostoFat;
                  return (
                    <div className="bg-emerald-500/10 border-2 border-emerald-500 rounded-xl p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div><div className="text-xs uppercase text-slate-400">Total faturado</div><div className="text-xl font-bold text-emerald-600">{fmt(resumoLimpo.totalFaturamento)}</div></div>
                      <div><div className="text-xs uppercase text-slate-400">(−) Imposto</div><div className="text-xl font-bold text-yellow-400">{fmt(resumoLimpo.totalImpostoFat)}</div></div>
                      <div><div className="text-xs uppercase text-slate-400">(−) Custos</div><div className="text-xl font-bold text-red-600">{fmt(custoTotal)}</div></div>
                      <div><div className="text-xs uppercase text-slate-400">= Resultado</div><div className={`text-xl font-bold ${resultado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(resultado)}</div></div>
                    </div>
                  );
                })()}

                <Painel titulo={`1. Faturamento — ${fmtMes(competenciaResumo)}`}>
                  {resumoFechamento.qtdFaturas === 0 ? (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 text-xs text-amber-300">
                      ⚠ Nenhuma fatura gerada para esta competência. O faturamento considera apenas faturas fechadas. Vá na aba <b>Faturas</b> para gerar.
                    </div>
                  ) : (
                    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded p-2 text-xs text-slate-600 mb-2">
                      Baseado em <b className="text-indigo-600">{resumoFechamento.qtdFaturas}</b> fatura(s) gerada(s): <span className="font-mono text-indigo-600">{resumoFechamento.numerosFaturas.join(', ')}</span>
                    </div>
                  )}
                  {resumoLimpo.faturamento.length === 0 ? null : (() => {
                    // Agrupa NATURA-categorias num único "NATURA COSMÉTICOS" — exibe só por cliente
                    // Usa resumoLimpo para respeitar exclusões com ×
                    const consolidadoMap = {};
                    resumoLimpo.faturamento.forEach(f => {
                      const baseCliente = (f.cliente || '').split(' - ')[0].trim();
                      if (!consolidadoMap[baseCliente]) consolidadoMap[baseCliente] = { cliente: baseCliente, valor: 0, key: `C|${baseCliente}` };
                      consolidadoMap[baseCliente].valor += num(f.valor);
                    });
                    const consolidado = Object.values(consolidadoMap).map(c => ({ ...c, valor: roundMoney(c.valor) })).sort((a, b) => a.cliente.localeCompare(b.cliente));
                    const totalConsolidado = sumMoney(consolidado, c => c.valor);
                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-xs text-slate-400 border-b border-slate-200"><tr><th className="text-left py-2 px-2">Cliente</th><th className="text-right px-2">Valor</th></tr></thead>
                          <tbody>{consolidado.map(c => (
                            <tr key={c.key} className="border-b border-slate-200/50">
                              <td className="py-1.5 px-2 font-medium text-xs">{c.cliente}</td>
                              <td className="text-right px-2 text-emerald-600 font-medium">{fmt(c.valor)}</td>
                            </tr>
                          ))}</tbody>
                          <tfoot className="border-t border-slate-200 font-semibold"><tr><td className="py-2 px-2">TOTAL</td><td className="text-right px-2 text-emerald-600">{fmt(totalConsolidado)}</td></tr></tfoot>
                        </table>
                      </div>
                    );
                  })()}
                </Painel>

                <Painel titulo={`2. Folha por Categoria — ${fmtMes(competenciaResumo)}`}>
                  <div className="text-xs text-slate-500 italic mb-2">Folha consolidada por categoria. Inclui salário fixo dos colaboradores da mesma categoria. Use o <span className="text-red-600 font-bold">×</span> para excluir uma categoria do resumo/export.</div>
                  {resumoFechamento.folhaPorCategoria.length === 0 ? <p className="text-sm text-slate-500 italic">Nenhuma folha nesta competência.</p> : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-xs text-slate-400 border-b border-slate-200"><tr><th className="w-8"></th><th className="text-left py-2 px-2">Categoria</th><th className="text-right px-2">Valor</th></tr></thead>
                        <tbody>{resumoFechamento.folhaPorCategoria.map(g => { const excl = isExclResumo('folhaCategoria', g.key); return (
                          <tr key={g.key} className={`border-b border-slate-200/50 ${excl ? 'opacity-40 line-through' : ''}`}>
                            <td className="px-1"><BotaoXResumo excluido={excl} onClick={() => toggleExclResumo('folhaCategoria', g.key)} /></td>
                            <td className="py-1.5 px-2 font-medium text-blue-600">{g.categoria}</td>
                            <td className="text-right px-2 text-blue-600 font-medium">{fmt(g.total)}</td>
                          </tr>
                        ); })}</tbody>
                        <tfoot className="border-t border-slate-200 font-semibold"><tr><td></td><td className="py-2 px-2">TOTAL{(excluidosResumo.folhaCategoria || []).length > 0 ? ' (limpo)' : ''}</td><td className="text-right px-2 text-blue-600">{fmt(resumoLimpo.totalFolhaPorCategoria)}</td></tr></tfoot>
                      </table>
                    </div>
                  )}
                </Painel>

                <Painel titulo={`3. Adiantamentos / Vales — ${fmtMes(competenciaResumo)}`}>
                  {resumoFechamento.adiantamentos.length === 0 ? <p className="text-sm text-slate-500 italic">Nenhum adiantamento na competência.</p> : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-xs text-slate-400 border-b border-slate-200"><tr><th className="w-8"></th><th className="text-left py-2 px-2">Beneficiário</th><th className="text-left px-2">Tipo</th><th className="text-center px-2">Parcela</th><th className="text-right px-2">Valor</th><th className="text-left px-2">Forma de Pagamento</th></tr></thead>
                        <tbody>{resumoFechamento.adiantamentos.map((a, i) => { const excl = isExclResumo('adiantamentos', a.id); return (
                          <tr key={a.id || i} className={`border-b border-slate-200/50 ${excl ? 'opacity-40 line-through' : ''}`}>
                            <td className="px-1"><BotaoXResumo excluido={excl} onClick={() => toggleExclResumo('adiantamentos', a.id)} /></td>
                            <td className="py-1.5 px-2 font-medium">{a.alvoNome}</td>
                            <td className="px-2 text-xs">{a.tipo === 'PARCELA' ? 'PARCELA' : (a.tipoVale || 'VALE')}</td>
                            <td className="text-center px-2 text-[10px] text-slate-400">{a.tipo === 'PARCELA' && a.parcelaAtual && a.parcelaTotal ? `${a.parcelaAtual}/${a.parcelaTotal}` : '—'}</td>
                            <td className="text-right px-2 text-orange-400 font-medium">{fmt(a.valor)}</td>
                            <td className="px-2 text-xs text-slate-400">{a.formaPagamento || '—'}</td>
                          </tr>
                        ); })}</tbody>
                        <tfoot className="border-t border-slate-200 font-semibold"><tr><td></td><td colSpan={3} className="py-2 px-2">TOTAL{(excluidosResumo.adiantamentos || []).length > 0 ? ' (limpo)' : ''}</td><td className="text-right px-2 text-orange-400">{fmt(resumoLimpo.totalAdiantamentos)}</td><td></td></tr></tfoot>
                      </table>
                    </div>
                  )}
                </Painel>

                <div className="grid lg:grid-cols-3 gap-3">
                  <Painel titulo={`4. Despesas Fixas (${fmt(resumoLimpo.totalFixas)})`}>
                    {resumoFechamento.despesasFixas.length === 0 ? <p className="text-sm text-slate-500 italic">Nenhuma despesa fixa.</p> : (
                      <table className="w-full text-xs">
                        <tbody>{resumoFechamento.despesasFixas.map(d => { const excl = isExclResumo('fixas', d.id); return (
                          <tr key={d.id} className={`border-b border-slate-200/50 ${excl ? 'opacity-40 line-through' : ''}`}>
                            <td className="px-1 w-7"><BotaoXResumo excluido={excl} onClick={() => toggleExclResumo('fixas', d.id)} /></td>
                            <td className="py-1.5 px-2 font-medium">{d.descricao}</td>
                            <td className="text-right px-2 text-red-600">{fmt(d.valor)}</td>
                            <td className="px-2 text-slate-500 text-[10px]">{d.origem || '—'}</td>
                          </tr>
                        ); })}</tbody>
                      </table>
                    )}
                  </Painel>
                  <Painel titulo={`5. Despesas Avulsas (${fmt(resumoLimpo.totalAvulsas)})`}>
                    {resumoFechamento.despesasAvulsas.length === 0 ? <p className="text-sm text-slate-500 italic">Nenhuma despesa avulsa.</p> : (
                      <table className="w-full text-xs">
                        <tbody>{resumoFechamento.despesasAvulsas.map(d => { const excl = isExclResumo('avulsas', d.id); return (
                          <tr key={d.id} className={`border-b border-slate-200/50 ${excl ? 'opacity-40 line-through' : ''}`}>
                            <td className="px-1 w-7"><BotaoXResumo excluido={excl} onClick={() => toggleExclResumo('avulsas', d.id)} /></td>
                            <td className="py-1.5 px-2 font-medium">{d.descricao}</td>
                            <td className="text-right px-2 text-red-600">{fmt(d.valor)}</td>
                            <td className="px-2 text-slate-500 text-[10px]">{d.origem || '—'}</td>
                          </tr>
                        ); })}</tbody>
                      </table>
                    )}
                  </Painel>
                  <Painel titulo={`6. Parcelamentos (${fmt(resumoLimpo.totalParcelamentos)})`}>
                    {resumoFechamento.parcelamentos.length === 0 ? <p className="text-sm text-slate-500 italic">Nenhum parcelamento.</p> : (
                      <table className="w-full text-xs">
                        <tbody>{resumoFechamento.parcelamentos.map(d => { const excl = isExclResumo('parcelamentos', d.id); return (
                          <tr key={d.id} className={`border-b border-slate-200/50 ${excl ? 'opacity-40 line-through' : ''}`}>
                            <td className="px-1 w-7"><BotaoXResumo excluido={excl} onClick={() => toggleExclResumo('parcelamentos', d.id)} /></td>
                            <td className="py-1.5 px-2 font-medium">{d.descricao}</td>
                            <td className="text-right px-2 text-red-600">{fmt(d.valor)}</td>
                            <td className="px-2 text-slate-500 text-[10px]">{d.origem || '—'}</td>
                          </tr>
                        ); })}</tbody>
                      </table>
                    )}
                  </Painel>
                </div>

                <Painel titulo={`7. Despesas da Chefia (${fmt(resumoLimpo.totalDespChefia || 0)})`}>
                  {(resumoFechamento.despesasChefia || []).length === 0 ? <p className="text-sm text-slate-500 italic">Nenhuma despesa da chefia nesta competência.</p> : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="text-xs text-slate-400 border-b border-slate-200"><tr><th className="w-8"></th><th className="text-left py-2 px-2">Lançamento</th><th className="text-center px-2">Tipo</th><th className="text-center px-2">Parcela</th><th className="text-center px-2">Origem</th><th className="text-right px-2">Valor</th></tr></thead>
                        <tbody>{resumoFechamento.despesasChefia.map(d => { const excl = isExclResumo('despChefia', d.id); return (
                          <tr key={d.id} className={`border-b border-slate-200/50 ${excl ? 'opacity-40 line-through' : ''}`}>
                            <td className="px-1 w-7"><BotaoXResumo excluido={excl} onClick={() => toggleExclResumo('despChefia', d.id)} /></td>
                            <td className="py-1.5 px-2 font-medium">{d.descricao}</td>
                            <td className="text-center px-2"><span className={`text-[10px] px-1.5 py-0.5 rounded-full ${d.tipo === 'FIXA' ? 'bg-blue-500/20 text-blue-600' : d.tipo === 'PARCELA' ? 'bg-purple-500/20 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>{d.tipo === 'PARCELA' ? 'PARCELA' : (d.tipo || 'AVULSA')}</span></td>
                            <td className="text-center px-2 text-[10px] text-slate-400">{d.tipo === 'PARCELA' && d.parcelaAtual && d.parcelaTotal ? `${d.parcelaAtual}/${d.parcelaTotal}` : '—'}</td>
                            <td className="text-center px-2"><span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${d.origem === 'MANHÃES' ? 'bg-emerald-500/20 text-emerald-700' : 'bg-blue-500/20 text-blue-600'}`}>{d.origem || 'MANHÃES'}</span></td>
                            <td className="text-right px-2 text-violet-400 font-medium">{fmt(d.valor)}</td>
                          </tr>
                        ); })}</tbody>
                        <tfoot className="border-t border-slate-200 font-semibold"><tr><td></td><td colSpan={4} className="py-2 px-2">TOTAL{(excluidosResumo.despChefia || []).length > 0 ? ' (limpo)' : ''}</td><td className="text-right px-2 text-violet-400">{fmt(resumoLimpo.totalDespChefia || 0)}</td></tr></tfoot>
                      </table>
                    </div>
                  )}
                </Painel>

                {/* v99 — Painel 8: Parcelamentos consolidados (despesas + chefia + vales). Informativo. */}
                <Painel titulo={`8. Parcelamentos — visão geral (${fmt(resumoLimpo.totalParcelamentosTodos || 0)})`}>
                  <div className="text-xs text-slate-500 italic mb-2">
                    Inclui despesas operacionais, despesas da chefia e vales parceladas desta competência. Painel informativo — os valores já estão somados em seus blocos de origem.
                    <span className="block mt-1">Despesa: <b className="text-red-300">{fmt(resumoLimpo.totalParcelasDespesa || 0)}</b> · Chefia: <b className="text-violet-600">{fmt(resumoLimpo.totalParcelasChefia || 0)}</b> · Vale: <b className="text-amber-300">{fmt(resumoLimpo.totalParcelasVale || 0)}</b></span>
                  </div>
                  {(resumoFechamento.parcelamentosTodos || []).length === 0 ? <p className="text-sm text-slate-500 italic">Nenhum parcelamento ativo nesta competência.</p> : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="text-xs text-slate-400 border-b border-slate-200">
                          <tr>
                            <th className="w-8"></th>
                            <th className="text-center px-2">Origem</th>
                            <th className="text-left py-2 px-2">Descrição / Beneficiário</th>
                            <th className="text-center px-2">Parcela</th>
                            <th className="text-left px-2">Categoria</th>
                            <th className="text-right px-2">Valor</th>
                          </tr>
                        </thead>
                        <tbody>{(resumoFechamento.parcelamentosTodos || []).map(p => { const excl = isExclResumo('parcelamentosTodos', p.key); return (
                          <tr key={p.key} className={`border-b border-slate-200/50 ${excl ? 'opacity-40 line-through' : ''}`}>
                            <td className="px-1 w-7"><BotaoXResumo excluido={excl} onClick={() => toggleExclResumo('parcelamentosTodos', p.key)} /></td>
                            <td className="text-center px-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${p._origem === 'Despesa' ? 'bg-red-500/20 text-red-700' : p._origem === 'Chefia' ? 'bg-violet-500/20 text-violet-600' : 'bg-amber-500/20 text-amber-700'}`}>{p._origem}</span>
                            </td>
                            <td className="py-1.5 px-2 font-medium">{p.descricao}</td>
                            <td className="text-center px-2 font-mono text-[11px]">{p.atual && p.total ? `${p.atual}/${p.total}` : '—'}</td>
                            <td className="px-2 text-slate-500 text-[10px]">{p.origem || '—'}</td>
                            <td className="text-right px-2 font-medium">{fmt(p.valor)}</td>
                          </tr>
                        ); })}</tbody>
                        <tfoot className="border-t border-slate-200 font-semibold">
                          <tr><td></td><td colSpan={4} className="py-2 px-2">TOTAL{(excluidosResumo.parcelamentosTodos || []).length > 0 ? ' (limpo)' : ''}</td><td className="text-right px-2">{fmt(resumoLimpo.totalParcelamentosTodos || 0)}</td></tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </Painel>

                {(() => {
                  // Relatório Gerencial — Despesas (consolidado)
                  const totalFolha = num(resumoLimpo.totalFolhaPorCategoria);
                  const totalVales = num(resumoLimpo.totalAdiantamentos);
                  const folhaLiquida = roundMoney(totalFolha - totalVales);

                  const todasOperacionais = [
                    ...(resumoLimpo.despesasFixas || []),
                    ...(resumoLimpo.despesasAvulsas || []),
                    ...(resumoLimpo.parcelamentos || []),
                  ];
                  // normalizar() já remove acentos + uppercase; necessário porque "MANHÃES".includes("MANHA") === false
                  const totalCartaoEmpresa = sumMoney(todasOperacionais.filter(d => ['CARTAO CORPORATIVO', 'EMPRESA'].includes(normalizar(d.origem))), d => d.valor);
                  // Galop: despesas avulsas com origem GALOP
                  const totalGalop = sumMoney((resumoLimpo.despesasAvulsas || []).filter(d => normalizar(d.origem).includes('GALOP')), d => d.valor);
                  // Despesas Manhães/Ricardo: somente do painel "Despesas da Chefia" (despChefia)
                  // normalizar('MANHÃES') = 'MANHAES'; comparar com === após normalizar ambos os lados
                  const totalManhaes = sumMoney((resumoLimpo.despesasChefia || []).filter(d => normalizar(d.origem) === normalizar('MANHÃES')), d => d.valor);
                  const totalRicardo = sumMoney((resumoLimpo.despesasChefia || []).filter(d => normalizar(d.origem) === 'RICARDO'), d => d.valor);

                  const totalGeral = roundMoney(folhaLiquida + totalCartaoEmpresa + totalGalop + totalManhaes + totalRicardo);

                  return (
                    <Painel titulo="Relatório Gerencial — Despesas">
                      <div className="text-xs text-slate-500 italic mb-3">Demonstrativo consolidado para pagamento da competência. Folha líquida (folha − vales) + despesas operacionais por origem + reembolso da chefia.</div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <tbody>
                            <tr className="border-b border-slate-200">
                              <td className="py-2 px-3 text-slate-600">Folha total (bruto)</td>
                              <td className="text-right px-3 font-medium text-blue-600">{fmt(totalFolha)}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-2 px-3 text-slate-400 pl-6">(−) Vales / Adiantamentos</td>
                              <td className="text-right px-3 text-red-600">−{fmt(totalVales)}</td>
                            </tr>
                            <tr className="border-b-2 border-slate-200 bg-slate-50">
                              <td className="py-2 px-3 font-semibold text-slate-700">= Folha líquida a pagar</td>
                              <td className="text-right px-3 font-bold text-amber-300">{fmt(folhaLiquida)}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-2 px-3 text-slate-600">(+) Despesas do mês</td>
                              <td className="text-right px-3 font-medium text-orange-600">{fmt(totalCartaoEmpresa)}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-2 px-3 text-slate-600">(+) Galop (combustível)</td>
                              <td className="text-right px-3 font-medium text-orange-600">{fmt(totalGalop)}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-2 px-3 text-slate-600">(+) Despesas Manhães</td>
                              <td className="text-right px-3 font-medium text-violet-600">{fmt(totalManhaes)}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-2 px-3 text-slate-600">(+) Despesas Ricardo</td>
                              <td className="text-right px-3 font-medium text-violet-600">{fmt(totalRicardo)}</td>
                            </tr>
                            <tr className="bg-emerald-500/10 border-2 border-emerald-500">
                              <td className="py-3 px-3 font-bold text-emerald-700 uppercase">TOTAL GERAL A PAGAR</td>
                              <td className="text-right px-3 text-xl font-bold text-emerald-300">{fmt(totalGeral)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </Painel>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {aba === 'fechamentos' && (() => {
          // Faturas abertas (sem fechamento correspondente) + todos os fechamentos
          const itensAbertos = faturas
            .filter(fa => !fechamentos.find(fc => fc.cliente === fa.cliente && fc.periodo === fa.periodo && !fc.dataInicio))
            .map(fa => ({ tipo: 'aberta', cliente: fa.cliente, periodo: fa.periodo, template: fa.template, totalFatura: fa.totalFatura, totalPago: fa.totalPago, lucro: fa.lucro, qtdLancamentos: fa.qtd, fatura: fa, key: `A|${fa.cliente}|${fa.periodo}` }));
          const itensFechados = fechamentos.map(fc => ({ tipo: 'fechada', cliente: fc.cliente, periodo: fc.periodo, template: fc.template, totalFatura: fc.totalFatura, totalPago: fc.totalPago, lucro: fc.lucro, qtdLancamentos: fc.qtdLancamentos, fechamento: fc, key: `F|${fc.id}` }));
          const todosItens = [...itensFechados, ...itensAbertos]
            .filter(i => !filtroCliente || i.cliente === filtroCliente)
            .filter(i => {
              if (!filtroStatus) return true;
              if (filtroStatus === '__abertas') return i.tipo === 'aberta';
              return i.tipo === 'fechada' && (i.fechamento.statusFatura || 'Enviada') === filtroStatus;
            })
            .sort((a, b) => b.periodo.localeCompare(a.periodo) || a.cliente.localeCompare(b.cliente));

          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold">Faturas</h2>
                  <p className="text-[11px] sm:text-xs text-slate-400">Faturas abertas e fechadas. Próximo número: <b className="text-indigo-600">{fmtNumeroFatura(proximoNumeroFatura())}</b></p>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
                  <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm min-h-[36px] flex-1 sm:flex-initial min-w-[140px]"><option value="">Todos clientes</option>{clientesUnicos.map(c => <option key={c} value={c}>{c}</option>)}</select>
                  <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm min-h-[36px] flex-1 sm:flex-initial min-w-[140px]">
                    <option value="">Todos status</option>
                    <option value="__abertas">Apenas abertas</option>
                    {STATUS_FATURA.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={() => setModal({ tipo: 'historicoEmail' })} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Mail className="w-4 h-4 flex-shrink-0" /><span>Histórico envios</span></button>
                  <button onClick={() => setModal({ tipo: 'importarXMLNF' })} className="bg-purple-600 hover:bg-purple-500 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><FileCheck className="w-4 h-4 flex-shrink-0" /><span>Importar XML NF-e</span></button>
                  <button onClick={() => setModal({ tipo: 'faturaIntervalo' })} className="bg-indigo-600 hover:bg-indigo-500 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Calendar className="w-4 h-4 flex-shrink-0" /><span>Gerar por intervalo</span></button>
                </div>
              </div>

              {/* Resumo por status (inclui Abertas) */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                <button onClick={() => setFiltroStatus(filtroStatus === '__abertas' ? '' : '__abertas')} className={`text-left bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 hover:opacity-80 ${filtroStatus === '__abertas' ? 'ring-2 ring-white/30' : ''}`}>
                  <div className="text-[10px] uppercase text-amber-300 font-semibold">Abertas</div>
                  <div className="text-base font-bold">{itensAbertos.length}</div>
                  <div className="text-[10px] text-slate-400">{fmt(itensAbertos.reduce((s, i) => s + num(i.totalFatura), 0))}</div>
                </button>
                {STATUS_FATURA.map(s => {
                  const list = fechamentos.filter(f => (f.statusFatura || 'Enviada') === s);
                  const total = list.reduce((sum, f) => sum + num(f.totalFatura), 0);
                  const c = CORES_STATUS_FATURA[s];
                  return (
                    <button key={s} onClick={() => setFiltroStatus(filtroStatus === s ? '' : s)} className={`text-left ${c.bg} border ${c.border} rounded-lg p-2 hover:opacity-80 ${filtroStatus === s ? 'ring-2 ring-white/30' : ''}`}>
                      <div className={`text-[10px] uppercase ${c.text} font-semibold`}>{s}</div>
                      <div className="text-base font-bold">{list.length}</div>
                      <div className="text-[10px] text-slate-400">{fmt(total)}</div>
                    </button>
                  );
                })}
              </div>

              {todosItens.length === 0 ? <div className="bg-white border border-slate-200 rounded-xl p-12 text-center"><p className="text-slate-400">Nenhum item encontrado com os filtros aplicados.</p></div> : (
                <div className="space-y-2">{todosItens.map(item => {
                  const t = TEMPLATES[item.template];
                  if (item.tipo === 'aberta') {
                    return (
                      <div key={item.key} className="bg-amber-50/30 border border-amber-500/30 rounded-lg p-3">
                        <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-amber-500/20 text-amber-300 border-amber-500/40">Aberta</span>
                              <span className="font-semibold">{item.cliente}</span>
                              <span className="text-xs text-slate-400">· {t?.nome || item.template}</span>
                            </div>
                            <div className="text-xs text-slate-500">{fmtPeriodo(item.periodo, t)}</div>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            <button onClick={() => setModal({ tipo: 'detalheFatura', dados: item.fatura })} className="text-xs bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 rounded flex items-center gap-1"><Eye className="w-3.5 h-3.5" />Ver</button>
                            <button onClick={() => setModal({ tipo: 'confirmFechar', dados: item.fatura })} className="text-xs bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 rounded flex items-center gap-1"><Lock className="w-3.5 h-3.5" />Fechar</button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs"><Stat label="Lanç." valor={item.qtdLancamentos} /><Stat label="Faturado" valor={fmt(item.totalFatura)} /><Stat label="Pago" valor={fmt(item.totalPago)} cor="text-orange-400" /><Stat label="Lucro" valor={fmt(item.lucro)} cor="text-emerald-600" /></div>
                      </div>
                    );
                  }
                  // fechada
                  const f = item.fechamento;
                  const st = f.statusFatura || 'Enviada';
                  const cor = CORES_STATUS_FATURA[st] || CORES_STATUS_FATURA.Enviada;
                  const venc = f.dataVencimento;
                  const hojeStr = hoje();
                  const vencido = venc && venc < hojeStr && st !== 'Paga';
                  return (
                    <div key={item.key} className={`bg-white border ${vencido && st !== 'Vencida' ? 'border-red-500/40' : 'border-slate-800'} rounded-lg p-3`}>
                      <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Lock className="w-4 h-4 text-emerald-600" />
                            {f.numeroFmt && <span className="font-mono text-sm bg-indigo-500/20 text-indigo-600 px-2 py-0.5 rounded">{f.numeroFmt}</span>}
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${cor.bg} ${cor.text} ${cor.border}`}>{st}</span>
                            {f.nfNumero && <span className="text-[10px] font-mono font-semibold bg-purple-500/20 text-purple-600 border border-purple-500/40 px-2 py-0.5 rounded">NF {f.nfNumero}</span>}
                            {f.empresaFaturante && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{f.empresaFaturante}</span>}
                            {vencido && st !== 'Vencida' && <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-red-500/20 text-red-300 border-red-500/40">⚠ Em atraso</span>}
                            <span className="font-semibold">{f.cliente}</span>
                            <button onClick={() => setModal({ tipo: 'editarClienteFatura', fechId: f.id, clienteAtual: f.cliente })} title="Editar cliente" className="text-slate-600 hover:text-indigo-400 transition"><Pencil className="w-3 h-3" /></button>
                            <span className="text-xs text-slate-400">· {t?.nome}</span>
                            {f.custom && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-600">CUSTOM</span>}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                            <span>{f.dataInicio && f.dataFim ? `${fmtData(f.dataInicio)} → ${fmtData(f.dataFim)}` : fmtPeriodo(f.periodo, t)}</span>
                            <button onClick={() => setModal({ tipo: 'editarCompetenciaFatura', fechId: f.id, periodoAtual: f.periodo })} title="Editar competência" className="text-slate-600 hover:text-indigo-400 transition flex-shrink-0"><Pencil className="w-3 h-3" /></button>
                            <span>· Fechado em {new Date(f.dataFechamento).toLocaleDateString('pt-BR')}</span>
                            {venc && <span>· Venc: <b className={vencido ? 'text-red-600' : 'text-slate-600'}>{fmtData(venc)}</b></span>}
                            {f.dataPagamento && <span>· Pago em {fmtData(f.dataPagamento)}</span>}
                            {f.enviadoEm && <span className="text-blue-600">· Enviado em {new Date(f.enviadoEm).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <select value={st} onChange={e => { const novo = e.target.value; if (novo === 'NF-emitida') { setModal({ tipo: 'informarNF', fechId: f.id }); } else { atualizarStatusFatura(f.id, novo); } }} className={`text-xs ${cor.bg} ${cor.text} border ${cor.border} rounded px-2 py-1 font-semibold`}>
                            {STATUS_FATURA.map(s => <option key={s} value={s} className="bg-white text-slate-900">{s}</option>)}
                          </select>
                          <input type="date" value={venc || ''} onChange={e => atualizarStatusFatura(f.id, st, e.target.value)} title="Data de vencimento" className="text-xs bg-white border border-slate-200 rounded px-2 py-1" />
                          <button onClick={() => { const fa = faturas.find(x => x.cliente === f.cliente && x.periodo === f.periodo && !f.custom); setModal({ tipo: 'detalheFatura', dados: fa || f }); }} title="Ver detalhes" className="text-xs bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 rounded flex items-center gap-1"><Eye className="w-3.5 h-3.5" />Ver</button>
                          <button onClick={() => { const cli = clientes.find(c => c.nome === f.cliente); setModal({ tipo: 'enviarMedicao', fechamento: f, emailsCobranca: cli?.emailsCobranca || [] }); }} title="Enviar medição por e-mail" className="text-xs bg-blue-600 hover:bg-blue-500 px-2.5 py-1 rounded flex items-center gap-1"><Send className="w-3.5 h-3.5" />Enviar</button>
                          <button onClick={() => setModal({ tipo: 'confirmReabrir', dados: f })} className="text-xs bg-amber-700 hover:bg-amber-600 px-2.5 py-1 rounded">Reabrir</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs"><Stat label="Lanç." valor={f.qtdLancamentos} /><Stat label="Faturado" valor={fmt(f.totalFatura)} /><Stat label="Pago" valor={fmt(f.totalPago)} cor="text-orange-400" /><Stat label="Lucro" valor={fmt(f.lucro)} cor="text-emerald-600" /></div>
                    </div>
                  );
                })}</div>
              )}
            </div>
          );
        })()}

        {aba === 'propostas' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2"><FileSignature className="w-5 h-5 text-indigo-400 flex-shrink-0" /><span className="truncate">Propostas Comerciais</span></h2>
                <p className="text-[11px] sm:text-xs text-slate-400">Orçamentos enviados a potenciais clientes. Após aceite virtual, podem virar serviços do catálogo.</p>
              </div>
              <div className="flex gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
                <button onClick={() => carregarPropostas({ status: filtroStatusProposta, categoria: filtroCategoriaProposta, q: buscaProposta })} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><RefreshCw className="w-4 h-4 flex-shrink-0" /><span>Atualizar</span></button>
                <button onClick={() => setModal({ tipo: 'proposta', dados: null })} className="bg-indigo-600 hover:bg-indigo-500 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 min-h-[36px]"><Plus className="w-4 h-4 flex-shrink-0" /><span>Nova proposta</span></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] text-slate-400 uppercase">Status</label>
                <select value={filtroStatusProposta} onChange={e => setFiltroStatusProposta(e.target.value)} className="bg-white border border-slate-200 rounded px-2 py-1.5 text-xs min-h-[36px]">
                  <option value="todos">Todos</option>
                  <option value="Criada">Criada</option>
                  <option value="Enviada">Enviada</option>
                  <option value="Em análise">Em análise</option>
                  <option value="Aceita">Aceita</option>
                  <option value="Rejeitada">Rejeitada</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] text-slate-400 uppercase">Categoria</label>
                <select value={filtroCategoriaProposta} onChange={e => setFiltroCategoriaProposta(e.target.value)} className="bg-white border border-slate-200 rounded px-2 py-1.5 text-xs min-h-[36px]">
                  <option value="">Todas</option>
                  <option value="ESCOLTA">ESCOLTA</option>
                  <option value="FACILITIES">FACILITIES</option>
                  <option value="EVENTOS">EVENTOS</option>
                  <option value="OUTROS">OUTROS</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <input value={buscaProposta} onChange={e => setBuscaProposta(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') carregarPropostas({ status: filtroStatusProposta, categoria: filtroCategoriaProposta, q: buscaProposta }); }} placeholder="Número, cliente ou CNPJ..." className="flex-1 bg-white border border-slate-200 rounded px-2 py-1.5 text-xs min-h-[36px]" />
              </div>
            </div>
            {selPropostas.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                <span className="text-xs font-semibold text-indigo-700">{selPropostas.size} selecionada(s)</span>
                <div className="w-px h-4 bg-indigo-200" />
                <button
                  onClick={() => duplicarPropostasMassa([...selPropostas])}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1.5 min-h-[32px]"
                ><Copy className="w-3.5 h-3.5" />Duplicar</button>
                <button
                  onClick={() => rejeitarPropostasMassa([...selPropostas])}
                  className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1.5 min-h-[32px]"
                ><XCircle className="w-3.5 h-3.5" />Rejeitar</button>
                <button
                  onClick={() => arquivarPropostasMassa([...selPropostas])}
                  className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1.5 min-h-[32px]"
                ><Trash2 className="w-3.5 h-3.5" />Arquivar</button>
                <button onClick={() => setSelPropostas(new Set())} title="Limpar seleção" className="text-slate-400 hover:text-slate-900 p-1.5 rounded hover:bg-slate-100"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
            {loadingPropostas ? (
              <div className="text-center text-slate-400 text-sm py-8">Carregando propostas...</div>
            ) : propostas.length === 0 ? (
              <div className="text-center text-slate-500 text-sm py-12 bg-white border border-slate-200 rounded-xl">
                Nenhuma proposta encontrada. Clique em <b>Nova proposta</b> para criar a primeira.
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-slate-400 bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-3 w-8">
                          <input
                            type="checkbox"
                            checked={propostas.length > 0 && propostas.every(p => selPropostas.has(p.id))}
                            onChange={e => setSelPropostas(e.target.checked ? new Set(propostas.map(p => p.id)) : new Set())}
                            className="cursor-pointer"
                            title="Selecionar todas"
                          />
                        </th>
                        <th className="text-left py-3 px-3">Nº</th>
                        <th className="text-left px-3">Cliente</th>
                        <th className="text-left px-3">Cat.</th>
                        <th className="text-left px-3">Status</th>
                        <th className="text-right px-3">Valor</th>
                        <th className="hidden sm:table-cell text-left px-3">Itens</th>
                        <th className="hidden lg:table-cell text-left px-3">Criada</th>
                        <th className="text-right px-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {propostas.map(p => {
                        const stCor = p.status === 'Aceita' ? 'bg-emerald-500/20 text-emerald-700'
                          : p.status === 'Rejeitada' ? 'bg-red-500/20 text-red-700'
                          : p.status === 'Enviada' ? 'bg-blue-500/20 text-blue-600'
                          : p.status === 'Em análise' ? 'bg-amber-500/20 text-amber-700'
                          : 'bg-slate-100 text-slate-600';
                        const podeEditar = !['Aceita', 'Rejeitada'].includes(p.status);
                        const podeEnviar = !['Aceita', 'Rejeitada'].includes(p.status);
                        const podeAceitar = !['Aceita', 'Rejeitada'].includes(p.status);
                        const podeCriarServicos = p.status === 'Aceita';
                        return (
                          <tr key={p.id} className={`border-b border-slate-200/50 hover:bg-slate-50 ${selPropostas.has(p.id) ? 'bg-indigo-50' : ''}`}>
                            <td className="px-3">
                              <input
                                type="checkbox"
                                checked={selPropostas.has(p.id)}
                                onChange={() => setSelPropostas(prev => { const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })}
                                className="cursor-pointer"
                              />
                            </td>
                            <td className="px-3 font-mono text-xs whitespace-nowrap">{p.numero_formatado}</td>
                            <td className="px-3 font-medium">
                              <div className="truncate max-w-[200px]" title={p.cliente_razao || p.cliente_nome}>{p.cliente_razao || p.cliente_nome || '—'}</div>
                              <div className="text-[10px] text-slate-500">{p.cliente_cnpj}</div>
                            </td>
                            <td className="px-3">{(() => { const catCor = p.categoria === 'ESCOLTA' ? 'bg-purple-500/20 text-purple-700 border-purple-500/30' : p.categoria === 'FACILITIES' ? 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30' : p.categoria === 'EVENTOS' ? 'bg-sky-500/20 text-sky-700 border-sky-500/30' : 'bg-amber-500/20 text-amber-700 border-amber-500/30'; return <span className={`text-[10px] px-2 py-0.5 rounded-full border ${catCor}`}>{p.categoria || '—'}</span>; })()}</td>
                            <td className="px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${stCor}`}>{p.status}</span></td>
                            <td className="text-right px-3 text-indigo-600 font-semibold">{fmt(p.valor_total)}</td>
                            <td className="hidden sm:table-cell px-3 text-xs text-slate-400">{p.qtd_itens}</td>
                            <td className="hidden lg:table-cell px-3 text-xs text-slate-500 whitespace-nowrap">{p.criado_em ? new Date(p.criado_em).toLocaleDateString('pt-BR') : '—'}</td>
                            <td className="text-right px-3">
                              <div className="flex justify-end gap-0.5 flex-wrap">
                                <button onClick={() => abrirPropostaComItens(p)} title={podeEditar ? 'Editar' : 'Ver (somente leitura)'} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => duplicarProposta(p)} title="Duplicar proposta" className="p-1.5 hover:bg-indigo-900/40 text-indigo-500 rounded"><Copy className="w-4 h-4" /></button>
                                {podeEnviar && (
                                  <button onClick={() => enviarProposta(p)} title="Enviar por e-mail (gera link de aceite)" className="p-1.5 hover:bg-blue-900/40 text-blue-600 rounded"><Send className="w-4 h-4" /></button>
                                )}
                                {podeAceitar && (
                                  <button onClick={() => { if (window.confirm(`Marcar proposta ${p.numero_formatado} como ACEITA manualmente? (registro de aceite presencial)`)) alterarStatusProposta(p, 'Aceita'); }} title="Aceitar manualmente (admin)" className="p-1.5 hover:bg-emerald-900/40 text-emerald-600 rounded"><CheckCircle className="w-4 h-4" /></button>
                                )}
                                {podeAceitar && (
                                  <button onClick={() => { const m = window.prompt('Motivo da rejeição (opcional):', ''); if (m !== null) alterarStatusProposta(p, 'Rejeitada', m); }} title="Rejeitar" className="p-1.5 hover:bg-red-900/40 text-red-600 rounded"><XCircle className="w-4 h-4" /></button>
                                )}
                                {podeCriarServicos && (
                                  <button onClick={() => setModal({ tipo: 'criarServicosProposta', dados: p })} title="Criar serviços a partir desta proposta" className="p-1.5 hover:bg-indigo-900/40 text-indigo-400 rounded"><Package className="w-4 h-4" /></button>
                                )}
                                <button onClick={() => gerarPropostaPDF(p)} title="Gerar PDF" className="p-1.5 hover:bg-rose-900/40 text-rose-400 rounded"><Printer className="w-4 h-4" /></button>
                                <button onClick={() => setModal({ tipo: 'faturaDeProposta', proposta: p })} title="Gerar Fatura a partir desta proposta" className="p-1.5 hover:bg-amber-900/40 text-amber-600 rounded"><Receipt className="w-4 h-4" /></button>
                                {!p.cliente_id && <button onClick={() => setModal({ tipo: 'cliente', dados: { nome: p.cliente_nome || '', razaoSocial: p.cliente_nome || '', cnpj: p.cliente_cnpj || '', email: p.cliente_email || '' } })} title="Adicionar ao cadastro de clientes" className="p-1.5 hover:bg-teal-900/40 text-teal-400 rounded"><UserPlus className="w-4 h-4" /></button>}
                                <button onClick={() => excluirProposta(p)} title="Arquivar (Rejeitada)" className="p-1.5 hover:bg-slate-100 text-slate-400 rounded"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </main>
      </div>

      {toast && <div className={`fixed bottom-2 sm:bottom-6 left-2 right-2 sm:left-auto sm:right-6 sm:max-w-sm px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-2xl z-50 flex items-center gap-2 text-xs sm:text-sm font-medium print:hidden ${toast.tipo === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>{toast.tipo === 'error' ? <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />}<span className="line-clamp-2">{toast.msg}</span></div>}

      {modal?.tipo === 'importar' && <ModalImportar destino={modal.destino} servicos={servicos} onSaveLanc={importarLancamentos} onSaveDesp={importarDespesas} onSaveDesc={importarDescontos} onClose={() => setModal(null)} />}
      {modal?.tipo === 'importarDespesasXLSX' && <ModalImportarDespesasXLSX onImportar={importarDespesasNovo} onClose={() => setModal(null)} />}
      {modal?.tipo === 'importarDespesasChefia' && <ModalImportarDespesasChefiaXLSX onImportar={importarDespesasChefia} onClose={() => setModal(null)} />}
      {modal?.tipo === 'editarPagoLanc' && <ModalEditarPagoLancamento dados={modal.dados} onSave={salvarPagoLancamento} onClose={() => setModal(null)} />}
      {modal?.tipo === 'lancamento' && <ModalLancamento dados={modal.dados} servicos={servicos} funcionarios={funcionarios} categoriasFolha={categoriasFolha} feriadosExtra={feriadosExtra} onSave={salvarLancamento} onClose={() => setModal(null)} />}
      {modal?.tipo === 'massaLancCompetencia' && <ModalMassaLancCompetencia ids={modal.ids} onSave={(ids, comp) => { atualizarCompetenciaLancamentosMassa(ids, comp); setSelLancs(new Set()); setModal(null); }} onClose={() => setModal(null)} />}
      {modal?.tipo === 'massaLancCatFolha' && <ModalMassaLancCatFolha ids={modal.ids} categorias={modal.categorias} onSave={(ids, cat) => { atualizarCategoriaFolhaLancamentosMassa(ids, cat); setSelLancs(new Set()); setModal(null); }} onClose={() => setModal(null)} />}
      {modal?.tipo === 'massaLancPrestador' && <ModalMassaLancPrestador ids={modal.ids} funcionarios={funcionarios} onSave={(ids, nome, slot) => { atualizarPrestadorLancamentosMassa(ids, nome, slot); setSelLancs(new Set()); setModal(null); }} onClose={() => setModal(null)} />}
      {modal?.tipo === 'transferirCora' && <ModalTransferirCora folhas={modal.folhas} onSucesso={() => { setSelFolhas(new Set()); setModal(null); showToast('Transferências enviadas — aguardando aprovação no app Cora'); /* refresh folhas */ window.storage?.refresh?.('folhas'); }} onClose={() => setModal(null)} />}
      {modal?.tipo === 'historicoCora' && <ModalHistoricoCora onAbrirWebhooks={() => setModal({ tipo: 'webhooksCora' })} onClose={() => setModal(null)} />}
      {modal?.tipo === 'webhooksCora' && <ModalWebhooksCora onVoltar={() => setModal({ tipo: 'historicoCora' })} onClose={() => setModal(null)} />}
      {modal?.tipo === 'resumoPDF' && <ModalResumoPDF resumo={resumoLimpo} competencia={competenciaResumo} onClose={() => setModal(null)} />}
      {modal?.tipo === 'salvarResumo' && <ModalSalvarResumo competencia={competenciaResumo} onSave={(nome) => { salvarResumo(nome); setModal(null); }} onClose={() => setModal(null)} />}
      {modal?.tipo === 'carregarResumos' && <ModalCarregarResumos resumos={resumosSalvos} onVer={(r) => setModal({ tipo: 'visualizarResumo', resumo: r })} onExcluir={excluirResumoSalvo} onClose={() => setModal(null)} />}
      {modal?.tipo === 'visualizarResumo' && <ModalVisualizarResumo resumo={modal.resumo} onClose={() => setModal({ tipo: 'carregarResumos' })} />}
      {modal?.tipo === 'categoriaFolha' && <ModalCategoriaFolha dados={modal.dados} onSave={salvarCategoriaFolha} onClose={() => setModal(null)} />}
      {modal?.tipo === 'gerenciarFeriados' && <ModalGerenciarFeriados feriadosExtra={feriadosExtra} setFeriadosExtra={setFeriadosExtra} onClose={() => setModal(null)} />}
      {modal?.tipo === 'servico' && <ModalServico dados={modal.dados} clientes={clientesUnicos} onSave={salvarServico} onClose={() => setModal(null)} />}
      {modal?.tipo === 'copiarServico' && <ModalCopiarServico servicos={servicos} onSave={s => { salvarServico(s); setModal(null); showToast(`Serviço #${s.cod} criado por cópia`, 'success'); }} onClose={() => setModal(null)} />}
      {modal?.tipo === 'funcionario' && <ModalFuncionario dados={modal.dados} categorias={categoriasUsadas} categoriasFolha={categoriasFolha} onSave={salvarFuncionario} onClose={() => setModal(null)} />}
      {modal?.tipo === 'importarSalariosFixos' && <ModalImportarSalariosFixos funcionariosExistentes={funcionarios} onImportar={importarSalariosFixos} onClose={() => setModal(null)} />}
      {modal?.tipo === 'importarDiariasXLSX' && <ModalImportarDiariasXLSX funcionariosExistentes={funcionarios} onImportar={importarDiariasXLSX} onClose={() => setModal(null)} />}
      {modal?.tipo === 'importarFuncionarios' && <ModalImportarFuncionarios funcionariosExistentes={funcionarios} onImportar={importarFuncionarios} onClose={() => setModal(null)} />}
      {modal?.tipo === 'despesa' && <ModalDespesa dados={modal.dados} onSave={salvarDespesa} onClose={() => setModal(null)} />}
      {modal?.tipo === 'desconto' && <ModalDesconto dados={modal.dados} clientes={clientesUnicos} funcionarios={funcionarios} onSave={salvarDesconto} onClose={() => setModal(null)} />}
      {modal?.tipo === 'proposta' && <ModalProposta dados={modal.dados} clientes={clientes} servicos={servicos} onSave={salvarProposta} onClose={() => setModal(null)} />}
      {modal?.tipo === 'criarServicosProposta' && <ModalCriarServicosDeProposta proposta={modal.dados} clientes={clientes} onCriar={criarServicosDeProposta} onClose={() => setModal(null)} />}
      {modal?.tipo === 'detalheFatura' && <ModalDetalheFatura dados={modal.dados} servicos={servicos} onClose={() => setModal(null)} />}
      {modal?.tipo === 'detalheFolha' && <ModalDetalheFolha dados={modal.dados} onSave={salvarFolha} onProcessar={(folhaProcessada) => setModal({ tipo: 'folhaConsolidadaPDF', folha: folhaProcessada, salarioFixo: folhaProcessada.funcionario.salarioFixo })} onRecibo={(folhaProcessada) => setModal({ tipo: 'reciboPSOPDF', funcionario: folhaProcessada.funcionario, folha: folhaProcessada })} onClose={() => setModal(null)} />}
      {modal?.tipo === 'informarNF' && <ModalInformarNF onConfirmar={(nfNum, nfDt, empresa) => { atualizarStatusFatura(modal.fechId, 'NF-emitida', undefined, nfNum, nfDt, empresa); setModal(null); }} onClose={() => setModal(null)} />}
      {modal?.tipo === 'editarCompetenciaFatura' && <ModalEditarCompetenciaFatura periodoAtual={modal.periodoAtual} onSave={p => atualizarPeriodoFatura(modal.fechId, p)} onClose={() => setModal(null)} />}
      {modal?.tipo === 'editarClienteFatura' && <ModalEditarClienteFatura clienteAtual={modal.clienteAtual} clientes={clientes} onSave={c => atualizarClienteFatura(modal.fechId, c)} onClose={() => setModal(null)} />}
      {modal?.tipo === 'importarXMLNF' && <ModalImportarXMLNF clientes={clientes} onSave={gerarFaturaDeXML} onClose={() => setModal(null)} />}
      {modal?.tipo === 'enviarMedicao' && <ModalEnviarMedicao fechamento={modal.fechamento} lancamentos={lancamentos} servicos={servicos} funcionarios={funcionarios} emailsCobranca={modal.emailsCobranca || []} clientes={clientes} onClose={() => setModal(null)} onEnviar={mostrar => showToast(mostrar.msg, mostrar.tipo)} onEnviadoOk={fechId => setFechamentos(prev => prev.map(f => f.id === fechId ? { ...f, enviadoEm: new Date().toISOString() } : f))} />}
      {modal?.tipo === 'historicoEmail' && <ModalHistoricoEmail onClose={() => setModal(null)} />}
      {modal?.tipo === 'faturaIntervalo' && <ModalFaturaIntervalo clientes={clientesUnicos} servicos={servicos} proximoNumero={fmtNumeroFatura(proximoNumeroFatura())} onSave={gerarFaturaCustom} onClose={() => setModal(null)} />}
      {modal?.tipo === 'fichaFuncPDF' && <ModalFichaFuncionarioPDF funcionario={modal.dados} onClose={() => setModal(null)} />}
      {modal?.tipo === 'escolherCompetReciboPSO' && <ModalEscolherCompetencia funcionario={modal.dados} folhasPorFunc={folhasPorFunc} onSelecionar={folha => setModal({ tipo: 'reciboPSOPDF', funcionario: modal.dados, folha })} onClose={() => setModal(null)} />}
      {modal?.tipo === 'reciboPSOPDF' && <ModalReciboPSOPDF funcionario={modal.funcionario} folha={modal.folha} onClose={() => setModal(null)} />}
      {modal?.tipo === 'folhaConsolidadaPDF' && <ModalFolhaConsolidadaPDF folha={modal.folha} salarioFixo={modal.salarioFixo} onClose={() => setModal(null)} />}
      {modal?.tipo === 'confirmExcluirLanc' && <ModalConfirm titulo="Excluir lançamento?" mensagem={`${modal.dados.descricao} de ${fmtData(modal.dados.data)}`} onConfirm={() => excluirLancamento(modal.dados.id)} onClose={() => setModal(null)} />}
      {modal?.tipo === 'massaFolhaCategoria' && <ModalMassaFolhaCategoria chaves={modal.chaves} grupos={modal.grupos} onSave={(c) => { atualizarCategoriaFolhasMassa(modal.chaves, c); setSelFolhas(new Set()); setModal(null); }} onClose={() => setModal(null)} />}
      {modal?.tipo === 'massaFolhaCompetencia' && <ModalMassaFolhaCompetencia chaves={modal.chaves} onSave={(p) => { atualizarCompetenciaFolhasMassa(modal.chaves, p); setSelFolhas(new Set()); setModal(null); }} onClose={() => setModal(null)} />}
      {modal?.tipo === 'massaLancExcluir' && <ModalConfirm titulo={`Excluir ${modal.ids.length} lançamento${modal.ids.length !== 1 ? 's' : ''}?`} mensagem="Esta ação não pode ser desfeita. Lançamentos fechados já foram excluídos da seleção." onConfirm={() => { setLancamentos(prev => prev.filter(l => !modal.ids.includes(l.id))); setSelLancs(new Set()); showToast(`${modal.ids.length} lançamento(s) excluído(s)`); setModal(null); }} onClose={() => setModal(null)} />}
      {modal?.tipo === 'massaLancStatus' && <ModalMassaLancStatus ids={modal.ids} onSave={(ids, status) => { setLancamentos(prev => prev.map(l => ids.includes(l.id) ? { ...l, status } : l)); setSelLancs(new Set()); showToast(`Status atualizado em ${ids.length} lançamento(s)`); setModal(null); }} onClose={() => setModal(null)} />}
      {modal?.tipo === 'massaLancData' && <ModalMassaLancData ids={modal.ids} onSave={(ids, data) => { setLancamentos(prev => prev.map(l => ids.includes(l.id) ? { ...l, data } : l)); setSelLancs(new Set()); showToast(`Data atualizada em ${ids.length} lançamento(s)`); setModal(null); }} onClose={() => setModal(null)} />}
      {modal?.tipo === 'massaLancFeriado' && <ModalMassaLancFeriado ids={modal.ids} lancamentos={lancamentos} servicos={servicos} feriadosExtra={feriadosExtra} onSave={(ids, isFeriado, nomeOverride) => { setLancamentos(prev => prev.map(l => { if (!ids.includes(l.id)) return l; const nomeFeriado = isFeriado ? (nomeOverride || detectarFeriado(l.data, feriadosExtra) || 'Feriado') : ''; const updated = { ...l, isFeriado, nomeFeriado }; const s = servicos.find(x => x.cod === l.codServico); if (!s) return updated; return { ...updated, ...calcular(s, updated, TEMPLATES[s.template]) }; })); setSelLancs(new Set()); showToast(isFeriado ? `Feriado marcado em ${ids.length} lançamento(s)` : `Marcação removida em ${ids.length} lançamento(s)`); setModal(null); }} onClose={() => setModal(null)} />}
      {modal?.tipo === 'massaLancServico' && <ModalMassaLancServico ids={modal.ids} servicos={servicos} lancamentos={lancamentos} onSave={(ids, serv) => { setLancamentos(prev => prev.map(l => { if (!ids.includes(l.id)) return l; const calc = calcular(serv, l, serv.template ? TEMPLATES[serv.template] : null); return { ...l, codServico: serv.cod, descricao: serv.descricao, cliente: serv.cliente, cnpj: serv.cnpj, template: serv.template, ...calc }; })); setSelLancs(new Set()); showToast(`Serviço alterado em ${ids.length} lançamento(s)`); setModal(null); }} onClose={() => setModal(null)} />}
      {modal?.tipo === 'confirmExcluirServ' && <ModalConfirm titulo="Excluir serviço?" mensagem={`${modal.dados.descricao} (#${modal.dados.cod})`} onConfirm={() => excluirServico(modal.dados.cod)} onClose={() => setModal(null)} />}
      {modal?.tipo === 'confirmExcluirFunc' && <ModalConfirm titulo="Excluir funcionário?" mensagem={modal.dados.nome} onConfirm={() => excluirFuncionario(modal.dados.id)} onClose={() => setModal(null)} />}
      {modal?.tipo === 'cliente' && <ModalCliente dados={modal.dados} onSave={salvarCliente} onClose={() => setModal(null)} />}
      {modal?.tipo === 'confirmExcluirCliente' && <ModalConfirm titulo="Excluir cliente?" mensagem={`${modal.dados.nome} — Esta ação não afeta lançamentos existentes.`} onConfirm={() => excluirCliente(modal.dados.id)} onClose={() => setModal(null)} />}
      {modal?.tipo === 'confirmExcluirDesp' && <ModalConfirm titulo="Excluir despesa?" mensagem={`${modal.dados.descricao} · ${fmt(modal.dados.valor)}`} onConfirm={() => excluirDespesa(modal.dados.id)} onClose={() => setModal(null)} />}
      {modal?.tipo === 'confirmExcluirDesc' && <ModalConfirm titulo="Excluir desconto?" mensagem={`${modal.dados.descricao} · ${fmt(modal.dados.valor)}`} onConfirm={() => excluirDesconto(modal.dados.id)} onClose={() => setModal(null)} />}
      {modal?.tipo === 'despChefia' && <ModalDespesaChefia dados={modal.dados} onSave={salvarDespChefia} onClose={() => setModal(null)} />}
      {modal?.tipo === 'confirmExcluirDespChefia' && <ModalConfirm titulo="Excluir despesa da chefia?" mensagem={`${modal.dados.descricao} · ${fmt(modal.dados.valor)}`} onConfirm={() => excluirDespChefia(modal.dados.id)} onClose={() => setModal(null)} />}
      {modal?.tipo === 'faturaDeProposta' && <ModalFaturaDeProposta proposta={modal.proposta} clientes={clientes} onSave={gerarFaturaDeProposta} onClose={() => setModal(null)} />}
      {modal?.tipo === 'confirmFechar' && <ModalConfirm titulo="Fechar fatura?" mensagem={`${modal.dados.cliente} · ${fmtPeriodo(modal.dados.periodo, TEMPLATES[modal.dados.template])} · ${modal.dados.qtd} lançamento(s). Esta ação marcará todos como fechados.`} onConfirm={() => fecharFatura(modal.dados)} onClose={() => setModal(null)} cor="emerald" />}
      {modal?.tipo === 'confirmReabrir' && <ModalConfirm titulo="Reabrir fatura?" mensagem="Os lançamentos voltam a ser editáveis." onConfirm={() => reabrirFatura(modal.dados)} onClose={() => setModal(null)} cor="amber" />}
      {modal?.tipo === 'confirm' && <ModalConfirm titulo={modal.dados.titulo} mensagem={modal.dados.mensagem} onConfirm={() => { modal.dados.onConfirm?.(); setModal(null); }} onClose={() => setModal(null)} cor={modal.dados.cor || 'red'} />}
      </div>
    </div>
  );
}

// ============ MODAL GERAR FATURA A PARTIR DE PROPOSTA ============
function ModalFaturaDeProposta({ proposta, clientes, onSave, onClose }) {
  const mesAtual = new Date().toISOString().slice(0, 7);
  const [competencia, setCompetencia] = useState(mesAtual);
  const [clienteNome, setClienteNome] = useState(() => {
    const cli = clientes.find(c => String(c._apiId || c.id) === String(proposta.cliente_id));
    return cli?.razaoSocial || cli?.nome || proposta.cliente_razao || proposta.cliente_nome || '';
  });
  const fmtBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const submit = () => {
    if (!clienteNome.trim()) return alert('Informe o nome do cliente para a fatura');
    if (!competencia) return alert('Informe a competência (mês)');
    onSave({
      cliente: clienteNome.trim(),
      competencia,
      totalFatura: num(proposta.valor_total),
      origemProposta: proposta.numero_formatado || `P-${String(proposta.numero || '').padStart(4, '0')}`,
    });
  };

  return (
    <ModalBase titulo={`Gerar Fatura — ${proposta.numero_formatado || ''}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-white border border-slate-200 text-sm">
          <div className="text-xs text-slate-400 mb-1">Categoria</div>
          <div className="font-medium">{proposta.categoria}</div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Cliente da fatura *</label>
          <input value={clienteNome} onChange={e => setClienteNome(e.target.value)}
            placeholder="Nome / razão social"
            className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
          <div className="text-[11px] text-slate-500 mt-1">
            CNPJ: {proposta.cliente_cnpj || '—'}
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Competência (mês de faturamento) *</label>
          <input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)}
            className="bg-white border border-slate-200 rounded px-3 py-2 text-sm text-slate-700" />
        </div>
        <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-sm flex justify-between items-center">
          <span className="text-slate-400">Valor total da fatura:</span>
          <span className="text-lg font-bold text-indigo-600">R$ {fmtBRL(proposta.valor_total)}</span>
        </div>
        <p className="text-xs text-slate-500">A fatura será criada como fatura customizada (sem lançamentos vinculados) e aparecerá na aba Faturas com status "Enviada".</p>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button>
          <button onClick={submit} className="px-4 py-2 rounded-lg text-sm bg-amber-600 hover:bg-amber-500 font-medium flex items-center gap-2"><Receipt className="w-4 h-4" />Gerar Fatura</button>
        </div>
      </div>
    </ModalBase>
  );
}

// ============ MODAL CLIENTE ============
function ModalCliente({ dados, onSave, onClose }) {
  const [f, setF] = useState(dados || {
    id: '', nome: '', razaoSocial: '', cnpj: '', inscricaoEstadual: '',
    email: '', telefone: '', endereco: '', numero: '', complemento: '',
    bairro: '', cidade: '', uf: '', cep: '',
    nomeContato: '', cargoContato: '', aliquota: 0, observacoes: '', status: 'ATIVO',
  });
  const isEdit = !!dados?.id;
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const submit = () => {
    if (!f.nome?.trim()) return alert('Nome é obrigatório');
    onSave({ ...f, nome: f.nome.trim(), aliquota: parseFloat(f.aliquota) || 0 });
  };
  const I = (k, l, tipo = 'text', placeholder = '') => (
    <Campo label={l}>
      <input type={tipo} value={f[k] || ''} onChange={e => set(k, e.target.value)} placeholder={placeholder} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
    </Campo>
  );
  return (
    <ModalBase titulo={isEdit ? 'Editar cliente' : 'Novo cliente'} onClose={onClose} grande>
      <div className="space-y-4">
        {/* Identificação */}
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
          <div className="text-xs text-indigo-600 font-semibold uppercase mb-3">Identificação</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo label="Nome comercial / Apelido *" span={2}>
              <input value={f.nome || ''} onChange={e => set('nome', e.target.value)} placeholder="Como aparece nos lançamentos e faturas" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-semibold" />
            </Campo>
            {I('razaoSocial', 'Razão Social', 'text', 'Nome legal completo')}
            {I('cnpj', 'CNPJ', 'text', 'XX.XXX.XXX/XXXX-XX')}
            {I('inscricaoEstadual', 'Inscrição Estadual')}
            <Campo label="Alíquota de imposto (%)">
              <input type="number" step="0.01" value={f.aliquota || ''} onChange={e => set('aliquota', e.target.value)} placeholder="Ex: 15.60" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono" />
            </Campo>
            <Campo label="Status">
              <select value={f.status} onChange={e => set('status', e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm">
                <option value="ATIVO">ATIVO</option>
                <option value="INATIVO">INATIVO</option>
              </select>
            </Campo>
          </div>
        </div>

        {/* Contato */}
        <div>
          <h4 className="text-xs text-slate-400 font-semibold uppercase pb-1 mb-3 border-b border-slate-200">Contato</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {I('email', 'E-mail', 'email', 'financeiro@empresa.com.br')}
            {I('telefone', 'Telefone', 'tel', '(11) 9xxxx-xxxx')}
            {I('nomeContato', 'Nome do contato')}
            {I('cargoContato', 'Cargo do contato')}
          </div>
        </div>

        {/* Endereço */}
        <div>
          <h4 className="text-xs text-slate-400 font-semibold uppercase pb-1 mb-3 border-b border-slate-200">Endereço</h4>
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
            <Campo label="Logradouro" span={4}>
              <input value={f.endereco || ''} onChange={e => set('endereco', e.target.value)} placeholder="Rua / Av." className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
            </Campo>
            {I('numero', 'Número')}
            {I('complemento', 'Complemento', 'text', 'Sala, andar...')}
            <Campo label="Bairro" span={2}><input value={f.bairro || ''} onChange={e => set('bairro', e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
            <Campo label="Cidade" span={2}><input value={f.cidade || ''} onChange={e => set('cidade', e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
            <Campo label="UF">
              <input value={f.uf || ''} onChange={e => set('uf', e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" maxLength={2} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm uppercase" />
            </Campo>
            {I('cep', 'CEP', 'text', 'XXXXX-XXX')}
          </div>
        </div>

        {/* Observações */}
        <Campo label="Observações">
          <textarea value={f.observacoes || ''} onChange={e => set('observacoes', e.target.value)} rows={2} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
        </Campo>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button>
        <button onClick={submit} className="px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 font-medium">Salvar</button>
      </div>
    </ModalBase>
  );
}

function ModalMassaLancStatus({ ids, onSave, onClose }) {
  const [novoStatus, setNovoStatus] = useState('pago');
  const qtd = ids.length;
  return (
    <ModalBase titulo="Mudar status em massa" onClose={onClose} pequeno>
      <p className="text-sm text-slate-400 mb-4">{qtd} lançamento{qtd !== 1 ? 's' : ''} selecionado{qtd !== 1 ? 's' : ''}.</p>
      <div className="mb-5">
        <label className="block text-xs text-slate-400 mb-1.5">Novo status</label>
        <select value={novoStatus} onChange={e => setNovoStatus(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm">
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-sm">Cancelar</button>
        <button onClick={() => onSave(ids, novoStatus)} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium">Aplicar em {qtd}</button>
      </div>
    </ModalBase>
  );
}

function ModalMassaLancData({ ids, onSave, onClose }) {
  const hoje = () => new Date().toISOString().slice(0, 10);
  const [novaData, setNovaData] = useState(hoje());
  const qtd = ids.length;
  return (
    <ModalBase titulo="Mudar data em massa" onClose={onClose} pequeno>
      <p className="text-sm text-slate-400 mb-4">{qtd} lançamento{qtd !== 1 ? 's' : ''} selecionado{qtd !== 1 ? 's' : ''}.</p>
      <div className="mb-5">
        <label className="block text-xs text-slate-400 mb-1.5">Nova data</label>
        <input type="date" value={novaData} onChange={e => setNovaData(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm" />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-sm">Cancelar</button>
        <button onClick={() => novaData && onSave(ids, novaData)} disabled={!novaData} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium">Aplicar em {qtd}</button>
      </div>
    </ModalBase>
  );
}

function ModalMassaLancServico({ ids, servicos, lancamentos, onSave, onClose }) {
  const [codEscolhido, setCodEscolhido] = useState('');
  const qtd = ids.length;
  const servAtivos = servicos.filter(s => s.status === 'ATIVO');
  const serv = servAtivos.find(s => s.cod === codEscolhido);
  return (
    <ModalBase titulo="Mudar serviço em massa" onClose={onClose}>
      <p className="text-sm text-slate-400 mb-4">{qtd} lançamento{qtd !== 1 ? 's' : ''} selecionado{qtd !== 1 ? 's' : ''}. Os valores de cada lançamento serão recalculados com base no novo serviço.</p>
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-1.5">Novo serviço</label>
        <select value={codEscolhido} onChange={e => setCodEscolhido(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm">
          <option value="">Selecione um serviço...</option>
          {servAtivos.map(s => <option key={s.cod} value={s.cod}>#{s.cod} — {s.descricao} ({s.cliente})</option>)}
        </select>
      </div>
      {serv && (
        <div className="bg-slate-100 rounded-lg p-3 mb-4 grid grid-cols-3 gap-2 text-xs">
          <div><span className="text-slate-500">Diária paga</span><div className="font-semibold">{serv.diariaPaga > 0 ? `R$ ${num(serv.diariaPaga).toFixed(2)}` : '—'}</div></div>
          <div><span className="text-slate-500">Valor fatura</span><div className="font-semibold text-emerald-600">{`R$ ${num(serv.valorFatura).toFixed(2)}`}</div></div>
          <div><span className="text-slate-500">Alíquota</span><div className="font-semibold">{serv.aliquota}%</div></div>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-sm">Cancelar</button>
        <button onClick={() => serv && onSave(ids, serv)} disabled={!serv} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium">Aplicar em {qtd}</button>
      </div>
    </ModalBase>
  );
}

function Card({ title, value, sub, icon: Icon, cor, iconCor }) { return <div className={`bg-gradient-to-br ${cor} border border-slate-200 rounded-xl p-3 sm:p-4 min-w-0`}><div className="flex items-center justify-between mb-1.5 sm:mb-2 gap-2"><span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wide truncate">{title}</span><Icon className={`w-4 h-4 flex-shrink-0 ${iconCor}`} /></div><div className="text-xl sm:text-2xl font-bold leading-tight break-words">{value}</div>{sub && <div className="text-[10px] sm:text-xs text-slate-500 mt-1 truncate">{sub}</div>}</div>; }
function Painel({ titulo, children }) { return <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 min-w-0"><h3 className="font-semibold mb-2 sm:mb-3 text-sm text-slate-600">{titulo}</h3>{children}</div>; }
function Stat({ label, valor, cor = 'text-slate-900' }) { return <div className="bg-slate-50 rounded p-2 min-w-0"><div className="text-[10px] text-slate-500 uppercase truncate">{label}</div><div className={`font-semibold ${cor} truncate`}>{valor}</div></div>; }
function BotaoXResumo({ excluido, onClick }) {
  return excluido
    ? <button onClick={onClick} title="Restaurar este registro" className="w-6 h-6 rounded-full bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 flex items-center justify-center text-base font-bold leading-none">+</button>
    : <button onClick={onClick} title="Excluir do resumo e da planilha" className="w-6 h-6 rounded-full bg-white hover:bg-red-500/40 text-slate-500 hover:text-red-300 flex items-center justify-center text-sm font-bold leading-none">×</button>;
}
function Badge({ status }) { const cls = { pendente: 'bg-amber-500/20 text-amber-600', pago: 'bg-emerald-500/20 text-emerald-600', fechado: 'bg-slate-100 text-slate-700' }[status] || 'bg-slate-100 text-slate-700'; return <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{status}</span>; }

// ============ MODAL MASSA FERIADO ============
function ModalMassaLancFeriado({ ids, lancamentos, servicos, feriadosExtra, onSave, onClose }) {
  const [modo, setModo] = useState('marcar'); // 'marcar' | 'remover'
  const [nomeCustom, setNomeCustom] = useState('');
  const qtd = ids.length;

  const lancsAfetados = useMemo(() =>
    lancamentos.filter(l => ids.includes(l.id)).sort((a, b) => a.data.localeCompare(b.data)),
    [ids, lancamentos]
  );

  const preview = useMemo(() =>
    lancsAfetados.map(l => ({
      ...l,
      nomeDetectado: detectarFeriado(l.data, feriadosExtra),
      nomeResultante: modo === 'marcar' ? (nomeCustom.trim() || detectarFeriado(l.data, feriadosExtra) || 'Feriado') : '',
    })),
    [lancsAfetados, modo, nomeCustom, feriadosExtra]
  );

  return (
    <ModalBase titulo="Feriado em massa" onClose={onClose}>
      <p className="text-sm text-slate-400 mb-4">{qtd} lançamento{qtd !== 1 ? 's' : ''} selecionado{qtd !== 1 ? 's' : ''}. Os valores de adicional serão recalculados.</p>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setModo('marcar')} className={`flex-1 py-2 rounded-lg text-sm font-medium border ${modo === 'marcar' ? 'bg-amber-600/20 border-amber-500 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
          Marcar como feriado
        </button>
        <button onClick={() => setModo('remover')} className={`flex-1 py-2 rounded-lg text-sm font-medium border ${modo === 'remover' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
          Remover marcação
        </button>
      </div>

      {modo === 'marcar' && (
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-1.5">Nome do feriado <span className="text-slate-600">(opcional — deixe em branco para usar detecção automática por data)</span></label>
          <input type="text" value={nomeCustom} onChange={e => setNomeCustom(e.target.value)} placeholder="Ex: Corpus Christi, São Sebastião..." className="w-full bg-white border border-slate-300 rounded-lg text-slate-900 px-3 py-2 text-sm" />
        </div>
      )}

      <div className="border border-slate-200 rounded-lg overflow-hidden mb-5">
        <div className="bg-slate-100 px-3 py-1.5 text-[10px] uppercase text-slate-500 font-semibold flex">
          <span className="w-24 flex-none">Data</span>
          <span className="flex-1">Serviço</span>
          <span className="w-40 text-right">Feriado resultante</span>
        </div>
        <div className="max-h-52 overflow-y-auto divide-y divide-slate-800">
          {preview.map(l => (
            <div key={l.id} className="flex items-center px-3 py-2 text-xs hover:bg-slate-50">
              <span className="w-24 flex-none text-slate-400">{fmtData(l.data)}</span>
              <span className="flex-1 text-slate-600 truncate">{l.descricao}</span>
              <span className={`w-40 text-right truncate ${modo === 'marcar' ? 'text-amber-600' : 'text-slate-600 italic'}`}>
                {modo === 'marcar' ? l.nomeResultante : '— removido'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-sm">Cancelar</button>
        <button
          onClick={() => onSave(ids, modo === 'marcar', nomeCustom.trim())}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${modo === 'marcar' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-slate-600 hover:bg-slate-500'}`}
        >
          {modo === 'marcar' ? `Marcar ${qtd} lançamento${qtd !== 1 ? 's' : ''}` : `Remover de ${qtd} lançamento${qtd !== 1 ? 's' : ''}`}
        </button>
      </div>
    </ModalBase>
  );
}

// ============ MODAL FERIADOS ============
function ModalGerenciarFeriados({ feriadosExtra, setFeriadosExtra, onClose }) {
  const anoAtual = new Date().getFullYear();
  const [novoData, setNovoData] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [abaF, setAbaF] = useState('custom'); // 'custom' | 'base'

  const feriadosBaseAno = useMemo(() => {
    const mapa = feriadosBase(anoAtual);
    return Array.from(mapa.entries()).map(([data, nome]) => ({ data, nome })).sort((a, b) => a.data.localeCompare(b.data));
  }, [anoAtual]);

  const adicionar = () => {
    if (!novoData || !novoNome.trim()) return;
    if (feriadosExtra.some(f => f.data === novoData)) return alert('Já existe um feriado customizado para esta data.');
    setFeriadosExtra(prev => [...prev, { data: novoData, nome: novoNome.trim() }].sort((a, b) => a.data.localeCompare(b.data)));
    setNovoData('');
    setNovoNome('');
  };

  const remover = (data) => setFeriadosExtra(prev => prev.filter(f => f.data !== data));

  return (
    <ModalBase titulo="Gestão de Feriados" onClose={onClose}>
      <div className="flex gap-2 mb-4 border-b border-slate-200">
        <button onClick={() => setAbaF('custom')} className={`px-3 py-1.5 text-sm font-medium rounded-t ${abaF === 'custom' ? 'text-white border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-900'}`}>Feriados customizados</button>
        <button onClick={() => setAbaF('base')} className={`px-3 py-1.5 text-sm font-medium rounded-t ${abaF === 'base' ? 'text-white border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-900'}`}>Base {anoAtual} (nacionais + RJ)</button>
      </div>

      {abaF === 'custom' && (
        <>
          <p className="text-xs text-slate-400 mb-3">Adicione feriados municipais ou datas específicas que não constam na base automática.</p>
          <div className="flex gap-2 mb-4">
            <input type="date" value={novoData} onChange={e => setNovoData(e.target.value)} className="bg-white border border-slate-200 rounded px-3 py-2 text-sm flex-none w-40" />
            <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Nome do feriado" className="bg-white border border-slate-200 rounded px-3 py-2 text-sm flex-1" onKeyDown={e => e.key === 'Enter' && adicionar()} />
            <button onClick={adicionar} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-sm font-medium flex items-center gap-1.5"><Plus className="w-4 h-4" />Adicionar</button>
          </div>
          {feriadosExtra.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Nenhum feriado customizado cadastrado.</p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {feriadosExtra.map(f => (
                <div key={f.data} className="flex items-center justify-between bg-white rounded px-3 py-2 text-sm">
                  <span className="text-amber-300 font-mono mr-3">{fmtData(f.data)}</span>
                  <span className="flex-1 text-slate-700">{f.nome}</span>
                  <button onClick={() => remover(f.data)} className="p-1 hover:bg-red-900/40 text-red-600 rounded ml-2"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {abaF === 'base' && (
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {feriadosBaseAno.map(f => (
            <div key={f.data} className="flex items-center bg-slate-50 rounded px-3 py-2 text-sm">
              <span className="text-slate-400 font-mono w-24 flex-none">{fmtData(f.data)}</span>
              <span className="flex-1 text-slate-700">{f.nome}</span>
            </div>
          ))}
        </div>
      )}
    </ModalBase>
  );
}

// ============ MODAL LANÇAMENTO ============
function ModalLancamento({ dados, servicos, funcionarios, categoriasFolha = [], feriadosExtra = [], onSave, onClose }) {
  const [form, setForm] = useState(() => {
    const base = dados ? { ...dados, extras: dados.extras || {} } : { data: hoje(), codServico: '', horasTrabalhadas: 0, kmRodados: 0, pedagio: 0, batidaExtra: 0, outros: 0, isDomingo: false, isFeriado: false, nomeFeriado: '', extras: {}, observacoes: '', status: 'pendente', competencia: '', categoriaFolha: '' };
    // Inicializa competência com a data — usuário só altera se quiser override
    if (!base.competencia && base.data) base.competencia = base.data.slice(0, 7);
    return base;
  });
  const dataPrevRef = useRef(form.data);
  const servico = servicos.find(s => s.cod === form.codServico);
  const template = TEMPLATES[servico?.template];
  const calc = useMemo(() => calcular(servico, form, template), [servico, form, template]);
  const funcAtivos = useMemo(() => funcionarios.filter(f => f.status === 'ATIVO').sort((a, b) => a.nome.localeCompare(b.nome)), [funcionarios]);

  useEffect(() => {
    const e = form.extras || {}; const updates = {};
    if (e.inicio && e.termino) {
      const h = diffHorasDecimal(e.inicio, e.termino, form.data);
      if (Math.abs(h - num(form.horasTrabalhadas)) > 0.001) updates.horasTrabalhadas = h.toFixed(2);
    } else if (e.inicioMissao && e.terminoMissao) {
      const h = diffHorasDecimal(e.inicioMissao, e.terminoMissao, form.data);
      if (Math.abs(h - num(form.horasTrabalhadas)) > 0.001) updates.horasTrabalhadas = h.toFixed(2);
    }
    if (e.kmInicial != null && e.kmFinal != null && e.kmFinal !== '' && e.kmInicial !== '') {
      const km = Math.max(0, num(e.kmFinal) - num(e.kmInicial));
      if (km !== num(form.kmRodados)) updates.kmRodados = km;
    }
    if (Object.keys(updates).length) setForm(f => ({ ...f, ...updates }));
  }, [form.extras, form.data]);

  useEffect(() => {
    if (!form.data) return;
    const nomeFer = detectarFeriado(form.data, feriadosExtra);
    setForm(f => ({ ...f, isDomingo: eDomingo(form.data), isFeriado: !!nomeFer, nomeFeriado: nomeFer || '' }));
  }, [form.data]);

  // Auto-sync da competência: se o usuário muda a data e a competência ainda
  // segue a data anterior (não foi customizada), atualiza para a nova data.
  useEffect(() => {
    if (!form.data) return;
    const novaComp = form.data.slice(0, 7);
    const compAnterior = (dataPrevRef.current || '').slice(0, 7);
    setForm(f => {
      if (!f.competencia || f.competencia === compAnterior) return { ...f, competencia: novaComp };
      return f; // override manual preservado
    });
    dataPrevRef.current = form.data;
  }, [form.data]);

  const setExtra = (k, v) => setForm(f => ({ ...f, extras: { ...f.extras, [k]: v } }));
  const submit = () => { if (!form.codServico) return alert('Selecione um serviço'); if (!form.data) return alert('Informe a data'); onSave(form); };

  return (
    <ModalBase titulo={dados ? 'Editar lançamento' : 'Novo lançamento'} onClose={onClose} grande>
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
        <Campo label="Nº OS" span={1}><input type="text" value={form.os || ''} onChange={e => setForm({ ...form, os: e.target.value })} placeholder="Auto" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono" /></Campo>
        <Campo label="Data" span={2}><input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
        <Campo label="Serviço" span={3}>
          <select value={form.codServico} onChange={e => setForm({ ...form, codServico: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm">
            <option value="">Selecione...</option>
            {[...new Set(servicos.filter(s => s.status === 'ATIVO').map(s => s.cliente))].sort().map(cli => <optgroup key={cli} label={cli}>{servicos.filter(s => s.cliente === cli && s.status === 'ATIVO').map(s => <option key={s.cod} value={s.cod}>#{s.cod} · {s.descricao}</option>)}</optgroup>)}
          </select>
        </Campo>
      </div>
      {servico && template && (
        <>
          <div className="mt-3 bg-white rounded p-2 text-xs flex items-center justify-between flex-wrap gap-2">
            <div className="text-slate-400"><b className="text-indigo-600">{template.nome}</b> · Franquia {servico.franquiaHoras}h/{servico.franquiaKm}km · Vlr {fmt(servico.valorFatura)}</div>
            {template.incluirPedagioFatura && <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-600">Pedágio fatura</span>}
            {template.reembolsarPedagio && <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Reembolsa pedágio</span>}
            {template.periodo === '25-25' && <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-600">Ciclo 26→25</span>}
          </div>
          <datalist id="lista-funcionarios">{funcAtivos.map(f => <option key={f.id} value={f.nome} />)}</datalist>
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            {template.campos.map(c => (
              <Campo key={c.k} label={c.l} full={c.full}>
                {c.tipo === 'datetime' ? <input type="datetime-local" value={form.extras[c.k] || ''} onChange={e => setExtra(c.k, e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
                  : c.tipo === 'time' ? <input type="time" value={form.extras[c.k] || ''} onChange={e => setExtra(c.k, e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
                    : c.tipo === 'number' ? <input type="number" step="any" value={form.extras[c.k] ?? ''} onChange={e => setExtra(c.k, e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
                      : c.tipo === 'currency' ? <input type="number" step="0.01" value={form.extras[c.k] ?? ''} onChange={e => { setExtra(c.k, e.target.value); if (c.k === 'pedagio') setForm(f => ({ ...f, pedagio: e.target.value })); if (c.k === 'batidaExtra') setForm(f => ({ ...f, batidaExtra: e.target.value })); }} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
                        : c.tipo === 'textarea' ? <textarea value={form.extras[c.k] || ''} onChange={e => setExtra(c.k, e.target.value)} rows={2} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
                          : c.tipo === 'funcionario' ? <input list="lista-funcionarios" value={form.extras[c.k] || ''} onChange={e => setExtra(c.k, e.target.value)} placeholder="Digite ou selecione..." className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
                            : c.tipo === 'select' ? <select value={form.extras[c.k] || ''} onChange={e => setExtra(c.k, e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm"><option value="">— selecione —</option>{(c.options || []).map(o => <option key={o} value={o}>{o}</option>)}</select>
                              : <input value={form.extras[c.k] || ''} onChange={e => setExtra(c.k, e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />}
              </Campo>
            ))}
          </div>
          <div className="mt-3 grid sm:grid-cols-3 gap-3">
            <Campo label={<span>Horas trabalhadas{((form.extras?.inicio && form.extras?.termino) || (form.extras?.inicioMissao && form.extras?.terminoMissao)) && <span className="ml-1.5 text-[10px] text-blue-600 font-normal normal-case">⟳ auto</span>}</span>}><input type="number" step="0.01" value={form.horasTrabalhadas} onChange={e => setForm({ ...form, horasTrabalhadas: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono" /></Campo>
            <Campo label="KM rodados"><input type="number" value={form.kmRodados} onChange={e => setForm({ ...form, kmRodados: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
            <Campo label="Outros (R$)"><input type="number" step="0.01" value={form.outros} onChange={e => setForm({ ...form, outros: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
            <Campo label="Status"><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm"><option value="pendente">Pendente</option><option value="pago">Pago</option></select></Campo>
            <Campo label={<span>Competência da folha <span className="text-[10px] text-slate-500 normal-case">{form.competencia && form.competencia !== (form.data || '').slice(0, 7) ? '(override manual)' : '(segue a data)'}</span></span>}><input type="month" value={form.competencia || ''} onChange={e => setForm({ ...form, competencia: e.target.value })} className={`w-full bg-white border ${form.competencia && form.competencia !== (form.data || '').slice(0, 7) ? 'border-amber-500/60' : 'border-slate-200'} rounded px-3 py-2 text-sm`} /></Campo>
            <Campo label="Categoria de folha">
              <input list="cat-folha-modal" value={form.categoriaFolha || ''} onChange={e => setForm({ ...form, categoriaFolha: e.target.value.toUpperCase() })} placeholder="Ex: ARMADA, ESCRITÓRIO" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
              <datalist id="cat-folha-modal">{categoriasFolha.map(c => <option key={c.id} value={c.nome} />)}</datalist>
            </Campo>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-4 pt-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!form.isDomingo} onChange={e => setForm({ ...form, isDomingo: e.target.checked })} className="w-4 h-4 rounded" />
                Adicional domingo {eDomingo(form.data) && <span className="text-xs text-amber-600">(detectado)</span>}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!form.isFeriado} onChange={e => setForm({ ...form, isFeriado: e.target.checked })} className="w-4 h-4 rounded" />
                Feriado
                {form.nomeFeriado
                  ? <span className="text-xs text-amber-600 font-medium">({form.nomeFeriado})</span>
                  : <span className="text-xs text-slate-500">— marque para aplicar adicional</span>}
              </label>
            </div>
          </div>
          <div className="mt-4 bg-slate-100 border border-slate-200 rounded-lg p-3">
            <div className="text-xs text-slate-400 uppercase font-semibold mb-2">Cálculo</div>
            {/* Derivação de horas dos campos de início/término */}
            {(() => {
              const e = form.extras || {};
              const ini = e.inicio || e.inicioMissao;
              const fim = e.termino || e.terminoMissao;
              if (!ini || !fim) return null;
              const h = diffHorasDecimal(ini, fim, form.data);
              if (!h) return null;
              const franq = num(servico?.franquiaHoras);
              const hExt = Math.max(0, h - franq);
              return (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1.5 mb-2 text-xs">
                  <span className="text-blue-600 font-semibold">⏱ Horas</span>
                  <span className="font-mono text-slate-700">{fmtHorasHHMM(h)} <span className="text-slate-500">({h.toFixed(2)}h)</span></span>
                  <span className="text-slate-500">franquia {fmtHorasHHMM(franq)}</span>
                  {hExt > 0
                    ? <span className="text-amber-300 font-semibold">extra: {fmtHorasHHMM(hExt)} ({hExt.toFixed(2)}h)</span>
                    : <span className="text-emerald-600">dentro da franquia</span>}
                </div>
              );
            })()}
            {/* Derivação de KM dos campos kmInicial/kmFinal */}
            {(() => {
              const e = form.extras || {};
              if (e.kmInicial == null || e.kmFinal == null || e.kmFinal === '' || e.kmInicial === '') return null;
              const km = Math.max(0, num(e.kmFinal) - num(e.kmInicial));
              if (!km) return null;
              const franqKm = num(servico?.franquiaKm);
              const kmExt = Math.max(0, km - franqKm);
              return (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-orange-500/10 border border-orange-500/20 rounded px-2 py-1.5 mb-2 text-xs">
                  <span className="text-orange-400 font-semibold">🛣 KM</span>
                  <span className="font-mono text-slate-700">{km}km</span>
                  <span className="text-slate-500">franquia {franqKm}km</span>
                  {kmExt > 0
                    ? <span className="text-amber-300 font-semibold">extra: {kmExt}km</span>
                    : <span className="text-emerald-600">dentro da franquia</span>}
                </div>
              );
            })()}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <Linha l="Vlr fatura base" v={fmt(servico.valorFatura)} />
              <Linha l="Diária paga base" v={fmt(servico.diariaPaga)} cor="text-orange-600" />
              {calc.horasExtras > 0 && <><Linha l={`+ ${calc.horasExtras.toFixed(2)}h extra fat`} v={fmt(calc.extraHorasFatura)} /><Linha l={`+ ${calc.horasExtras.toFixed(2)}h extra pago`} v={fmt(calc.extraHorasPaga)} cor="text-orange-600" /></>}
              {calc.kmExtras > 0 && <><Linha l={`+ ${calc.kmExtras}km extra fat`} v={fmt(calc.extraKmFatura)} /><Linha l={`+ ${calc.kmExtras}km extra pago`} v={fmt(calc.extraKmPago)} cor="text-orange-600" /></>}
              {form.isDomingo && (calc.adicDomFatura > 0 || calc.adicDomPago > 0) && <><Linha l="+ Adic. domingo fat" v={fmt(calc.adicDomFatura)} /><Linha l="+ Adic. domingo pago" v={fmt(calc.adicDomPago)} cor="text-orange-600" /></>}
              {calc.pedagioFatura > 0 && <Linha l="+ Pedágio fatura" v={fmt(calc.pedagioFatura)} />}
              {calc.pedagioReembolso > 0 && <Linha l="+ Pedágio reembolso" v={fmt(calc.pedagioReembolso)} cor="text-orange-600" />}
              {calc.batidaExtra > 0 && <Linha l="+ Batida extra" v={fmt(calc.batidaExtra)} />}
              {calc.outros > 0 && <Linha l="+ Outros" v={fmt(calc.outros)} />}
            </div>
            <div className="border-t border-slate-200 mt-2 pt-2 grid grid-cols-3 gap-2 text-center">
              <div><div className="text-[10px] text-slate-500 uppercase">Faturado</div><div className="font-bold text-base">{fmt(calc.totalFatura)}</div></div>
              <div><div className="text-[10px] text-slate-500 uppercase">Pago</div><div className="font-bold text-base text-orange-400">{fmt(calc.totalPago)}</div></div>
              <div><div className="text-[10px] text-slate-500 uppercase">Lucro</div><div className="font-bold text-base text-emerald-600">{fmt(calc.lucro)}</div></div>
            </div>
          </div>
        </>
      )}
      <div className="flex justify-end gap-2 mt-4"><button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button><button onClick={submit} className="px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 font-medium">Salvar</button></div>
    </ModalBase>
  );
}
function Linha({ l, v, cor = 'text-slate-700' }) { return <div className="flex justify-between"><span className="text-slate-400">{l}</span><span className={cor}>{v}</span></div>; }

// ============ MODAL SERVIÇO ============
function ModalServico({ dados, clientes = [], onSave, onClose }) {
  const [f, setF] = useState(dados || { cod: '', template: 'TOMBINI', descricao: '', cliente: '', cnpj: '', emissao: '', franquiaHoras: 0, franquiaKm: 0, horaExtraFatura: 0, kmExtraFatura: 0, diariaPaga: 0, horaExtraPaga: 0, kmExtraPago: 0, adicionalDomingosFatura: 0, adicionalDomingosPago: 0, valorFatura: 0, aliquota: 0, categoriaServico: CATEGORIAS_SERVICO[0], status: 'ATIVO' });
  const [clienteNovo, setClienteNovo] = useState(false);
  const isEdit = !!dados;
  const codAnterior = dados?.cod;
  useEffect(() => { const t = TEMPLATES[f.template]; if (t && !isEdit && !f.cliente) setF(s => ({ ...s, cliente: t.cliente })); }, [f.template]);
  useEffect(() => { if (f.cliente && !clientes.includes(f.cliente)) setClienteNovo(true); }, []);
  const submit = () => {
    if (!f.cod?.trim()) return alert('Código é obrigatório');
    if (!f.descricao) return alert('Descrição é obrigatória');
    // Categoria: se for valor inválido (não está em CATEGORIAS_SERVICO), usa a primeira categoria válida.
    const catFinal = CATEGORIAS_SERVICO.includes(f.categoriaServico) ? f.categoriaServico : CATEGORIAS_SERVICO[0];
    onSave({ ...f, cod: f.cod.trim(), franquiaHoras: num(f.franquiaHoras), franquiaKm: num(f.franquiaKm), horaExtraFatura: num(f.horaExtraFatura), kmExtraFatura: num(f.kmExtraFatura), diariaPaga: num(f.diariaPaga), horaExtraPaga: num(f.horaExtraPaga), kmExtraPago: num(f.kmExtraPago), adicionalDomingosFatura: num(f.adicionalDomingosFatura), adicionalDomingosPago: num(f.adicionalDomingosPago), valorFatura: num(f.valorFatura), aliquota: num(f.aliquota), categoriaServico: catFinal }, codAnterior);
  };
  const N = (k, l, step = '0.01') => <Campo label={l}><input type="number" step={step} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>;
  return (
    <ModalBase titulo={isEdit ? 'Editar serviço' : 'Novo serviço'} onClose={onClose} grande>
      {/* Código — editável inclusive em edição, com aviso de rename */}
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3 mb-3 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="flex-1">
          <label className="block text-xs uppercase font-semibold text-indigo-600 mb-1.5">Código da Missão *</label>
          <input value={f.cod} onChange={e => setF({ ...f, cod: e.target.value })} placeholder="Ex: 202604" className="w-full bg-white border border-slate-600 rounded px-3 py-2 text-base font-mono font-bold" />
          {isEdit && codAnterior !== f.cod && <p className="text-[11px] text-amber-600 mt-1">⚠ Renomeando de <b>#{codAnterior}</b> → <b>#{f.cod}</b>. Todos os lançamentos serão atualizados.</p>}
        </div>
        <div className="flex gap-3 sm:gap-4">
          <Campo label="Categoria"><select value={CATEGORIAS_SERVICO.includes(f.categoriaServico) ? f.categoriaServico : CATEGORIAS_SERVICO[0]} onChange={e => setF({ ...f, categoriaServico: e.target.value })} className="bg-white border border-slate-200 rounded px-3 py-2 text-sm">{CATEGORIAS_SERVICO.map(c => <option key={c} value={c}>{c}</option>)}</select></Campo>
          <Campo label="Status"><select value={f.status} onChange={e => setF({ ...f, status: e.target.value })} className="bg-white border border-slate-200 rounded px-3 py-2 text-sm"><option value="ATIVO">ATIVO</option><option value="INATIVO">INATIVO</option></select></Campo>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {/* Linha 1: Descrição + Template + Cliente */}
        <div className="sm:col-span-2">
          <Campo label="Descrição *"><input value={f.descricao} onChange={e => setF({ ...f, descricao: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
        </div>
        <Campo label="Template"><select value={f.template} onChange={e => setF({ ...f, template: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm">{Object.values(TEMPLATES).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></Campo>

        {/* Linha 2: Cliente + CNPJ */}
        <div className="sm:col-span-2">
          <Campo label="Cliente">
            {clienteNovo ? (
              <div className="flex gap-1">
                <input value={f.cliente} onChange={e => setF({ ...f, cliente: e.target.value })} placeholder="Nome do novo cliente" className="flex-1 bg-white border border-slate-200 rounded px-3 py-2 text-sm" autoFocus />
                <button type="button" onClick={() => { setClienteNovo(false); setF({ ...f, cliente: '' }); }} className="px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs">↩</button>
              </div>
            ) : (
              <select value={f.cliente} onChange={e => { if (e.target.value === '__novo__') { setClienteNovo(true); setF({ ...f, cliente: '' }); } else setF({ ...f, cliente: e.target.value }); }} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm">
                <option value="">— selecione —</option>
                {clientes.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="__novo__">+ Cadastrar novo cliente…</option>
              </select>
            )}
          </Campo>
        </div>
        <Campo label="CNPJ"><input value={f.cnpj} onChange={e => setF({ ...f, cnpj: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>

        {/* Linha 3: Vlr Fatura + Diária Paga + Alíquota */}
        {N('valorFatura', 'Vlr Fatura (base)')}
        {N('diariaPaga', 'Diária paga')}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2">
          <label className="block text-[10px] uppercase font-semibold text-amber-300 mb-1">Alíquota imposto (%)</label>
          <input type="number" step="0.01" value={f.aliquota} onChange={e => setF({ ...f, aliquota: e.target.value })} placeholder="Ex: 15.60" className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm font-mono" />
          <p className="text-[9px] text-slate-500 mt-1">Não altera faturas já fechadas.</p>
        </div>

        {/* Franquia */}
        <div className="sm:col-span-3 text-xs uppercase text-slate-500 font-semibold pt-2 border-t border-slate-200">Franquia</div>
        {N('franquiaHoras', 'Franquia horas', '1')}
        {N('franquiaKm', 'Franquia km', '1')}
        <div></div>

        {/* Faturamento extras */}
        <div className="sm:col-span-3 text-xs uppercase text-slate-500 font-semibold pt-2 border-t border-slate-200">Faturamento — extras</div>
        {N('horaExtraFatura', 'Hora extra')}
        {N('kmExtraFatura', 'Km extra')}
        {N('adicionalDomingosFatura', 'Adic. domingo')}

        {/* Pagamento extras */}
        <div className="sm:col-span-3 text-xs uppercase text-slate-500 font-semibold pt-2 border-t border-slate-200">Pagamento — extras</div>
        {N('horaExtraPaga', 'Hora extra paga')}
        {N('kmExtraPago', 'Km extra pago')}
        {N('adicionalDomingosPago', 'Adic. domingo pago')}
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button>
        <button onClick={submit} className="px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 font-medium">Salvar</button>
      </div>
    </ModalBase>
  );
}

// ============ MODAL COPIAR SERVIÇO ============
function ModalCopiarServico({ servicos, onSave, onClose }) {
  const [fonteId, setFonteId] = useState('');
  const [novoCod, setNovoCod] = useState('');
  const [novaDesc, setNovaDesc] = useState('');
  const fonte = servicos.find(s => s.cod === fonteId);

  const submit = () => {
    if (!fonte) return alert('Selecione um serviço de origem');
    if (!novoCod.trim()) return alert('Código é obrigatório');
    if (!novaDesc.trim()) return alert('Descrição é obrigatória');
    if (servicos.some(s => s.cod === novoCod.trim())) return alert(`Código #${novoCod.trim()} já existe`);
    onSave({ ...fonte, cod: novoCod.trim(), descricao: novaDesc.trim(), id: novoCod.trim(), _apiId: undefined });
  };

  return (
    <ModalBase titulo="Copiar serviço" onClose={onClose}>
      <p className="text-xs text-slate-400 mb-3">Selecione o serviço de origem. Todos os valores serão copiados — você só informa o novo código e nome.</p>
      <div className="space-y-3">
        <Campo label="Serviço de origem *">
          <select value={fonteId} onChange={e => setFonteId(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm">
            <option value="">— selecione —</option>
            {[...new Set(servicos.filter(s => s.status === 'ATIVO').map(s => s.cliente))].sort().map(cli =>
              <optgroup key={cli} label={cli}>
                {servicos.filter(s => s.cliente === cli && s.status === 'ATIVO').map(s =>
                  <option key={s.cod} value={s.cod}>#{s.cod} · {s.descricao}</option>
                )}
              </optgroup>
            )}
          </select>
        </Campo>
        {fonte && (
          <div className="bg-slate-50 rounded p-2 text-xs text-slate-400 grid grid-cols-3 gap-2">
            <div><div className="text-[10px] uppercase text-slate-500">Vlr Fatura</div><div className="font-medium text-slate-700">{fmt(fonte.valorFatura)}</div></div>
            <div><div className="text-[10px] uppercase text-slate-500">Diária Paga</div><div className="font-medium text-slate-700">{fmt(fonte.diariaPaga)}</div></div>
            <div><div className="text-[10px] uppercase text-slate-500">Alíquota</div><div className="font-medium text-slate-700">{num(fonte.aliquota).toFixed(2)}%</div></div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Novo código *"><input value={novoCod} onChange={e => setNovoCod(e.target.value)} placeholder="Ex: 202605" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono font-bold" /></Campo>
          <Campo label="Nova descrição *"><input value={novaDesc} onChange={e => setNovaDesc(e.target.value)} placeholder="Nome do novo serviço" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button>
        <button onClick={submit} className="px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 font-medium">Copiar e salvar</button>
      </div>
    </ModalBase>
  );
}

// ============ MODAL FUNCIONÁRIO ============
function ModalFuncionario({ dados, categorias, categoriasFolha = [], onSave, onClose }) {
  const defaults = { nome: '', categoria: 'Agente Escolta', rg: '', cpf: '', telefone: '', email: '', endereco: '', cep: '', cidade: '', uf: '', dataNascimento: '', estadoCivil: '', nacionalidade: 'Brasileira', chavePix: '', tipoPix: 'CPF', valorDiaria: 0, salarioFixo: 0, folhaGrupo: '', fotoMeta: null, documentos: [], status: 'ATIVO', notas: '' };
  const [f, setF] = useState({ ...defaults, ...(dados || {}) });
  const [fotoPreview, setFotoPreview] = useState(null);
  const [carregandoFoto, setCarregandoFoto] = useState(false);
  const [carregandoDoc, setCarregandoDoc] = useState(false);
  const tempIdRef = useRef(dados?.id || `F${Date.now()}`);

  // Carrega preview da foto se já existe
  useEffect(() => {
    if (f.fotoMeta && dados?.id) {
      getArquivoStorage(fotoKey(dados.id)).then(b64 => { if (b64) setFotoPreview(b64); });
    }
  }, [dados?.id, f.fotoMeta]);

  const onSelectFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Selecione uma imagem (jpg, png, webp).');
    if (file.size > 4 * 1024 * 1024) return alert('Foto muito grande. Limite 4MB.');
    setCarregandoFoto(true);
    try {
      const b64 = await fileToBase64(file);
      const ok = await setArquivoStorage(fotoKey(tempIdRef.current), b64);
      if (!ok) { alert('Falha ao salvar foto'); return; }
      setF(s => ({ ...s, fotoMeta: { nome: file.name, mime: file.type, tamanho: file.size, atualizadoEm: new Date().toISOString() } }));
      setFotoPreview(b64);
    } catch { alert('Erro ao ler arquivo'); }
    setCarregandoFoto(false);
    e.target.value = '';
  };
  const removerFoto = async () => {
    if (!confirm('Remover foto?')) return;
    await deleteArquivoStorage(fotoKey(tempIdRef.current));
    setF(s => ({ ...s, fotoMeta: null }));
    setFotoPreview(null);
  };

  const onSelectDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if ((f.documentos || []).length >= 5) return alert('Máximo 5 documentos por funcionário.');
    if (file.size > 5 * 1024 * 1024) return alert('Documento muito grande. Limite 5MB.');
    setCarregandoDoc(true);
    try {
      const b64 = await fileToBase64(file);
      const docId = `D${Date.now()}`;
      const ok = await setArquivoStorage(docKey(tempIdRef.current, docId), b64);
      if (!ok) { alert('Falha ao salvar documento'); return; }
      setF(s => ({ ...s, documentos: [...(s.documentos || []), { id: docId, nome: file.name, mime: file.type || 'application/octet-stream', tamanho: file.size, criadoEm: new Date().toISOString() }] }));
    } catch { alert('Erro ao ler documento'); }
    setCarregandoDoc(false);
    e.target.value = '';
  };
  const removerDoc = async (docId) => {
    if (!confirm('Remover documento?')) return;
    await deleteArquivoStorage(docKey(tempIdRef.current, docId));
    setF(s => ({ ...s, documentos: (s.documentos || []).filter(d => d.id !== docId) }));
  };
  const baixarDoc = async (doc) => {
    const b64 = await getArquivoStorage(docKey(tempIdRef.current, doc.id));
    if (!b64) return alert('Documento não encontrado.');
    const a = document.createElement('a');
    a.href = b64; a.download = doc.nome; a.click();
  };

  const submit = () => {
    if (!f.nome?.trim()) return alert('Nome é obrigatório');
    onSave({ ...f, id: tempIdRef.current, valorDiaria: num(f.valorDiaria), salarioFixo: num(f.salarioFixo), folhaGrupo: (f.folhaGrupo || '').trim() });
  };

  return (
    <ModalBase titulo={dados ? 'Editar funcionário' : 'Novo funcionário'} onClose={onClose} grande>
      <div className="space-y-4">
        {/* Identificação + Foto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo label="Nome completo *" span={2}><input value={f.nome} onChange={e => setF({ ...f, nome: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
          <Campo label="Categoria *"><input list="lista-categorias" value={f.categoria} onChange={e => setF({ ...f, categoria: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /><datalist id="lista-categorias">{categorias.map(c => <option key={c} value={c} />)}</datalist></Campo>
          <Campo label="Status"><select value={f.status} onChange={e => setF({ ...f, status: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm"><option value="ATIVO">ATIVO</option><option value="INATIVO">INATIVO</option></select></Campo>
          <Campo label="Data de nascimento"><input type="date" value={f.dataNascimento} onChange={e => setF({ ...f, dataNascimento: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
          <Campo label="Estado civil"><select value={f.estadoCivil} onChange={e => setF({ ...f, estadoCivil: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm"><option value="">—</option>{ESTADOS_CIVIS.map(c => <option key={c} value={c}>{c}</option>)}</select></Campo>
          <Campo label="Nacionalidade"><input value={f.nacionalidade} onChange={e => setF({ ...f, nacionalidade: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
          {/* Foto — aparece na última célula */}
          <div className="sm:row-span-3 flex flex-col items-center gap-2 sm:row-start-2 sm:col-start-2">
            <div className="w-24 h-32 rounded-lg border-2 border-dashed border-slate-200 bg-white flex items-center justify-center overflow-hidden relative">
              {fotoPreview ? <img src={fotoPreview} alt="Foto" className="w-full h-full object-cover" /> : <Camera className="w-6 h-6 text-slate-600" />}
              {carregandoFoto && <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin" /></div>}
            </div>
            <div className="flex gap-1">
              <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs flex items-center gap-1 cursor-pointer"><Upload className="w-3 h-3" />Foto<input type="file" accept="image/*" onChange={onSelectFoto} className="hidden" /></label>
              {f.fotoMeta && <button onClick={removerFoto} className="px-2 py-1 hover:bg-red-900/40 text-red-600 rounded text-xs"><Trash2 className="w-3 h-3" /></button>}
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs uppercase font-semibold text-slate-400 mb-2 flex items-center gap-2"><Fingerprint className="w-3.5 h-3.5" />Documentos</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo label="RG"><input value={f.rg} onChange={e => setF({ ...f, rg: e.target.value })} placeholder="00.000.000-0" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
            <Campo label="CPF"><input value={f.cpf} onChange={e => setF({ ...f, cpf: e.target.value })} placeholder="000.000.000-00" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono" /></Campo>
          </div>
        </div>
        <div>
          <h4 className="text-xs uppercase font-semibold text-slate-400 mb-2 flex items-center gap-2"><Phone className="w-3.5 h-3.5" />Contato</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo label="Telefone"><input value={f.telefone} onChange={e => setF({ ...f, telefone: e.target.value })} placeholder="(21) 9XXXX-XXXX" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
            <Campo label="E-mail"><input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
          </div>
        </div>
        <div>
          <h4 className="text-xs uppercase font-semibold text-slate-400 mb-2 flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />Endereço</h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Campo label="Logradouro" span={3}><input value={f.endereco} onChange={e => setF({ ...f, endereco: e.target.value })} placeholder="Rua / Av." className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
            <Campo label="CEP"><input value={f.cep} onChange={e => setF({ ...f, cep: e.target.value })} placeholder="00000-000" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
            <Campo label="Cidade" span={2}><input value={f.cidade} onChange={e => setF({ ...f, cidade: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
            <Campo label="UF"><input value={f.uf} maxLength={2} onChange={e => setF({ ...f, uf: e.target.value.toUpperCase() })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
          </div>
        </div>
        <div>
          <h4 className="text-xs uppercase font-semibold text-slate-400 mb-2 flex items-center gap-2"><CreditCard className="w-3.5 h-3.5" />Pagamento</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo label="Tipo Pix"><select value={f.tipoPix} onChange={e => setF({ ...f, tipoPix: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm">{TIPOS_PIX.map(t => <option key={t} value={t}>{t}</option>)}</select></Campo>
            <Campo label="Chave Pix"><input value={f.chavePix} onChange={e => setF({ ...f, chavePix: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono" /></Campo>
            <Campo label="Valor diária fixa (R$)" span={2}><input type="number" step="0.01" value={f.valorDiaria} onChange={e => setF({ ...f, valorDiaria: e.target.value })} placeholder="Se 0, divide proporcional" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
            <Campo label="Categoria de folha padrão" span={2}>
              <select value={f.folhaGrupo || ''} onChange={e => setF({ ...f, folhaGrupo: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm">
                <option value="">— Nenhuma —</option>
                {categoriasFolha.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                {/* Compatibilidade: se o funcionario ja tem uma categoria que nao esta no catalogo, mostra como opcao */}
                {f.folhaGrupo && !categoriasFolha.find(c => c.nome === f.folhaGrupo) && (
                  <option value={f.folhaGrupo}>{f.folhaGrupo} (não cadastrada)</option>
                )}
              </select>
              <p className="text-[10px] text-slate-500 mt-0.5">{categoriasFolha.length === 0 ? <span className="text-amber-600">⚠ Nenhuma categoria cadastrada — vá na aba <b>Cat. Folha</b> e crie ao menos uma.</span> : <>Sugerida para preencher automaticamente em lançamentos avulsos. Os pagamentos (salário, diárias, etc) são feitos via aba <b>Lanç. Avulsos</b>.</>}</p>
            </Campo>
          </div>
        </div>

        <div>
          <h4 className="text-xs uppercase font-semibold text-slate-400 mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><Paperclip className="w-3.5 h-3.5" />Documentos anexos ({(f.documentos || []).length}/5)</span>
            {(f.documentos || []).length < 5 && <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs flex items-center gap-1 cursor-pointer"><Upload className="w-3 h-3" />{carregandoDoc ? 'Enviando…' : 'Adicionar arquivo'}<input type="file" onChange={onSelectDoc} className="hidden" disabled={carregandoDoc} /></label>}
          </h4>
          {(f.documentos || []).length === 0 ? <p className="text-xs text-slate-500 italic">Nenhum documento anexado. Aceita até 5 arquivos de até 5MB cada.</p> : (
            <div className="space-y-1">
              {f.documentos.map(d => (
                <div key={d.id} className="bg-slate-50 border border-slate-200 rounded px-3 py-2 flex items-center gap-2 text-sm">
                  <FileCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{d.nome}</div>
                    <div className="text-[10px] text-slate-500">{fmtTamanho(d.tamanho)} · {new Date(d.criadoEm).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <button onClick={() => baixarDoc(d)} className="p-1.5 hover:bg-slate-100 rounded" title="Baixar"><Download className="w-4 h-4" /></button>
                  <button onClick={() => removerDoc(d.id)} className="p-1.5 hover:bg-red-900/40 text-red-600 rounded" title="Remover"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Campo label="Notas internas" full><textarea value={f.notas} onChange={e => setF({ ...f, notas: e.target.value })} rows={2} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
      </div>
      <div className="flex justify-end gap-2 mt-4"><button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button><button onClick={submit} className="px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 font-medium">Salvar</button></div>
    </ModalBase>
  );
}

// ============ MODAL DESPESA ============
function ModalDespesa({ dados, onSave, onClose }) {
  const [f, setF] = useState(dados || { competencia: mesAtual(), descricao: '', tipo: 'AVULSA', valor: 0, centroCusto: '', origem: 'CARTÃO CORPORATIVO', status: 'pendente', observacoes: '' });
  // v99 — checkbox parcelado disponível também em edição:
  // marca → converte a despesa atual em N parcelas (a 1ª substitui o registro)
  const isEdicao = !!dados?.id;
  const [parcelado, setParcelado] = useState(false);
  const [parcelaTotal, setParcelaTotal] = useState(12);
  const submit = () => {
    if (!f.competencia) return alert('Competência é obrigatória');
    if (!f.descricao) return alert('Lançamento (descrição) é obrigatório');
    if (!num(f.valor)) return alert('Valor deve ser maior que zero');
    if (parcelado && (!parcelaTotal || parcelaTotal < 2)) return alert('Total de parcelas deve ser >= 2');
    if (parcelado && isEdicao && !window.confirm(`Converter esta despesa em ${parcelaTotal} parcelas?\n\nA despesa atual será apagada e substituída pelas ${parcelaTotal} novas parcelas (1ª na mesma competência).`)) return;
    onSave(parcelado ? { ...f, __parcelado: true, parcelaTotal: parseInt(parcelaTotal, 10) } : f);
  };
  return (
    <ModalBase titulo={dados ? 'Editar despesa' : 'Nova despesa'} onClose={onClose}>
      <div className={`mb-3 rounded-lg border ${parcelado ? 'bg-purple-500/10 border-purple-500/40' : 'bg-white border-slate-200'} p-3`}>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input type="checkbox" checked={parcelado} onChange={e => setParcelado(e.target.checked)} className="w-4 h-4 accent-purple-500" />
          <span className="font-medium">{isEdicao ? 'Converter em parcelamento' : 'Parcelado'}</span>
        </label>
        {parcelado && (
          <div className="mt-2 grid sm:grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-[11px] text-slate-400 mb-1">Total de parcelas *</div>
              <input type="number" min="2" max="360" value={parcelaTotal} onChange={e => setParcelaTotal(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2 text-slate-400 self-end pb-1">
              {isEdicao
                ? <>Apaga esta despesa e cria <b>{parcelaTotal || '?'}</b> parcelas de <b>R$ {fmt(num(f.valor))}</b> a partir de <b>{fmtMes(f.competencia) || '?'}</b>. Total: <b>R$ {fmt(num(f.valor) * (parseInt(parcelaTotal, 10) || 0))}</b>.</>
                : <>Cria <b>{parcelaTotal || '?'}</b> parcelas de <b>R$ {fmt(num(f.valor))}</b> a partir de <b>{fmtMes(f.competencia) || '?'}</b>. Total: <b>R$ {fmt(num(f.valor) * (parseInt(parcelaTotal, 10) || 0))}</b>.</>}
            </div>
          </div>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Campo label="Lançamento *" full><input value={f.descricao} onChange={e => setF({ ...f, descricao: e.target.value })} placeholder="Ex: CONTA DE LUZ (2 CASAS)" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
        <Campo label={parcelado ? 'Competência inicial *' : 'Competência *'}><input type="month" value={f.competencia} onChange={e => setF({ ...f, competencia: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
        {!parcelado && <Campo label="Tipo"><select value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm">{TIPOS_DESPESA.map(t => <option key={t} value={t}>{t}</option>)}</select></Campo>}
        <Campo label={parcelado ? 'Valor por parcela (R$) *' : 'Valor (R$) *'}><input type="number" step="0.01" value={f.valor} onChange={e => setF({ ...f, valor: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
        {!parcelado && <Campo label="Status"><select value={f.status} onChange={e => setF({ ...f, status: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm"><option value="pendente">Pendente</option><option value="pago">Pago</option></select></Campo>}
        <Campo label="Centro de Custo"><input list="lista-cc" value={f.centroCusto} onChange={e => setF({ ...f, centroCusto: e.target.value })} placeholder="Ex: Cora, Itaú..." className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /><datalist id="lista-cc">{CENTROS_CUSTO.map(c => <option key={c} value={c} />)}</datalist></Campo>
        <Campo label="Origem"><input list="lista-orig" value={f.origem} onChange={e => setF({ ...f, origem: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /><datalist id="lista-orig">{ORIGENS_DESPESA.map(c => <option key={c} value={c} />)}</datalist></Campo>
        <Campo label="Observações" full><textarea value={f.observacoes} onChange={e => setF({ ...f, observacoes: e.target.value })} rows={2} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
      </div>
      <div className="flex justify-end gap-2 mt-4"><button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button><button onClick={submit} className={`px-4 py-2 rounded-lg text-sm font-medium ${parcelado ? 'bg-purple-600 hover:bg-purple-500' : 'bg-red-600 hover:bg-red-500'}`}>{parcelado ? (isEdicao ? `Migrar para ${parcelaTotal} parcelas` : `Criar ${parcelaTotal} parcelas`) : 'Salvar'}</button></div>
    </ModalBase>
  );
}

// ============ MODAL DESPESA CHEFIA ============
function ModalDespesaChefia({ dados, onSave, onClose }) {
  const [f, setF] = useState(dados || { competencia: mesAtual(), descricao: '', tipo: 'AVULSA', valor: 0, origem: 'MANHÃES', status: 'pendente', observacoes: '' });
  const isEdicao = !!dados?.id;
  const [parcelado, setParcelado] = useState(false);
  const [parcelaTotal, setParcelaTotal] = useState(12);
  const submit = () => {
    if (!f.competencia) return alert('Competência é obrigatória');
    if (!f.descricao) return alert('Lançamento (descrição) é obrigatório');
    if (!num(f.valor)) return alert('Valor deve ser maior que zero');
    if (parcelado && (!parcelaTotal || parcelaTotal < 2)) return alert('Total de parcelas deve ser >= 2');
    if (parcelado && isEdicao && !window.confirm(`Converter esta despesa em ${parcelaTotal} parcelas?\n\nA despesa atual será apagada e substituída pelas ${parcelaTotal} novas parcelas (1ª na mesma competência).`)) return;
    onSave(parcelado ? { ...f, __parcelado: true, parcelaTotal: parseInt(parcelaTotal, 10) } : f);
  };
  return (
    <ModalBase titulo={dados ? 'Editar despesa da chefia' : 'Nova despesa da chefia'} onClose={onClose}>
      <div className={`mb-3 rounded-lg border ${parcelado ? 'bg-purple-500/10 border-purple-500/40' : 'bg-white border-slate-200'} p-3`}>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input type="checkbox" checked={parcelado} onChange={e => setParcelado(e.target.checked)} className="w-4 h-4 accent-purple-500" />
          <span className="font-medium">{isEdicao ? 'Converter em parcelamento' : 'Parcelado'}</span>
        </label>
        {parcelado && (
          <div className="mt-2 grid sm:grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-[11px] text-slate-400 mb-1">Total de parcelas *</div>
              <input type="number" min="2" max="360" value={parcelaTotal} onChange={e => setParcelaTotal(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2 text-slate-400 self-end pb-1">
              {isEdicao
                ? <>Apaga esta despesa e cria <b>{parcelaTotal || '?'}</b> parcelas de <b>R$ {fmt(num(f.valor))}</b> a partir de <b>{fmtMes(f.competencia) || '?'}</b>. Total: <b>R$ {fmt(num(f.valor) * (parseInt(parcelaTotal, 10) || 0))}</b>.</>
                : <>Cria <b>{parcelaTotal || '?'}</b> parcelas de <b>R$ {fmt(num(f.valor))}</b> a partir de <b>{fmtMes(f.competencia) || '?'}</b>. Total: <b>R$ {fmt(num(f.valor) * (parseInt(parcelaTotal, 10) || 0))}</b>.</>}
            </div>
          </div>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Campo label="Lançamento *" full><input value={f.descricao} onChange={e => setF({ ...f, descricao: e.target.value })} placeholder="Ex: ALUGUEL GARAGEM" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
        <Campo label={parcelado ? 'Competência inicial *' : 'Competência *'}><input type="month" value={f.competencia} onChange={e => setF({ ...f, competencia: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
        {!parcelado && <Campo label="Tipo"><select value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm">{TIPOS_DESPESA.map(t => <option key={t} value={t}>{t}</option>)}</select></Campo>}
        <Campo label={parcelado ? 'Valor por parcela (R$) *' : 'Valor (R$) *'}><input type="number" step="0.01" value={f.valor} onChange={e => setF({ ...f, valor: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
        <Campo label="Origem *"><select value={f.origem} onChange={e => setF({ ...f, origem: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm"><option value="MANHÃES">MANHÃES</option><option value="RICARDO">RICARDO</option></select></Campo>
        {!parcelado && <Campo label="Status"><select value={f.status} onChange={e => setF({ ...f, status: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm"><option value="pendente">Pendente</option><option value="pago">Pago</option></select></Campo>}
        <Campo label="Observações" full><textarea value={f.observacoes} onChange={e => setF({ ...f, observacoes: e.target.value })} rows={2} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
      </div>
      <div className="flex justify-end gap-2 mt-4"><button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button><button onClick={submit} className={`px-4 py-2 rounded-lg text-sm font-medium ${parcelado ? 'bg-purple-600 hover:bg-purple-500' : 'bg-violet-600 hover:bg-violet-500'}`}>{parcelado ? (isEdicao ? `Migrar para ${parcelaTotal} parcelas` : `Criar ${parcelaTotal} parcelas`) : 'Salvar'}</button></div>
    </ModalBase>
  );
}

// ============ MODAL VALE/ADIANTAMENTO ============
function ModalDesconto({ dados, clientes, funcionarios, onSave, onClose }) {
  const [f, setF] = useState(dados || { competencia: mesAtual(), alvoNome: '', tipoVale: 'VALE', valor: 0, centroCusto: '', formaPagamento: 'CARTÃO CORPORATIVO', observacoes: '' });
  const isEdicao = !!dados?.id;
  const [parcelado, setParcelado] = useState(false);
  const [parcelaTotal, setParcelaTotal] = useState(6);
  const submit = () => {
    if (!f.competencia) return alert('Competência é obrigatória');
    if (!f.alvoNome) return alert('Beneficiário é obrigatório');
    if (!num(f.valor)) return alert('Valor deve ser maior que zero');
    if (parcelado && (!parcelaTotal || parcelaTotal < 2)) return alert('Total de parcelas deve ser >= 2');
    if (parcelado && isEdicao && !window.confirm(`Converter este vale em ${parcelaTotal} parcelas?\n\nO vale atual será apagado e substituído por ${parcelaTotal} novas parcelas (1ª na mesma competência).`)) return;
    onSave(parcelado ? { ...f, __parcelado: true, parcelaTotal: parseInt(parcelaTotal, 10) } : f);
  };
  const funcAtivos = funcionarios.filter(x => x.status === 'ATIVO').map(x => x.nome).sort();
  return (
    <ModalBase titulo={dados ? 'Editar vale/adiantamento' : 'Novo vale/adiantamento'} onClose={onClose}>
      <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2 text-xs text-slate-600 mb-3">
        ℹ Será descontado automaticamente da folha de <b>{f.alvoNome || '(beneficiário)'}</b> {parcelado ? <>em <b>{parcelaTotal}</b> competências consecutivas a partir de <b>{fmtMes(f.competencia)}</b></> : <>na competência <b>{fmtMes(f.competencia)}</b></>}.
      </div>
      <div className={`mb-3 rounded-lg border ${parcelado ? 'bg-purple-500/10 border-purple-500/40' : 'bg-white border-slate-200'} p-3`}>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input type="checkbox" checked={parcelado} onChange={e => setParcelado(e.target.checked)} className="w-4 h-4 accent-purple-500" />
          <span className="font-medium">{isEdicao ? 'Converter em vale parcelado' : 'Vale parcelado'}</span>
        </label>
        {parcelado && (
          <div className="mt-2 grid sm:grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-[11px] text-slate-400 mb-1">Total de parcelas *</div>
              <input type="number" min="2" max="360" value={parcelaTotal} onChange={e => setParcelaTotal(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2 text-slate-400 self-end pb-1">
              {isEdicao
                ? <>Apaga este vale e desconta <b>R$ {fmt(num(f.valor))}</b> em <b>{parcelaTotal || '?'}</b> folhas. Total: <b>R$ {fmt(num(f.valor) * (parseInt(parcelaTotal, 10) || 0))}</b>.</>
                : <>Desconta <b>R$ {fmt(num(f.valor))}</b> em <b>{parcelaTotal || '?'}</b> folhas. Total: <b>R$ {fmt(num(f.valor) * (parseInt(parcelaTotal, 10) || 0))}</b>.</>}
            </div>
          </div>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Campo label="Beneficiário (funcionário) *" full><input list="lista-benef" value={f.alvoNome} onChange={e => setF({ ...f, alvoNome: e.target.value })} placeholder="Digite ou selecione..." className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /><datalist id="lista-benef">{funcAtivos.map(c => <option key={c} value={c} />)}</datalist></Campo>
        <Campo label={parcelado ? 'Competência inicial *' : 'Competência *'}><input type="month" value={f.competencia} onChange={e => setF({ ...f, competencia: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
        <Campo label="Tipo"><select value={f.tipoVale} onChange={e => setF({ ...f, tipoVale: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm">{TIPOS_VALE.map(t => <option key={t} value={t}>{t}</option>)}</select></Campo>
        <Campo label={parcelado ? 'Valor por parcela (R$) *' : 'Valor (R$) *'}><input type="number" step="0.01" value={f.valor} onChange={e => setF({ ...f, valor: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
        <Campo label="Centro de Custo"><input list="lista-cc-vale" value={f.centroCusto} onChange={e => setF({ ...f, centroCusto: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /><datalist id="lista-cc-vale">{CENTROS_CUSTO.map(c => <option key={c} value={c} />)}</datalist></Campo>
        <Campo label="Forma de Pagamento"><input list="lista-fp-vale" value={f.formaPagamento} onChange={e => setF({ ...f, formaPagamento: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /><datalist id="lista-fp-vale">{FORMAS_PAGAMENTO_VALE.map(c => <option key={c} value={c} />)}</datalist></Campo>
        <Campo label="Observações" full><textarea value={f.observacoes} onChange={e => setF({ ...f, observacoes: e.target.value })} rows={2} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
      </div>
      <div className="flex justify-end gap-2 mt-4"><button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button><button onClick={submit} className={`px-4 py-2 rounded-lg text-sm font-medium ${parcelado ? 'bg-purple-600 hover:bg-purple-500' : 'bg-amber-600 hover:bg-amber-500'}`}>{parcelado ? (isEdicao ? `Migrar para ${parcelaTotal} parcelas` : `Criar ${parcelaTotal} parcelas`) : 'Salvar'}</button></div>
    </ModalBase>
  );
}

// ============ v97 — MODAL PROPOSTA COMERCIAL ============
function ModalProposta({ dados, clientes, servicos, onSave, onClose }) {
  const isEdicao = !!dados?.id;
  const isAceita = dados?.status === 'Aceita';
  const isRejeitada = dados?.status === 'Rejeitada';
  const readOnly = isAceita || isRejeitada;

  // Mapeia itens existentes (vindos da API) pra forma editável
  const itensIniciais = (dados?.itens || []).map(it => ({
    _id: it.id,
    _modoCatalogo: !!it.servico_origem_id, // infer: se veio do catálogo, começa em modo catálogo
    descricao: it.descricao || '',
    quantidade: num(it.quantidade ?? 1),
    valor_unitario: num(it.valor_unitario ?? 0),
    valor_total: num(it.valor_total ?? 0),
    efetivo: it.efetivo || '',
    escala: it.escala || '',
    servico_origem_id: it.servico_origem_id || null,
    template: it.template || null,
    categoria_servico: it.categoria_servico || null,
    franquia_horas: num(it.franquia_horas ?? 0),
    franquia_km: num(it.franquia_km ?? 0),
    hora_extra_fatura: num(it.hora_extra_fatura ?? 0),
    km_extra_fatura: num(it.km_extra_fatura ?? 0),
    adicional_domingos_fatura: num(it.adicional_domingos_fatura ?? 0),
    aliquota: num(it.aliquota ?? 0),
    servico_id: it.servico_id || null,
  }));

  const [f, setF] = useState({
    id: dados?.id,
    cliente_id: dados?.cliente_id || '',
    cliente_nome: dados?.cliente_nome || '',
    cliente_cnpj: dados?.cliente_cnpj || '',
    cliente_email: dados?.cliente_email || '',
    categoria: dados?.categoria || 'ESCOLTA',
    prestador: dados?.prestador || '',
    condicoes_comerciais: dados?.condicoes_comerciais || '',
    condicoes_faturamento: dados?.condicoes_faturamento || '',
    prazos: dados?.prazos || '',
    vencimento: dados?.vencimento || '',
    observacoes: dados?.observacoes || '',
  });
  const [itens, setItens] = useState(itensIniciais.length > 0 ? itensIniciais : [{
    _modoCatalogo: false,
    descricao: '', quantidade: 1, valor_unitario: 0, valor_total: 0,
    efetivo: '', escala: '',
    franquia_horas: 0, franquia_km: 0, hora_extra_fatura: 0, km_extra_fatura: 0,
    adicional_domingos_fatura: 0, aliquota: 0,
  }]);

  const valorTotal = itens.reduce((s, it) => s + num(it.valor_total || 0), 0);

  const adicionarItem = () => {
    const base = {
      _modoCatalogo: false,
      descricao: '', quantidade: 1, valor_unitario: 0, valor_total: 0,
      franquia_horas: 0, franquia_km: 0, hora_extra_fatura: 0, km_extra_fatura: 0,
      adicional_domingos_fatura: 0, aliquota: 0,
    };
    if (f.categoria === 'ESCOLTA') {
      setItens([...itens, { ...base, servico_origem_id: null, template: null, categoria_servico: null }]);
    } else if (f.categoria === 'FACILITIES') {
      setItens([...itens, { ...base, efetivo: '', escala: '' }]);
    } else {
      setItens([...itens, { ...base }]);
    }
  };

  const removerItem = (idx) => setItens(itens.filter((_, i) => i !== idx));

  const atualizarItem = (idx, campo, valor) => {
    const novo = [...itens];
    novo[idx] = { ...novo[idx], [campo]: valor };
    // Recalcula valor_total quando quantidade ou unitário mudam
    if (campo === 'quantidade' || campo === 'valor_unitario') {
      novo[idx].valor_total = roundMoney(num(novo[idx].quantidade) * num(novo[idx].valor_unitario));
    }
    setItens(novo);
  };

  const popularDeServico = (idx, codigoOuId) => {
    const svc = servicos.find(s => String(s.cod) === String(codigoOuId) || String(s.id) === String(codigoOuId) || String(s._apiId) === String(codigoOuId));
    if (!svc) return;
    const novo = [...itens];
    novo[idx] = {
      ...novo[idx],
      _modoCatalogo: true,
      descricao: svc.descricao,
      valor_unitario: num(svc.valorFatura || 0),
      valor_total: roundMoney(num(novo[idx].quantidade || 1) * num(svc.valorFatura || 0)),
      servico_origem_id: svc._apiId || svc.id,
      template: svc.template || null,
      categoria_servico: svc.categoriaServico || null,
      franquia_horas: num(svc.franquiaHoras || 0),
      franquia_km: num(svc.franquiaKm || 0),
      hora_extra_fatura: num(svc.horaExtraFatura || 0),
      km_extra_fatura: num(svc.kmExtraFatura || 0),
      adicional_domingos_fatura: num(svc.adicionalDomingosFatura || 0),
      aliquota: num(svc.aliquota || 0),
    };
    setItens(novo);
  };

  const submit = () => {
    if (readOnly) { alert('Proposta em estado imutável (Aceita/Rejeitada)'); return; }
    if (!f.cliente_cnpj?.trim()) return alert('CNPJ do tomador é obrigatório (usado pra validar o aceite virtual)');
    const cnpjLimpo = String(f.cliente_cnpj).replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) return alert('CNPJ inválido (precisa de 14 dígitos)');
    if (!f.categoria) return alert('Categoria obrigatória');
    if (itens.length === 0) return alert('Adicione ao menos 1 item');
    if (itens.some(it => !it.descricao?.trim())) return alert('Todos os itens precisam de descrição');
    if (itens.some(it => num(it.valor_total) <= 0)) return alert('Todos os itens precisam de valor > 0');
    onSave({ ...f, cliente_cnpj: cnpjLimpo, itens });
  };

  const titulo = isEdicao
    ? (readOnly ? `Visualizar proposta ${dados.numero_formatado}` : `Editar proposta ${dados.numero_formatado}`)
    : 'Nova proposta comercial';

  return (
    <ModalBase titulo={titulo} onClose={onClose}>
      {readOnly && (
        <div className={`mb-3 rounded-lg p-3 text-sm ${isAceita ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-300' : 'bg-red-500/10 border border-red-500/40 text-red-300'}`}>
          {isAceita ? <><b>Proposta aceita</b>{dados.data_aceite ? ` em ${new Date(dados.data_aceite).toLocaleString('pt-BR')}` : ''} — campos imutáveis. Use o botão "Criar serviços" pra converter os itens no catálogo.</> : <><b>Proposta rejeitada</b> — arquivada.</>}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <Campo label="Cliente (catálogo)" full>
          <select value={f.cliente_id} onChange={e => {
            const id = e.target.value;
            const cli = clientes.find(c => String(c.id) === id || String(c._apiId) === id);
            setF({ ...f, cliente_id: id || '', cliente_nome: cli?.razaoSocial || cli?.nome || f.cliente_nome, cliente_cnpj: cli?.cnpj || f.cliente_cnpj, cliente_email: cli?.email || f.cliente_email });
          }} disabled={readOnly} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm">
            <option value="">— Cliente avulso (preencher manualmente) —</option>
            {clientes.map(c => <option key={c.id} value={c._apiId || c.id}>{c.razaoSocial || c.nome}</option>)}
          </select>
        </Campo>
        <Campo label="Razão social / nome do cliente" full><input value={f.cliente_nome} onChange={e => setF({ ...f, cliente_nome: e.target.value })} disabled={readOnly} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
        <Campo label="CNPJ do tomador *"><input value={f.cliente_cnpj} onChange={e => setF({ ...f, cliente_cnpj: e.target.value })} disabled={readOnly} placeholder="00.000.000/0000-00" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono" /></Campo>
        <Campo label="E-mail (envio do link de aceite)"><input type="email" value={f.cliente_email} onChange={e => setF({ ...f, cliente_email: e.target.value })} disabled={readOnly} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
        <Campo label="Categoria *"><select value={f.categoria} onChange={e => setF({ ...f, categoria: e.target.value })} disabled={readOnly} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm">
          <option value="ESCOLTA">ESCOLTA (catálogo de serviços)</option>
          <option value="FACILITIES">FACILITIES (manual: efetivo + escala)</option>
          <option value="EVENTOS">EVENTOS (livre — campos editáveis)</option>
          <option value="OUTROS">OUTROS (livre — campos editáveis)</option>
        </select></Campo>
        <Campo label="Vencimento"><input value={f.vencimento} onChange={e => setF({ ...f, vencimento: e.target.value })} disabled={readOnly} placeholder="Ex: 30 dias / à vista / data" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
        <Campo label="Prestador do serviço" full>
          <select value={f.prestador} onChange={e => setF({ ...f, prestador: e.target.value })} disabled={readOnly} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm">
            <option value="">— Selecionar prestador —</option>
            {PRESTADORES_PROPOSTA.map(p => <option key={p.cnpj} value={p.nome}>{p.nome} — {p.cnpj}</option>)}
          </select>
        </Campo>
        <Campo label="Objeto da proposta" full><textarea value={f.condicoes_comerciais} onChange={e => setF({ ...f, condicoes_comerciais: e.target.value })} disabled={readOnly} rows={2} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
        <Campo label="Condições de faturamento" full><textarea value={f.condicoes_faturamento} onChange={e => setF({ ...f, condicoes_faturamento: e.target.value })} disabled={readOnly} rows={2} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
        <Campo label="Prazos" full><textarea value={f.prazos} onChange={e => setF({ ...f, prazos: e.target.value })} disabled={readOnly} rows={2} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
        <Campo label="Observações" full><textarea value={f.observacoes} onChange={e => setF({ ...f, observacoes: e.target.value })} disabled={readOnly} rows={2} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
      </div>

      {/* Itens */}
      <div className="mt-5 mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Itens da proposta ({f.categoria})</h3>
        {!readOnly && <button onClick={adicionarItem} type="button" className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" />Adicionar item</button>}
      </div>
      <div className="space-y-2">
        {itens.map((it, idx) => {
          const jaConvertido = !!it.servico_id;
          return (
            <div key={idx} className={`bg-white border ${jaConvertido ? 'border-emerald-500/40' : 'border-slate-200'} rounded p-3`}>
              {jaConvertido && <div className="text-[10px] text-emerald-600 mb-1.5">✓ Já convertido em serviço do catálogo</div>}
              {f.categoria === 'ESCOLTA' && !readOnly && (
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[11px] text-slate-400">Tipo de item:</span>
                  <button type="button" onClick={() => atualizarItem(idx, '_modoCatalogo', false)} className={`text-[11px] px-2 py-1 rounded ${!it._modoCatalogo ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Personalizado</button>
                  <button type="button" onClick={() => atualizarItem(idx, '_modoCatalogo', true)} className={`text-[11px] px-2 py-1 rounded ${it._modoCatalogo ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Do catálogo</button>
                </div>
              )}
              <div className="grid sm:grid-cols-12 gap-2 items-end">
                {f.categoria === 'ESCOLTA' && !readOnly && it._modoCatalogo && (
                  <div className="sm:col-span-3">
                    <div className="text-[10px] text-slate-400 mb-0.5">Selecionar do catálogo</div>
                    <select onChange={e => popularDeServico(idx, e.target.value)} value="" className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-xs">
                      <option value="">— escolher —</option>
                      {servicos.map(s => <option key={s.id} value={s._apiId || s.id}>{s.cod} · {s.descricao}</option>)}
                    </select>
                  </div>
                )}
                <div className={f.categoria === 'ESCOLTA' && !readOnly && it._modoCatalogo ? 'sm:col-span-3' : 'sm:col-span-5'}>
                  <div className="text-[10px] text-slate-400 mb-0.5">Descrição *</div>
                  <input value={it.descricao} onChange={e => atualizarItem(idx, 'descricao', e.target.value)} disabled={readOnly} className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-xs" />
                </div>
                <div className="sm:col-span-2">
                  <div className="text-[10px] text-slate-400 mb-0.5">Qtd</div>
                  <input type="number" step="0.01" value={it.quantidade} onChange={e => atualizarItem(idx, 'quantidade', e.target.value)} disabled={readOnly} className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-xs" />
                </div>
                <div className="sm:col-span-2">
                  <div className="text-[10px] text-slate-400 mb-0.5">Unit. (R$)</div>
                  <input type="number" step="0.01" value={it.valor_unitario} onChange={e => atualizarItem(idx, 'valor_unitario', e.target.value)} disabled={readOnly} className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-xs" />
                </div>
                <div className={f.categoria === 'ESCOLTA' && !readOnly && it._modoCatalogo ? 'sm:col-span-1' : 'sm:col-span-2'}>
                  <div className="text-[10px] text-slate-400 mb-0.5">Total (R$)</div>
                  <input type="number" step="0.01" value={it.valor_total} onChange={e => atualizarItem(idx, 'valor_total', e.target.value)} disabled={readOnly} className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-xs font-semibold" />
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  {!readOnly && itens.length > 1 && (
                    <button onClick={() => removerItem(idx)} type="button" className="p-1.5 hover:bg-red-900/40 text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </div>
              {f.categoria === 'FACILITIES' && (
                <div className="grid sm:grid-cols-2 gap-2 mt-2">
                  <div>
                    <div className="text-[10px] text-slate-400 mb-0.5">Efetivo</div>
                    <input type="number" min="0" value={it.efetivo} onChange={e => atualizarItem(idx, 'efetivo', e.target.value)} disabled={readOnly} className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-xs" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 mb-0.5">Escala</div>
                    <input value={it.escala} onChange={e => atualizarItem(idx, 'escala', e.target.value)} disabled={readOnly} placeholder="Ex: 12x36, diurno..." className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-xs" />
                  </div>
                </div>
              )}
              {f.categoria === 'ESCOLTA' && (
                <div className="mt-2 p-2 bg-white border border-slate-200 rounded">
                  <div className="text-[10px] text-indigo-600 font-semibold mb-1.5 uppercase tracking-wide">Valores excedentes</div>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">Franquia horas</div>
                      <input type="number" step="0.01" min="0" value={it.franquia_horas ?? 0} onChange={e => atualizarItem(idx, 'franquia_horas', e.target.value)} disabled={readOnly} className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-xs" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">H. extra fatura (R$/h)</div>
                      <input type="number" step="0.01" min="0" value={it.hora_extra_fatura ?? 0} onChange={e => atualizarItem(idx, 'hora_extra_fatura', e.target.value)} disabled={readOnly} className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-xs" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">Alíquota (%)</div>
                      <input type="number" step="0.01" min="0" max="100" value={it.aliquota ?? 0} onChange={e => atualizarItem(idx, 'aliquota', e.target.value)} disabled={readOnly} className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-xs" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">Franquia km</div>
                      <input type="number" step="0.01" min="0" value={it.franquia_km ?? 0} onChange={e => atualizarItem(idx, 'franquia_km', e.target.value)} disabled={readOnly} className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-xs" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">KM extra fatura (R$/km)</div>
                      <input type="number" step="0.01" min="0" value={it.km_extra_fatura ?? 0} onChange={e => atualizarItem(idx, 'km_extra_fatura', e.target.value)} disabled={readOnly} className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-xs" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">Adicional dom./feriado (R$)</div>
                      <input type="number" step="0.01" min="0" value={it.adicional_domingos_fatura ?? 0} onChange={e => atualizarItem(idx, 'adicional_domingos_fatura', e.target.value)} disabled={readOnly} className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-xs" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-right">
        <span className="text-xs text-slate-400">Valor total da proposta:</span>{' '}
        <span className="text-lg font-bold text-indigo-400">R$ {fmt(valorTotal)}</span>
      </div>

      <div className="flex justify-between items-center mt-4">
        <div>
          {isEdicao && <button onClick={() => gerarPropostaPDF({ ...f, itens, numero_formatado: dados?.numero_formatado, criado_em: dados?.criado_em })} className="px-3 py-2 rounded-lg text-sm bg-rose-700 hover:bg-rose-600 flex items-center gap-1.5"><Printer className="w-4 h-4" />Gerar PDF</button>}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">{readOnly ? 'Fechar' : 'Cancelar'}</button>
          {!readOnly && <button onClick={submit} className="px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 font-medium">{isEdicao ? 'Salvar alterações' : 'Criar proposta'}</button>}
        </div>
      </div>
    </ModalBase>
  );
}

// ============ v97 — MODAL CRIAR SERVIÇOS A PARTIR DE PROPOSTA ============
function ModalCriarServicosDeProposta({ proposta, clientes, onCriar, onClose }) {
  const itens = proposta?.itens || [];
  const naoConvertidos = itens.filter(it => !it.servico_id);
  const convertidos = itens.filter(it => it.servico_id);

  // State: por item, controla se está marcado + dados do serviço gerado
  // v98: usa valores operacionais já capturados no proposta_itens como default
  const [selecionados, setSelecionados] = useState(() => {
    const out = {};
    naoConvertidos.forEach((it) => {
      out[it.id] = {
        marcado: true,
        codigo: '',
        cliente_id: proposta?.cliente_id || '',
        template: it.template || 'TOMBINI',
        categoria_servico: it.categoria_servico || (proposta?.categoria === 'FACILITIES' ? 'FACILITIES' : proposta?.categoria === 'OUTROS' ? 'OUTROS' : 'VELADA SP'),
        valor_fatura: num(it.valor_unitario || 0),
        aliquota: num(it.aliquota || 0),
        franquia_horas: num(it.franquia_horas || 0),
        franquia_km: num(it.franquia_km || 0),
        hora_extra_fatura: num(it.hora_extra_fatura || 0),
        km_extra_fatura: num(it.km_extra_fatura || 0),
        adicional_domingos_fatura: num(it.adicional_domingos_fatura || 0),
      };
    });
    return out;
  });

  const toggleItem = (id) => {
    setSelecionados(prev => ({ ...prev, [id]: { ...prev[id], marcado: !prev[id].marcado } }));
  };

  const atualizar = (id, campo, valor) => {
    setSelecionados(prev => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }));
  };

  const submit = () => {
    const itensPayload = naoConvertidos
      .filter(it => selecionados[it.id]?.marcado)
      .map(it => {
        const sel = selecionados[it.id];
        if (!sel.codigo?.trim()) throw new Error(`Código obrigatório no item "${it.descricao}"`);
        if (!sel.cliente_id) throw new Error(`Cliente obrigatório no item "${it.descricao}"`);
        return {
          id: it.id,
          codigo: sel.codigo.trim(),
          cliente_id: parseInt(sel.cliente_id, 10),
          template: sel.template,
          categoria_servico: sel.categoria_servico,
          valor_fatura: num(sel.valor_fatura),
          aliquota: num(sel.aliquota),
          franquia_horas: num(sel.franquia_horas),
          franquia_km: num(sel.franquia_km),
          hora_extra_fatura: num(sel.hora_extra_fatura),
          km_extra_fatura: num(sel.km_extra_fatura),
          adicional_domingos_fatura: num(sel.adicional_domingos_fatura),
        };
      });
    if (itensPayload.length === 0) return alert('Marque ao menos 1 item');
    try {
      onCriar({ propostaId: proposta.id, itens: itensPayload });
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <ModalBase titulo={`Criar serviços — ${proposta.numero_formatado}`} onClose={onClose}>
      <p className="text-xs text-slate-400 mb-3">
        Marque os itens da proposta que devem virar entradas no catálogo de serviços. Cada item gera 1 serviço (1:1). Itens já convertidos ficam desabilitados.
      </p>

      {convertidos.length > 0 && (
        <div className="mb-3 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs">
          ✓ <b>{convertidos.length}</b> item(ns) já convertidos anteriormente.
        </div>
      )}

      {naoConvertidos.length === 0 ? (
        <div className="text-center text-slate-400 text-sm py-6">Todos os itens já foram convertidos pro catálogo.</div>
      ) : (
        <div className="space-y-2">
          {naoConvertidos.map(it => {
            const sel = selecionados[it.id];
            return (
              <div key={it.id} className={`border rounded p-3 ${sel?.marcado ? 'bg-indigo-500/5 border-indigo-500/40' : 'bg-slate-50 border-slate-200'}`}>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!sel?.marcado} onChange={() => toggleItem(it.id)} className="mt-1 w-4 h-4 accent-indigo-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{it.descricao}</div>
                    <div className="text-[10px] text-slate-400">Valor unit.: R$ {fmt(it.valor_unitario)} · Qtd: {it.quantidade}</div>
                  </div>
                </label>
                {sel?.marcado && (
                  <div className="grid sm:grid-cols-3 gap-2 mt-2 ml-6">
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">Código *</div>
                      <input value={sel.codigo} onChange={e => atualizar(it.id, 'codigo', e.target.value)} placeholder="Ex: 9050" className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">Cliente *</div>
                      <select value={sel.cliente_id} onChange={e => atualizar(it.id, 'cliente_id', e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs">
                        <option value="">—</option>
                        {clientes.map(c => <option key={c.id} value={c._apiId || c.id}>{c.razaoSocial || c.nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">Template</div>
                      <select value={sel.template} onChange={e => atualizar(it.id, 'template', e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs">
                        <option>TOMBINI</option>
                        <option>ESCOLTECH</option>
                        <option>BRK</option>
                        <option>NATURA_NOTURNA</option>
                        <option>NATURA_MOTOLINK</option>
                        <option>IRB_ITRACKER</option>
                      </select>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">Categoria</div>
                      <select value={sel.categoria_servico} onChange={e => atualizar(it.id, 'categoria_servico', e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs">
                        <option>VELADA SP</option>
                        <option>VELADA RJ</option>
                        <option>MOTOLINK RJ</option>
                        <option>ARMADA</option>
                        <option>FACILITIES</option>
                        <option>OUTROS</option>
                      </select>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">Valor Fatura (R$)</div>
                      <input type="number" step="0.01" value={sel.valor_fatura} onChange={e => atualizar(it.id, 'valor_fatura', e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">Alíquota (%)</div>
                      <input type="number" step="0.01" value={sel.aliquota} onChange={e => atualizar(it.id, 'aliquota', e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">Franquia horas</div>
                      <input type="number" step="0.01" value={sel.franquia_horas} onChange={e => atualizar(it.id, 'franquia_horas', e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">Franquia km</div>
                      <input type="number" step="0.01" value={sel.franquia_km} onChange={e => atualizar(it.id, 'franquia_km', e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">H. extra fatura (R$)</div>
                      <input type="number" step="0.01" value={sel.hora_extra_fatura} onChange={e => atualizar(it.id, 'hora_extra_fatura', e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">KM extra fatura (R$)</div>
                      <input type="number" step="0.01" value={sel.km_extra_fatura} onChange={e => atualizar(it.id, 'km_extra_fatura', e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs" />
                    </div>
                    <div className="sm:col-span-3">
                      <div className="text-[10px] text-slate-400 mb-0.5">Adicional dom. fatura (R$)</div>
                      <input type="number" step="0.01" value={sel.adicional_domingos_fatura} onChange={e => atualizar(it.id, 'adicional_domingos_fatura', e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button>
        {naoConvertidos.length > 0 && <button onClick={submit} className="px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 font-medium">Criar serviços marcados</button>}
      </div>
    </ModalBase>
  );
}

// ============ MODAL DETALHE FOLHA ============
function ModalDetalheFolha({ dados, onSave, onProcessar, onRecibo, onClose }) {
  const [ajustes, setAjustes] = useState(dados.ajustes || []);
  const [status, setStatus] = useState(dados.status || 'aberta');
  const [novo, setNovo] = useState({ tipo: 'adicional', descricao: '', valor: '' });
  const f = dados.funcionario;
  const adicionais = ajustes.filter(a => a.tipo === 'adicional').reduce((s, a) => s + num(a.valor), 0);
  const descontosManuais = ajustes.filter(a => a.tipo === 'desconto').reduce((s, a) => s + num(a.valor), 0);
  const totalVales = num(dados.totalVales);
  const descontosTotal = descontosManuais + totalVales;
  // v81: bruto = lançamentos + avulsos; líquido = bruto + adicionais − descontos
  const totalDiarias = num(dados.totalDiariasAvulsas);
  const bruto = dados.total + totalDiarias;
  const liquido = bruto + adicionais - descontosTotal;
  const adicionar = () => { if (!novo.descricao || !num(novo.valor)) return; setAjustes(a => [...a, { id: `A${Date.now()}`, ...novo, valor: num(novo.valor) }]); setNovo({ tipo: 'adicional', descricao: '', valor: '' }); };
  const remover = (id) => setAjustes(a => a.filter(x => x.id !== id));
  const salvar = () => { onSave({ funcionarioId: f.id, periodo: dados.periodo, ajustes, status, dataPagamento: status === 'paga' ? new Date().toISOString() : null }); onClose(); };
  return (
    <ModalBase titulo={`${f.nome} · ${fmtMes(dados.periodo)}`} onClose={onClose} grande>
      <div className="grid sm:grid-cols-2 gap-3 text-sm mb-4">
        <div className="bg-slate-50 rounded p-3"><div className="text-xs text-slate-400 uppercase mb-1">Funcionário</div><div className="font-semibold">{f.nome}</div><div className="text-xs text-slate-500">{f.categoria}</div>{f.cpf && <div className="text-xs text-slate-500 font-mono mt-1">CPF {f.cpf}</div>}</div>
        <div className="bg-slate-50 rounded p-3"><div className="text-xs text-slate-400 uppercase mb-1">Pagamento</div>{f.chavePix ? <><div className="text-xs text-slate-500">{f.tipoPix}</div><div className="font-mono text-sm">{f.chavePix}</div></> : <div className="text-xs text-slate-500 italic">Pix não cadastrado</div>}</div>
      </div>
      <h4 className="text-xs uppercase font-semibold text-slate-400 mb-2">Lançamentos ({dados.lancs.length})</h4>
      <div className="overflow-x-auto mb-4 max-h-60">
        <table className="w-full text-xs">
          <thead className="text-[10px] text-slate-400 border-b border-slate-200"><tr><th className="text-left py-1.5 px-1">Data</th><th className="text-left px-1">Cliente</th><th className="text-left px-1">Serviço</th><th className="text-center px-1">Qtd</th><th className="text-right px-1">Pago</th></tr></thead>
          <tbody>{[...dados.lancs].sort((a, b) => a.data.localeCompare(b.data)).map(l => { const qtd = nomesNoLancamento(l).length || 1; return (<tr key={l.id} className="border-b border-slate-200"><td className="py-1 px-1">{fmtData(l.data)}</td><td className="px-1">{l.cliente}</td><td className="px-1">{l.descricao}</td><td className="text-center px-1">{qtd}</td><td className="text-right px-1 font-semibold">{fmt(l.totalPago)}</td></tr>); })}</tbody>
          <tfoot className="border-t border-slate-200 font-semibold"><tr><td colSpan={4} className="py-2 px-1 text-right">Subtotal:</td><td className="text-right px-1">{fmt(dados.total)}</td></tr></tfoot>
        </table>
      </div>
      <h4 className="text-xs uppercase font-semibold text-slate-400 mb-2">Adicionais e Descontos manuais</h4>
      {ajustes.length > 0 && <table className="w-full text-xs mb-2"><tbody>{ajustes.map(a => <tr key={a.id} className="border-b border-slate-200"><td className="py-1 px-1"><span className={`text-[10px] px-2 py-0.5 rounded-full ${a.tipo === 'adicional' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-600'}`}>{a.tipo}</span></td><td className="px-1">{a.descricao}</td><td className={`text-right px-1 ${a.tipo === 'adicional' ? 'text-emerald-600' : 'text-red-600'}`}>{a.tipo === 'adicional' ? '+' : '-'}{fmt(a.valor)}</td><td className="text-right px-1"><button onClick={() => remover(a.id)} className="p-1 hover:bg-red-900/40 text-red-600 rounded"><X className="w-3 h-3" /></button></td></tr>)}</tbody></table>}
      <div className="grid grid-cols-12 gap-2 mb-4">
        <select value={novo.tipo} onChange={e => setNovo({ ...novo, tipo: e.target.value })} className="col-span-3 bg-white border border-slate-200 rounded px-2 py-1.5 text-xs"><option value="adicional">Adicional</option><option value="desconto">Desconto</option></select>
        <input value={novo.descricao} onChange={e => setNovo({ ...novo, descricao: e.target.value })} placeholder="Descrição" className="col-span-5 bg-white border border-slate-200 rounded px-2 py-1.5 text-xs" />
        <input type="number" step="0.01" value={novo.valor} onChange={e => setNovo({ ...novo, valor: e.target.value })} placeholder="Valor" className="col-span-2 bg-white border border-slate-200 rounded px-2 py-1.5 text-xs" />
        <button onClick={adicionar} className="col-span-2 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-medium flex items-center justify-center gap-1"><Plus className="w-3 h-3" />Add</button>
      </div>
      {dados.vales && dados.vales.length > 0 && (<>
        <h4 className="text-xs uppercase font-semibold text-amber-600 mb-2">Vales/Adiantamentos da competência (descontados automaticamente)</h4>
        <table className="w-full text-xs mb-4">
          <thead className="text-[10px] text-slate-400 border-b border-slate-200"><tr><th className="text-left py-1 px-1">Tipo</th><th className="text-left px-1">C. Custo</th><th className="text-left px-1">Forma Pgto</th><th className="text-right px-1">Valor</th></tr></thead>
          <tbody>{dados.vales.map(v => <tr key={v.id} className="border-b border-slate-200"><td className="py-1 px-1"><span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">{v.tipoVale}</span></td><td className="px-1 text-slate-400">{v.centroCusto || '—'}</td><td className="px-1 text-slate-400">{v.formaPagamento || '—'}</td><td className="text-right px-1 text-red-600">-{fmt(v.valor)}</td></tr>)}</tbody>
          <tfoot className="border-t border-slate-200 font-semibold"><tr><td colSpan={3} className="py-1 px-1">Total vales</td><td className="text-right px-1 text-red-600">-{fmt(dados.totalVales)}</td></tr></tfoot>
        </table>
      </>)}
      <div className="bg-amber-500/10 border-2 border-amber-500 rounded-lg p-4">
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-sm">
          <div><div className="text-[10px] uppercase opacity-70">Atividade</div><div className="font-semibold">{fmt(dados.total)}</div></div>
          <div><div className="text-[10px] uppercase opacity-70">Lanç. Avulsos</div><div className="font-semibold text-blue-600">{fmt(totalDiarias)}</div></div>
          <div><div className="text-[10px] uppercase opacity-70">Bruto</div><div className="font-semibold">{fmt(bruto)}</div></div>
          <div><div className="text-[10px] uppercase opacity-70">Adicionais</div><div className="font-semibold text-emerald-600">+{fmt(adicionais)}</div></div>
          <div><div className="text-[10px] uppercase opacity-70">Descontos</div><div className="font-semibold text-red-600">-{fmt(descontosTotal)}</div></div>
          <div><div className="text-[10px] uppercase opacity-70">Líquido</div><div className="font-bold text-xl">{fmt(liquido)}</div></div>
        </div>
      </div>
      <div className="flex justify-between gap-2 mt-4 flex-wrap">
        <select value={status} onChange={e => setStatus(e.target.value)} className="bg-white border border-slate-200 rounded px-3 py-2 text-sm"><option value="pendente">Pendente</option><option value="transferido">Transferido</option><option value="pago">Pago</option><option value="cancelada">Cancelada</option></select>
        <div className="flex gap-2 flex-wrap">
          {onProcessar && <button onClick={() => { setStatus('processada'); onSave({ funcionarioId: dados.funcionario.id, periodo: dados.periodo, ajustes, status: 'processada', dataProcessamento: new Date().toISOString() }); onProcessar({ ...dados, ajustes, vales: dados.vales, totalVales: dados.totalVales, adicionais, descontos: descontosTotal, descontosManuais, liquido }); }} className="px-4 py-2 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-500 font-medium flex items-center gap-2"><Printer className="w-4 h-4" />Processar e gerar PDF</button>}
          {onRecibo && <button onClick={() => onRecibo({ ...dados, ajustes, vales: dados.vales, totalVales: dados.totalVales, adicionais, descontos: descontosTotal, descontosManuais, liquido })} className="px-4 py-2 rounded-lg text-sm bg-amber-600 hover:bg-amber-500 font-medium flex items-center gap-2"><Receipt className="w-4 h-4" />Gerar recibo</button>}
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button>
          <button onClick={salvar} className="px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 font-medium">Salvar</button>
        </div>
      </div>
    </ModalBase>
  );
}

// ============ MODAL DETALHE FATURA ============
function ModalDetalheFatura({ dados, servicos, onClose }) {
  const [vista, setVista] = useState('fatura');
  const t = TEMPLATES[dados.template];
  // v87: faturas XML (custom, sem lançamentos vinculados) → sintetiza um único item com o valor da fatura
  const itens = useMemo(() => {
    const lancs = [...(dados.lancs || [])].sort((a, b) => (a.data || '').localeCompare(b.data || ''));
    if (lancs.length === 0 && num(dados.totalFatura) > 0) {
      const dataItem = dados.dataLancamento || dados.dataInicio || `${(dados.periodo || '').slice(0, 7)}-01`;
      const desc = dados.observacoes || (dados.nfNumero ? `Nota Fiscal ${dados.nfNumero}` : 'Fatura importada (XML)');
      return [{ id: `XML-${dados.id || 'fatura'}`, data: dataItem, codServico: 'NF', descricao: desc, totalFatura: num(dados.totalFatura), totalPago: num(dados.totalPago), imposto: num(dados.totalImposto), horasExtras: 0, kmExtras: 0, pedagio: 0, extras: {} }];
    }
    return lancs;
  }, [dados]);
  const resumoServ = useMemo(() => { const m = {}; itens.forEach(l => { if (!m[l.codServico]) m[l.codServico] = { cod: l.codServico, descricao: l.descricao, qtd: 0, fatura: 0, pago: 0 }; m[l.codServico].qtd++; m[l.codServico].fatura += num(l.totalFatura); m[l.codServico].pago += num(l.totalPago); }); return Object.values(m).sort((a, b) => b.fatura - a.fatura); }, [itens]);
  const resumoAgente = useMemo(() => { const m = {}; itens.forEach(l => { const ag = l.extras?.agente1 || l.extras?.agente || l.extras?.motorista || '—'; if (!m[ag]) m[ag] = { agente: ag, qtd: 0, pago: 0, pedagio: 0 }; m[ag].qtd++; m[ag].pago += num(l.totalPago); m[ag].pedagio += t?.reembolsarPedagio ? num(l.pedagio) : 0; }); return Object.values(m).sort((a, b) => b.pago - a.pago); }, [itens, t]);
  const totalPedagio = itens.reduce((s, l) => s + num(l.pedagio), 0);
  return (
    <ModalBase titulo={`${dados.cliente} · ${fmtPeriodoCurto(dados.periodo, t)}`} onClose={onClose} grande>
      <div className="flex gap-1 border-b border-slate-200 mb-4 items-center">
        <button onClick={() => setVista('fatura')} className={`px-4 py-2 text-sm border-b-2 ${vista === 'fatura' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400'}`}>📄 Fatura</button>
        <button onClick={() => setVista('folha')} className={`px-4 py-2 text-sm border-b-2 ${vista === 'folha' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400'}`}>📋 Folha Mensal</button>
        <div className="ml-auto">
          <button onClick={() => exportarFaturaXLSX(dados, servicos || [])} className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"><Download className="w-3.5 h-3.5" />Exportar Excel</button>
        </div>
      </div>
      {vista === 'fatura' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 rounded p-3"><div className="text-xs text-slate-400 uppercase mb-1">Cliente</div><div className="font-semibold">{dados.cliente}</div><div className="text-xs text-slate-500">{itens[0]?.cnpj || ''}</div></div>
            <div className="bg-slate-50 rounded p-3"><div className="text-xs text-slate-400 uppercase mb-1">Período</div><div className="font-semibold">{fmtPeriodo(dados.periodo, t)}</div><div className="text-xs text-slate-500">{dados.qtd} lançamentos · {t?.nome}</div></div>
          </div>
          <div className="overflow-x-auto">
            <h4 className="text-xs uppercase font-semibold text-slate-400 mb-2">Resumo por Serviço</h4>
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-400 border-b border-slate-200"><tr><th className="text-left py-1.5">Cód.</th><th className="text-left">Serviço</th><th className="text-center">Qtd</th><th className="text-right">Faturado</th></tr></thead>
              <tbody>{resumoServ.map(r => <tr key={r.cod} className="border-b border-slate-200"><td className="py-1.5 font-mono text-xs">{r.cod}</td><td>{r.descricao}</td><td className="text-center">{r.qtd}</td><td className="text-right">{fmt(r.fatura)}</td></tr>)}</tbody>
            </table>
          </div>
          {totalPedagio > 0 && t?.incluirPedagioFatura && <div className="bg-cyan-500/10 border border-cyan-500/30 rounded p-2 text-xs flex justify-between"><span className="text-cyan-600">Pedágios incluídos no faturamento</span><span className="font-semibold">{fmt(totalPedagio)}</span></div>}
          <div className="bg-indigo-500/10 border-2 border-indigo-500 rounded-lg p-4 flex items-center justify-between"><div className="text-sm uppercase font-semibold">Total a Faturar</div><div className="text-2xl font-bold">{fmt(dados.totalFatura)}</div></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs"><Stat label="Faturado" valor={fmt(dados.totalFatura)} /><Stat label="Pago" valor={fmt(dados.totalPago)} cor="text-orange-400" /><Stat label="Imposto" valor={fmt((dados.lancs || []).reduce((s, l) => s + num(l.imposto), 0))} cor="text-amber-600" /><Stat label="Lucro" valor={fmt((dados.lancs || []).reduce((s, l) => s + (num(l.totalFatura) - num(l.totalPago) - num(l.imposto)), 0))} cor="text-emerald-600" /></div>
        </div>
      )}
      {vista === 'folha' && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <h4 className="text-xs uppercase font-semibold text-slate-400 mb-2">Lançamentos do período</h4>
            <table className="w-full text-xs">
              <thead className="text-[10px] text-slate-400 border-b border-slate-200"><tr><th className="text-left py-1.5 px-1">Data</th><th className="text-left px-1">Cód.</th>{(t?.campos || []).slice(0, 4).map(c => <th key={c.k} className="text-left px-1">{c.l}</th>)}<th className="text-right px-1">H.E</th><th className="text-right px-1">KM.E</th>{t?.incluirPedagioFatura && <th className="text-right px-1">Pedág.</th>}<th className="text-right px-1">Fatura</th></tr></thead>
              <tbody>{itens.map(l => (<tr key={l.id} className="border-b border-slate-200"><td className="py-1 px-1">{fmtData(l.data)}</td><td className="px-1 font-mono">{l.codServico}</td>{(t?.campos || []).slice(0, 4).map(c => { const v = l.extras?.[c.k]; return <td key={c.k} className="px-1 max-w-[120px] truncate" title={v}>{c.tipo === 'datetime' || c.tipo === 'time' ? fmtDateTime(v) : v || '—'}</td>; })}<td className="text-right px-1">{l.horasExtras > 0 ? l.horasExtras.toFixed(1) : '-'}</td><td className="text-right px-1">{l.kmExtras > 0 ? l.kmExtras : '-'}</td>{t?.incluirPedagioFatura && <td className="text-right px-1">{num(l.pedagio) > 0 ? fmt(l.pedagio) : '-'}</td>}<td className="text-right px-1">{fmt(l.totalFatura)}</td></tr>))}</tbody>
              <tfoot className="border-t border-slate-200 font-semibold"><tr><td colSpan={2 + Math.min(4, t?.campos?.length || 0)} className="py-2 px-1">Totais ({itens.length})</td><td className="text-right px-1">—</td><td className="text-right px-1">—</td>{t?.incluirPedagioFatura && <td className="text-right px-1">{fmt(totalPedagio)}</td>}<td className="text-right px-1">{fmt(dados.totalFatura)}</td></tr></tfoot>
            </table>
          </div>
          <div>
            <h4 className="text-xs uppercase font-semibold text-slate-400 mb-2">Resumo por Agente {t?.reembolsarPedagio && '(c/ reembolso)'}</h4>
            <table className="w-full text-xs">
              <thead className="text-[10px] text-slate-400 border-b border-slate-200"><tr><th className="text-left py-1">Agente</th><th className="text-center">Qtd</th><th className="text-right">Pago</th>{t?.reembolsarPedagio && <th className="text-right">Pedágio</th>}<th className="text-right">Total</th></tr></thead>
              <tbody>{resumoAgente.map(r => <tr key={r.agente} className="border-b border-slate-200"><td className="py-1">{r.agente}</td><td className="text-center">{r.qtd}</td><td className="text-right">{fmt(r.pago - (t?.reembolsarPedagio ? r.pedagio : 0))}</td>{t?.reembolsarPedagio && <td className="text-right">{fmt(r.pedagio)}</td>}<td className="text-right font-semibold">{fmt(r.pago)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
      <div className="flex justify-end mt-4"><button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Fechar</button></div>
    </ModalBase>
  );
}

// ============ MODAL FATURA POR INTERVALO ============
function ModalFaturaIntervalo({ clientes, proximoNumero, onSave, onClose }) {
  const hojeStr = hoje();
  const primeiroDoMes = hojeStr.slice(0, 7) + '-01';
  const [cliente, setCliente] = useState('');
  const [dataInicio, setDataInicio] = useState(primeiroDoMes);
  const [dataFim, setDataFim] = useState(hojeStr);
  const [competencia, setCompetencia] = useState(mesAtual());
  const submit = () => {
    if (!cliente) return alert('Selecione o cliente');
    if (!dataInicio || !dataFim) return alert('Informe as datas');
    if (dataInicio > dataFim) return alert('Data início maior que data fim');
    if (!competencia) return alert('Informe a competência');
    onSave({ cliente, dataInicio, dataFim, competencia });
  };
  return (
    <ModalBase titulo="Gerar fatura por intervalo de datas" onClose={onClose}>
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded p-3 text-xs text-slate-600 mb-4">
        Esta fatura receberá o número <b className="text-indigo-600">{proximoNumero}</b> e ficará registrada nos Fechamentos. Os lançamentos do intervalo serão marcados como fechados.
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Campo label="Cliente *" full>
          <select value={cliente} onChange={e => setCliente(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm">
            <option value="">Selecione...</option>
            {clientes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Campo>
        <Campo label="Data início *"><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
        <Campo label="Data fim *"><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
        <Campo label="Competência (para resumo) *" full><input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
      </div>
      <div className="flex justify-end gap-2 mt-4"><button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button><button onClick={submit} className="px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 font-medium">Gerar fatura {proximoNumero}</button></div>
    </ModalBase>
  );
}

// ============ MODAL ESCOLHER COMPETÊNCIA (para recibo) ============
function ModalEscolherCompetencia({ funcionario, folhasPorFunc, onSelecionar, onClose }) {
  const folhasFunc = useMemo(() => folhasPorFunc.filter(f => f.funcionario.id === funcionario.id), [folhasPorFunc, funcionario.id]);
  return (
    <ModalBase titulo={`Recibo de prestação — ${funcionario.nome}`} onClose={onClose}>
      <p className="text-sm text-slate-400 mb-3">Escolha a competência (folha processada). O recibo só pode ser gerado para competências com lançamentos faturados.</p>
      {folhasFunc.length === 0 ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 text-xs text-amber-300">
          Esta pessoa não tem folha em nenhuma competência. Certifique-se de que ela participou de algum lançamento que está dentro de uma fatura gerada.
        </div>
      ) : (
        <div className="space-y-1 max-h-80 overflow-auto">
          {folhasFunc.map(f => (
            <button key={f.periodo} onClick={() => onSelecionar(f)} className="w-full bg-white hover:bg-slate-100 border border-slate-200 rounded px-3 py-2.5 flex items-center justify-between text-left">
              <div>
                <div className="font-medium">{fmtMes(f.periodo)}</div>
                <div className="text-xs text-slate-400">{f.lancs.length} lançamento(s) · {f.status}</div>
              </div>
              <div className="text-right">
                <div className="text-amber-600 font-semibold">{fmt(f.liquido)}</div>
                <div className="text-[10px] text-slate-500">líquido</div>
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="flex justify-end mt-4"><button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button></div>
    </ModalBase>
  );
}

// ============ COMPONENTES DE IMPRESSÃO ============
function PrintStyles() {
  useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('mrsys-print-styles')) return;
    const style = document.createElement('style');
    style.id = 'mrsys-print-styles';
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        .print-only, .print-only * { visibility: visible !important; }
        .print-only { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: white !important; color: black !important; }
        .no-print { display: none !important; }
        .print-only table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .print-only th, .print-only td { border: 1px solid #cbd5e1; padding: 5px 7px; vertical-align: top; }
        .print-only th { background: #f1f5f9; font-weight: 600; text-align: left; }
        .print-only h1 { font-size: 18px; margin: 0 0 4px 0; }
        .print-only h2 { font-size: 13px; margin: 14px 0 6px 0; color: #4f46e5; padding-bottom: 3px; border-bottom: 1px solid #e2e8f0; }
        @page { margin: 16mm 12mm; size: A4; }
        .page-break { page-break-after: always; }
      }
    `;
    document.head.appendChild(style);
  }, []);
  return null;
}

function PrintModal({ titulo, onClose, children, paperSize = 'A4' }) {
  return (
    <>
      <PrintStyles />
      <div className="print-only fixed inset-0 z-[60] bg-white text-slate-900 overflow-auto">
        <div className="no-print sticky top-0 z-10 bg-slate-100 border-b border-slate-300 px-6 py-3 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2"><Printer className="w-5 h-5" />{titulo}</h2>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2"><Printer className="w-4 h-4" />Imprimir / Salvar PDF</button>
            <button onClick={onClose} className="bg-slate-300 hover:bg-slate-400 text-slate-900 px-4 py-2 rounded text-sm font-medium">Fechar</button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-8 py-8" style={{ fontFamily: '-apple-system, system-ui, "Segoe UI", sans-serif' }}>
          {children}
        </div>
      </div>
    </>
  );
}

// ============ FICHA DO FUNCIONÁRIO (PDF) ============
function ModalFichaFuncionarioPDF({ funcionario, onClose }) {
  const [foto, setFoto] = useState(null);
  useEffect(() => {
    if (funcionario.fotoMeta) getArquivoStorage(fotoKey(funcionario.id)).then(b => setFoto(b));
  }, [funcionario.id]);
  const f = funcionario;
  const linha = (rotulo, valor) => valor ? <tr><th style={{ width: '38%', background: '#f8fafc' }}>{rotulo}</th><td>{valor}</td></tr> : null;
  return (
    <PrintModal titulo={`Ficha cadastral — ${f.nome}`} onClose={onClose}>
      <div style={{ borderBottom: '3px solid #4f46e5', paddingBottom: '14px', marginBottom: '18px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {foto && <img src={foto} alt="Foto" style={{ width: '110px', height: '140px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0' }} />}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '22px', margin: '0 0 4px' }}>{f.nome}</h1>
          <div style={{ fontSize: '12px', color: '#64748b' }}>{f.categoria} · {f.status}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>ID: <span style={{ fontFamily: 'monospace' }}>{f.id}</span> · Cadastrado em {new Date(f.criadoEm || Date.now()).toLocaleDateString('pt-BR')}</div>
        </div>
      </div>

      <h2>Dados pessoais</h2>
      <table>
        <tbody>
          {linha('Nome completo', f.nome)}
          {linha('Categoria', f.categoria)}
          {linha('Data de nascimento', f.dataNascimento ? fmtData(f.dataNascimento) : null)}
          {linha('Estado civil', f.estadoCivil)}
          {linha('Nacionalidade', f.nacionalidade)}
          {linha('RG', f.rg)}
          {linha('CPF', f.cpf)}
        </tbody>
      </table>

      <h2>Contato</h2>
      <table>
        <tbody>
          {linha('Telefone', f.telefone)}
          {linha('E-mail', f.email)}
          {linha('Endereço', f.endereco)}
          {linha('Cidade / UF', [f.cidade, f.uf].filter(Boolean).join(' / '))}
          {linha('CEP', f.cep)}
        </tbody>
      </table>

      <h2>Pagamento</h2>
      <table>
        <tbody>
          {linha('Tipo de chave Pix', f.tipoPix)}
          {linha('Chave Pix', f.chavePix)}
          {linha('Valor diária fixa', num(f.valorDiaria) > 0 ? fmt(f.valorDiaria) : '— (proporcional)')}
        </tbody>
      </table>

      {(f.documentos || []).length > 0 && (
        <>
          <h2>Documentos anexos</h2>
          <table>
            <thead><tr><th>#</th><th>Nome do arquivo</th><th>Tamanho</th><th>Adicionado em</th></tr></thead>
            <tbody>
              {f.documentos.map((d, i) => (
                <tr key={d.id}>
                  <td style={{ width: '40px', textAlign: 'center' }}>{i + 1}</td>
                  <td>{d.nome}</td>
                  <td>{fmtTamanho(d.tamanho)}</td>
                  <td>{new Date(d.criadoEm).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {f.notas && (<><h2>Observações</h2><div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '4px', fontSize: '12px', whiteSpace: 'pre-wrap' }}>{f.notas}</div></>)}

      <div style={{ marginTop: '70px', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
        <div style={{ textAlign: 'center', borderTop: '1px solid #111', paddingTop: '4px', width: '46%' }}>
          {f.nome}<br /><span style={{ color: '#64748b' }}>Funcionário</span>
        </div>
        <div style={{ textAlign: 'center', borderTop: '1px solid #111', paddingTop: '4px', width: '46%' }}>
          Empresa<br /><span style={{ color: '#64748b' }}>Responsável</span>
        </div>
      </div>
      <div style={{ marginTop: '20px', fontSize: '10px', color: '#94a3b8', textAlign: 'right' }}>Gerado em {new Date().toLocaleString('pt-BR')}</div>
    </PrintModal>
  );
}

// ============ FOLHA CONSOLIDADA (PDF) ============
function ModalFolhaConsolidadaPDF({ folha, salarioFixo, onClose }) {
  const [foto, setFoto] = useState(null);
  useEffect(() => {
    if (folha.funcionario.fotoMeta) getArquivoStorage(fotoKey(folha.funcionario.id)).then(b => setFoto(b));
  }, [folha.funcionario.id]);
  const f = folha.funcionario;
  // Agrupa lançamentos por cliente
  const porCliente = useMemo(() => {
    const m = {};
    folha.lancs.forEach(l => {
      if (!m[l.cliente]) m[l.cliente] = { cliente: l.cliente, items: [], totalParticipacao: 0, totalDiarias: 0, totalHorasExtras: 0, totalKmExtras: 0, totalAdic: 0, totalOutros: 0, qtd: 0 };
      const part = valorParticipacao(f, l);
      const qtdAg = nomesNoLancamento(l).length || 1;
      m[l.cliente].items.push({ ...l, participacao: part, qtdAg });
      m[l.cliente].totalParticipacao += part;
      m[l.cliente].totalDiarias += num(l.totalPago) - num(l.extraHorasPaga) - num(l.extraKmPago) - num(l.adicDomPago) - num(l.pedagioReembolso);
      m[l.cliente].totalHorasExtras += num(l.extraHorasPaga);
      m[l.cliente].totalKmExtras += num(l.extraKmPago);
      m[l.cliente].totalAdic += num(l.adicDomPago);
      m[l.cliente].totalOutros += num(l.pedagioReembolso);
      m[l.cliente].qtd++;
    });
    return Object.values(m);
  }, [folha]);
  const sFixo = 0; // v62: salário fixo desconsiderado
  const totalAtividade = folha.total;
  const totalAvulsos = folha.totalDiariasAvulsas || 0;
  // v81: bruto = atividade + avulsos; líquido = bruto + adicionais − descontos
  const bruto = totalAtividade + totalAvulsos;
  const totalDescontos = folha.descontos;
  const liquido = bruto + folha.adicionais - totalDescontos;

  return (
    <PrintModal titulo={`Folha consolidada — ${f.nome} · ${fmtMes(folha.periodo)}`} onClose={onClose}>
      <div style={{ borderBottom: '3px solid #4f46e5', paddingBottom: '12px', marginBottom: '14px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {foto && <img src={foto} alt="" style={{ width: '70px', height: '90px', objectFit: 'cover', borderRadius: '4px' }} />}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '20px', margin: 0 }}>FOLHA DE PAGAMENTO</h1>
          <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>Competência: <b>{fmtMes(folha.periodo)}</b></div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>{f.nome} · {f.categoria}</div>
          {f.cpf && <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>CPF {f.cpf}</div>}
          {f.chavePix && <div style={{ fontSize: '11px', color: '#94a3b8' }}>Pix {f.tipoPix}: <span style={{ fontFamily: 'monospace' }}>{f.chavePix}</span></div>}
        </div>
      </div>

      {porCliente.map(c => (
        <div key={c.cliente}>
          <h2>{c.cliente} <span style={{ fontWeight: 'normal', color: '#64748b', fontSize: '11px' }}>· {c.qtd} operação(ões)</span></h2>
          <table>
            <thead>
              <tr>
                <th style={{ width: '70px' }}>Data</th>
                <th>Serviço</th>
                <th style={{ textAlign: 'center', width: '40px' }}>HE</th>
                <th style={{ textAlign: 'center', width: '40px' }}>KM-E</th>
                <th style={{ textAlign: 'center', width: '40px' }}>Dom</th>
                <th style={{ textAlign: 'right', width: '80px' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {c.items.sort((a, b) => a.data.localeCompare(b.data)).map(l => (
                <tr key={l.id}>
                  <td>{fmtData(l.data)}</td>
                  <td>{l.descricao}</td>
                  <td style={{ textAlign: 'center' }}>{num(l.horasExtras) > 0 ? fmtHorasHHMM(l.horasExtras) : '—'}</td>
                  <td style={{ textAlign: 'center' }}>{num(l.kmExtras) > 0 ? l.kmExtras : '—'}</td>
                  <td style={{ textAlign: 'center' }}>{l.isDomingo ? '✓' : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{fmt(l.participacao)}</td>
                </tr>
              ))}
              <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                <td colSpan={5} style={{ textAlign: 'right' }}>Subtotal {c.cliente}:</td>
                <td style={{ textAlign: 'right' }}>{fmt(c.totalParticipacao)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      <h2>Composição da folha</h2>
      <table>
        <tbody>
          <tr><td style={{ width: '60%' }}>Total recebido por atividade (lançamentos)</td><td style={{ textAlign: 'right' }}>{fmt(totalAtividade)}</td></tr>
          {totalAvulsos > 0 && <tr><td>(+) Lançamentos avulsos</td><td style={{ textAlign: 'right', color: '#15803d' }}>+{fmt(totalAvulsos)}</td></tr>}
          {sFixo > 0 && <tr><td>Salário fixo mensal</td><td style={{ textAlign: 'right' }}>{fmt(sFixo)}</td></tr>}
          <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}><td>(=) Bruto</td><td style={{ textAlign: 'right' }}>{fmt(bruto)}</td></tr>
          {folha.adicionais > 0 && <tr><td>(+) Adicionais manuais</td><td style={{ textAlign: 'right', color: '#15803d' }}>+{fmt(folha.adicionais)}</td></tr>}
          {folha.totalVales > 0 && <tr><td>(−) Vales / Adiantamentos</td><td style={{ textAlign: 'right', color: '#b91c1c' }}>−{fmt(folha.totalVales)}</td></tr>}
          {folha.descontosManuais > 0 && <tr><td>(−) Descontos manuais</td><td style={{ textAlign: 'right', color: '#b91c1c' }}>−{fmt(folha.descontosManuais)}</td></tr>}
          <tr style={{ background: '#fef3c7', fontWeight: 'bold' }}><td>(=) Líquido a pagar</td><td style={{ textAlign: 'right', fontSize: '14px' }}>{fmt(liquido)}</td></tr>
        </tbody>
      </table>

      {folha.vales && folha.vales.length > 0 && (<>
        <h2>Detalhe dos vales/adiantamentos</h2>
        <table>
          <thead><tr><th>Tipo</th><th>C. Custo</th><th>Forma de pagamento</th><th style={{ textAlign: 'right' }}>Valor</th></tr></thead>
          <tbody>
            {folha.vales.map(v => <tr key={v.id}><td>{v.tipoVale}</td><td>{v.centroCusto || '—'}</td><td>{v.formaPagamento || '—'}</td><td style={{ textAlign: 'right' }}>{fmt(v.valor)}</td></tr>)}
          </tbody>
        </table>
      </>)}

      <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
        <div style={{ textAlign: 'center', borderTop: '1px solid #111', paddingTop: '4px', width: '46%' }}>{f.nome}<br /><span style={{ color: '#64748b' }}>Funcionário</span></div>
        <div style={{ textAlign: 'center', borderTop: '1px solid #111', paddingTop: '4px', width: '46%' }}>Empresa<br /><span style={{ color: '#64748b' }}>Responsável</span></div>
      </div>
      <div style={{ marginTop: '16px', fontSize: '10px', color: '#94a3b8', textAlign: 'right' }}>Gerado em {new Date().toLocaleString('pt-BR')}</div>
    </PrintModal>
  );
}

// ============ RECIBO DE PRESTAÇÃO DE SERVIÇOS (PDF) ============
function ModalReciboPSOPDF({ funcionario, folha, onClose }) {
  const [foto, setFoto] = useState(null);
  useEffect(() => {
    if (funcionario.fotoMeta) getArquivoStorage(fotoKey(funcionario.id)).then(b => setFoto(b));
  }, [funcionario.id]);
  const f = funcionario;

  // Detalhe por cliente: diárias, horas, KM, adicionais, outros
  const porCliente = useMemo(() => {
    const m = {};
    folha.lancs.forEach(l => {
      if (!m[l.cliente]) m[l.cliente] = { cliente: l.cliente, qtdDias: 0, valorDiarias: 0, horasExtras: 0, valorHorasExtras: 0, kmExtras: 0, valorKmExtras: 0, adicionais: 0, valorAdicionais: 0, pedagios: 0, total: 0 };
      const qtdAg = nomesNoLancamento(l).length || 1;
      const part = valorParticipacao(f, l);
      const partFatorPago = num(l.totalPago) > 0 ? part / num(l.totalPago) : 1 / qtdAg;
      const diariaBase = (num(l.totalPago) - num(l.extraHorasPaga) - num(l.extraKmPago) - num(l.adicDomPago) - num(l.pedagioReembolso)) * partFatorPago;
      m[l.cliente].qtdDias += 1;
      m[l.cliente].valorDiarias += diariaBase;
      m[l.cliente].horasExtras += num(l.horasExtras);
      m[l.cliente].valorHorasExtras += num(l.extraHorasPaga) * partFatorPago;
      m[l.cliente].kmExtras += num(l.kmExtras);
      m[l.cliente].valorKmExtras += num(l.extraKmPago) * partFatorPago;
      if (l.isDomingo) { m[l.cliente].adicionais += 1; m[l.cliente].valorAdicionais += num(l.adicDomPago) * partFatorPago; }
      m[l.cliente].pedagios += num(l.pedagioReembolso) * partFatorPago;
      m[l.cliente].total += part;
    });
    return Object.values(m);
  }, [folha, funcionario]);
  const totalServicos = porCliente.reduce((s, c) => s + c.total, 0);
  const sFixo = 0; // v62: salário fixo desconsiderado
  const totalAvulsosRecibo = folha.totalDiariasAvulsas || 0;
  // v81: bruto = serviços + avulsos; líquido = bruto + adicionais − descontos
  const bruto = totalServicos + totalAvulsosRecibo;
  const liquido = bruto + folha.adicionais - folha.descontos;
  const valorPorExtenso = (n) => valorPorExtensoBR(n);

  return (
    <PrintModal titulo={`Recibo de prestação de serviços — ${f.nome} · ${fmtMes(folha.periodo)}`} onClose={onClose}>
      <div style={{ textAlign: 'center', borderBottom: '3px solid #4f46e5', paddingBottom: '12px', marginBottom: '14px' }}>
        <h1 style={{ fontSize: '20px', margin: 0 }}>RECIBO DE PRESTAÇÃO DE SERVIÇOS</h1>
        <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>Competência: <b>{fmtMes(folha.periodo)}</b> · Recibo nº {folha.periodo.replace('-', '')}-{f.id.replace(/^F0*/, '')}</div>
      </div>

      <h2>Dados do prestador</h2>
      <table>
        <tbody>
          <tr><th style={{ width: '30%' }}>Nome</th><td>{f.nome}</td></tr>
          {f.cpf && <tr><th>CPF</th><td>{f.cpf}</td></tr>}
          {f.rg && <tr><th>RG</th><td>{f.rg}</td></tr>}
          {f.endereco && <tr><th>Endereço</th><td>{f.endereco}{f.cidade ? `, ${f.cidade}` : ''}{f.uf ? `/${f.uf}` : ''}{f.cep ? ` - ${f.cep}` : ''}</td></tr>}
          {f.telefone && <tr><th>Telefone</th><td>{f.telefone}</td></tr>}
          {f.chavePix && <tr><th>Pix ({f.tipoPix})</th><td style={{ fontFamily: 'monospace' }}>{f.chavePix}</td></tr>}
        </tbody>
      </table>

      <h2>Detalhamento por cliente</h2>
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th style={{ textAlign: 'center' }}>Qtd dias</th>
            <th style={{ textAlign: 'right' }}>Diárias</th>
            <th style={{ textAlign: 'center' }}>HE</th>
            <th style={{ textAlign: 'right' }}>Horas extras</th>
            <th style={{ textAlign: 'center' }}>KM-E</th>
            <th style={{ textAlign: 'right' }}>KM extra</th>
            <th style={{ textAlign: 'right' }}>Adic. dom</th>
            <th style={{ textAlign: 'right' }}>Outros</th>
            <th style={{ textAlign: 'right' }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {porCliente.map(c => (
            <tr key={c.cliente}>
              <td style={{ fontWeight: 'bold' }}>{c.cliente}</td>
              <td style={{ textAlign: 'center' }}>{c.qtdDias}</td>
              <td style={{ textAlign: 'right' }}>{fmt(c.valorDiarias)}</td>
              <td style={{ textAlign: 'center' }}>{c.horasExtras > 0 ? fmtHorasHHMM(c.horasExtras) : '—'}</td>
              <td style={{ textAlign: 'right' }}>{fmt(c.valorHorasExtras)}</td>
              <td style={{ textAlign: 'center' }}>{c.kmExtras > 0 ? c.kmExtras : '—'}</td>
              <td style={{ textAlign: 'right' }}>{fmt(c.valorKmExtras)}</td>
              <td style={{ textAlign: 'right' }}>{fmt(c.valorAdicionais)}</td>
              <td style={{ textAlign: 'right' }}>{fmt(c.pedagios)}</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{fmt(c.total)}</td>
            </tr>
          ))}
          <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
            <td colSpan={9} style={{ textAlign: 'right' }}>Total dos serviços prestados:</td>
            <td style={{ textAlign: 'right' }}>{fmt(totalServicos)}</td>
          </tr>
        </tbody>
      </table>

      <h2>Resumo financeiro</h2>
      <table>
        <tbody>
          <tr><td style={{ width: '60%' }}>Total dos serviços prestados</td><td style={{ textAlign: 'right' }}>{fmt(totalServicos)}</td></tr>
          {totalAvulsosRecibo > 0 && <tr><td>(+) Lançamentos avulsos</td><td style={{ textAlign: 'right' }}>{fmt(totalAvulsosRecibo)}</td></tr>}
          {sFixo > 0 && <tr><td>(+) Salário fixo mensal</td><td style={{ textAlign: 'right' }}>{fmt(sFixo)}</td></tr>}
          <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}><td>(=) BRUTO</td><td style={{ textAlign: 'right' }}>{fmt(bruto)}</td></tr>
          {folha.adicionais > 0 && <tr><td>(+) Adicionais</td><td style={{ textAlign: 'right' }}>{fmt(folha.adicionais)}</td></tr>}
          {folha.totalVales > 0 && <tr><td>(−) Vales / Adiantamentos recebidos</td><td style={{ textAlign: 'right', color: '#b91c1c' }}>−{fmt(folha.totalVales)}</td></tr>}
          {folha.descontosManuais > 0 && <tr><td>(−) Descontos diversos</td><td style={{ textAlign: 'right', color: '#b91c1c' }}>−{fmt(folha.descontosManuais)}</td></tr>}
          <tr style={{ background: '#fef3c7', fontWeight: 'bold', fontSize: '13px' }}><td>(=) VALOR LÍQUIDO A RECEBER</td><td style={{ textAlign: 'right' }}>{fmt(liquido)}</td></tr>
        </tbody>
      </table>

      <div style={{ marginTop: '24px', padding: '14px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', textAlign: 'justify', lineHeight: '1.55' }}>
        Declaro, para os devidos fins, que recebi a importância total de <b>{valorPorExtenso(liquido)}</b>, referente aos serviços de <b>{f.categoria}</b> prestados durante a competência de <b>{fmtMes(folha.periodo)}</b>, conforme detalhamento acima. Dou plena, geral e irrevogável quitação pelos serviços executados no período mencionado.
      </div>

      <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '11px' }}>
        Local e data: ____________________________________, ____ de _____________ de {new Date().getFullYear()}
      </div>

      <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
        <div style={{ textAlign: 'center', borderTop: '1px solid #111', paddingTop: '4px', width: '46%' }}>
          {f.nome}<br />{f.cpf && <span style={{ color: '#64748b' }}>CPF {f.cpf}</span>}<br /><span style={{ color: '#64748b', fontWeight: 'bold' }}>PRESTADOR</span>
        </div>
        <div style={{ textAlign: 'center', borderTop: '1px solid #111', paddingTop: '4px', width: '46%' }}>
          Empresa<br /><span style={{ color: '#64748b' }}>CNPJ:</span><br /><span style={{ color: '#64748b', fontWeight: 'bold' }}>CONTRATANTE</span>
        </div>
      </div>
      <div style={{ marginTop: '16px', fontSize: '10px', color: '#94a3b8', textAlign: 'right' }}>Gerado em {new Date().toLocaleString('pt-BR')}</div>
    </PrintModal>
  );
}

// ============ MODAL IMPORTAR SALÁRIOS FIXOS (XLSX) ============
function ModalImportarSalariosFixos({ funcionariosExistentes = [], onImportar, onClose }) {
  const [analise, setAnalise] = useState(null); // { erros, naoEncontrados, atualizar }
  const [carregando, setCarregando] = useState(false);
  const [aba, setAba] = useState('xlsx'); // 'xlsx' | 'texto'
  const [textoColado, setTextoColado] = useState('');
  const fileRef = useRef(null);

  const cruzar = (parsed) => {
    const norm = (s) => (s || '').toString().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const atualizar = [];
    const naoEncontrados = [];
    parsed.itens.forEach(it => {
      const existente = funcionariosExistentes.find(x => norm(x.nome) === norm(it.nome));
      if (existente) atualizar.push({ novo: it, existente });
      else naoEncontrados.push(it);
    });
    setAnalise({ erros: parsed.erros, atualizar, naoEncontrados });
  };

  const handleFile = async (file) => {
    if (!file) return;
    setCarregando(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      let aoa = null;
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });
        if (data.length > 1 && (data[0] || []).some(h => {
          const c = normCol(String(h || ''));
          return c.startsWith('NOME') || c === 'COLABORADOR' || c === 'FUNCIONARIO';
        })) { aoa = data; break; }
      }
      if (!aoa) aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });
      cruzar(parseSalariosFixosFromAOA(aoa));
    } catch (e) {
      setAnalise({ erros: [`Erro ao ler arquivo: ${e?.message || 'desconhecido'}`], atualizar: [], naoEncontrados: [] });
    } finally {
      setCarregando(false);
    }
  };

  const handleTexto = () => {
    if (!textoColado.trim()) { setAnalise({ erros: ['Cole pelo menos o cabeçalho e uma linha de dados.'], atualizar: [], naoEncontrados: [] }); return; }
    cruzar(parseSalariosFixosFromText(textoColado));
  };

  const confirmar = () => { if (analise) onImportar({ atualizar: analise.atualizar }); };

  return (
    <ModalBase titulo="Importar Salários Fixos" onClose={onClose}>
      {!analise ? (
        <div className="space-y-4">
          <div className="flex border-b border-slate-200">
            <button onClick={() => setAba('xlsx')} className={`px-4 py-2 text-sm font-medium border-b-2 transition ${aba === 'xlsx' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Planilha (XLSX)</button>
            <button onClick={() => setAba('texto')} className={`px-4 py-2 text-sm font-medium border-b-2 transition ${aba === 'texto' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Texto colado</button>
          </div>

          {aba === 'xlsx' ? (
            <>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-blue-600 mb-2 flex items-center gap-2"><Download className="w-4 h-4" />Passo 1 — Baixe o modelo</h3>
                <p className="text-xs text-slate-600 mb-3">3 colunas: <b>Nome do Colaborador</b>, <b>Salário</b>, <b>Grupo Folha</b>. Apenas colaboradores já cadastrados serão atualizados.</p>
                <button onClick={() => gerarModeloSalariosFixosXLSX()} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Download className="w-4 h-4" />Baixar modelo XLSX</button>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><Upload className="w-4 h-4" />Passo 2 — Envie sua planilha</h3>
                <p className="text-xs text-slate-400 mb-3">Aceita .xlsx, .xls, .csv. Aceita também contracheques exportados em planilha (busca colunas por nome).</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => handleFile(e.target.files?.[0])} className="text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white file:font-medium hover:file:bg-blue-500" />
                {carregando && <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5"><RefreshCw className="w-3 h-3 animate-spin" />Lendo arquivo...</p>}
              </div>
            </>
          ) : (
            <>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-blue-600 mb-2 flex items-center gap-2"><FileText className="w-4 h-4" />Cole os dados</h3>
                <p className="text-xs text-slate-600">Copie diretamente do Excel/Sheets ou contracheque. Cabeçalho na primeira linha. Colunas separadas por <b>tab</b>, <b>;</b> ou <b>|</b>.</p>
                <p className="text-xs text-slate-400 mt-2">Cabeçalho aceito: <span className="font-mono">Nome  Salário  Grupo Folha</span></p>
              </div>
              <textarea
                value={textoColado}
                onChange={e => setTextoColado(e.target.value)}
                rows={10}
                placeholder={"Nome\tSalário\tGrupo Folha\nJOÃO DA SILVA\t1500,00\tARMADA\nMARIA SANTOS\t2200,00\tESCRITÓRIO"}
                className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono"
              />
              <button onClick={handleTexto} disabled={!textoColado.trim()} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded text-sm font-medium flex items-center justify-center gap-2"><Search className="w-4 h-4" />Analisar texto</button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {analise.erros.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 text-sm text-red-300">
              <p className="font-semibold mb-1 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />Atenção:</p>
              <ul className="list-disc pl-5 text-xs">{analise.erros.map((er, i) => <li key={i}>{er}</li>)}</ul>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-3 text-center">
              <div className="text-2xl font-bold text-emerald-300">{analise.atualizar.length}</div>
              <div className="text-[10px] uppercase text-slate-400">Vão atualizar</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 text-center">
              <div className="text-2xl font-bold text-amber-300">{analise.naoEncontrados.length}</div>
              <div className="text-[10px] uppercase text-slate-400">Não encontrados</div>
            </div>
          </div>
          {analise.atualizar.length > 0 && (
            <div>
              <h4 className="text-xs uppercase text-slate-400 font-semibold mb-1.5">Atualizações</h4>
              <div className="bg-white rounded max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="text-slate-500 sticky top-0 bg-slate-50"><tr><th className="text-left py-1.5 px-2">Nome</th><th className="text-right px-2">Sal. atual</th><th className="text-right px-2">Sal. novo</th><th className="text-left px-2">Grupo</th></tr></thead>
                  <tbody>{analise.atualizar.map((u, i) => (
                    <tr key={i} className="border-t border-slate-200/50">
                      <td className="py-1 px-2">{u.existente.nome}</td>
                      <td className="px-2 text-right text-slate-500">{num(u.existente.salarioFixo) > 0 ? fmt(u.existente.salarioFixo) : '—'}</td>
                      <td className="px-2 text-right text-emerald-300 font-medium">{fmt(u.novo.salarioFixo)}</td>
                      <td className="px-2 text-blue-600 text-[11px]">{u.novo.folhaGrupo || '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
          {analise.naoEncontrados.length > 0 && (
            <div>
              <h4 className="text-xs uppercase text-amber-300 font-semibold mb-1.5 flex items-center gap-1.5"><AlertCircle className="w-3 h-3" />Não cadastrados (serão ignorados)</h4>
              <div className="bg-amber-500/5 rounded max-h-32 overflow-y-auto px-3 py-2 text-xs text-slate-600">
                {analise.naoEncontrados.map((it, i) => <div key={i}>• {it.nome} — {fmt(it.salarioFixo)}</div>)}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2 border-t border-slate-200">
            <button onClick={() => setAnalise(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded text-sm">Voltar</button>
            <button onClick={confirmar} disabled={analise.atualizar.length === 0} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded text-sm font-semibold">Confirmar atualização ({analise.atualizar.length})</button>
          </div>
        </div>
      )}
    </ModalBase>
  );
}

// ============ MODAL IMPORTAR DESPESAS DA CHEFIA (XLSX/TEXTO) ============
function ModalImportarDespesasChefiaXLSX({ onImportar, onClose }) {
  const [analise, setAnalise] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [aba, setAba] = useState('xlsx');
  const [textoColado, setTextoColado] = useState('');
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setCarregando(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      let aoa = null;
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });
        if (data.length > 1 && (data[0] || []).some(h => normCol(String(h || '')).startsWith('DESCRI'))) { aoa = data; break; }
      }
      if (!aoa) aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });
      setAnalise(parseDespesasChefiaFromAOA(aoa));
    } catch (e) { setAnalise({ erros: [`Erro ao ler arquivo: ${e?.message}`], itens: [] }); }
    finally { setCarregando(false); }
  };

  const confirmar = () => { if (analise) onImportar({ itens: analise.itens || [] }); };

  return (
    <ModalBase titulo="Importar Despesas da Chefia" onClose={onClose}>
      {!analise ? (
        <div className="space-y-4">
          <div className="flex border-b border-slate-200">
            <button onClick={() => setAba('xlsx')} className={`px-4 py-2 text-sm font-medium border-b-2 transition ${aba === 'xlsx' ? 'border-emerald-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Planilha (XLSX)</button>
            <button onClick={() => setAba('texto')} className={`px-4 py-2 text-sm font-medium border-b-2 transition ${aba === 'texto' ? 'border-emerald-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Texto colado</button>
          </div>
          {aba === 'xlsx' ? (
            <>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-emerald-300 mb-2 flex items-center gap-2"><Download className="w-4 h-4" />Passo 1 — Baixe o modelo</h3>
                <p className="text-xs text-slate-600 mb-3">8 colunas: <b>Data</b>, <b>Descrição</b>, <b>Tipo</b>, <b>Valor</b>, <b>Origem (MANHÃES / RICARDO)</b>, <b>Competência</b>, <b>Status</b>, <b>Observações</b>.</p>
                <button onClick={() => gerarModeloDespesasChefiaXLSX()} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Download className="w-4 h-4" />Baixar modelo XLSX</button>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><Upload className="w-4 h-4" />Passo 2 — Envie sua planilha</h3>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => handleFile(e.target.files?.[0])} className="text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-emerald-600 file:text-white file:font-medium hover:file:bg-emerald-500" />
                {carregando && <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5"><RefreshCw className="w-3 h-3 animate-spin" />Lendo arquivo...</p>}
              </div>
            </>
          ) : (
            <>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-emerald-300 mb-2 flex items-center gap-2"><FileText className="w-4 h-4" />Cole os dados</h3>
                <p className="text-xs text-slate-600">Coluna <b>Origem</b> deve ser <b>MANHÃES</b> ou <b>RICARDO</b>. Separadores: tab, <code>;</code> ou <code>|</code>.</p>
              </div>
              <textarea value={textoColado} onChange={e => setTextoColado(e.target.value)} rows={9}
                placeholder={"Data\tDescrição\tTipo\tValor\tOrigem\n01/04/2026\tCombustível\tAVULSA\t450,00\tMANHÃES\n03/04/2026\tJantar\tAVULSA\t280,00\tRICARDO"}
                className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono" />
              <button onClick={() => { if (!textoColado.trim()) return; setAnalise(parseDespesasChefiaFromText(textoColado)); }} disabled={!textoColado.trim()} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded text-sm font-medium flex items-center justify-center gap-2"><Search className="w-4 h-4" />Analisar texto</button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {analise.erros.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 text-sm text-red-300">
              <p className="font-semibold mb-1 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />Atenção:</p>
              <ul className="list-disc pl-5 text-xs">{analise.erros.map((er, i) => <li key={i}>{er}</li>)}</ul>
            </div>
          )}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-3 text-center">
            <div className="text-2xl font-bold text-emerald-300">{analise.itens?.length || 0}</div>
            <div className="text-[10px] uppercase text-slate-400">Despesas a importar</div>
          </div>
          {analise.itens?.length > 0 && (
            <div className="bg-white rounded max-h-56 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="text-slate-500 sticky top-0 bg-slate-50"><tr><th className="text-left py-1.5 px-2">Compet.</th><th className="text-left px-2">Descrição</th><th className="text-left px-2">Origem</th><th className="text-right px-2">Valor</th></tr></thead>
                <tbody>{analise.itens.map((it, i) => (
                  <tr key={i} className="border-t border-slate-200/50">
                    <td className="py-1 px-2 font-mono text-[10px]">{it.competencia}</td>
                    <td className="px-2">{it.descricao}</td>
                    <td className="px-2"><span className={`text-[10px] px-1.5 py-0.5 rounded ${it.origem === 'MANHÃES' ? 'bg-emerald-500/20 text-emerald-700' : 'bg-blue-500/20 text-blue-600'}`}>{it.origem}</span></td>
                    <td className="px-2 text-right text-red-300 font-medium">{fmt(it.valor)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <div className="flex gap-2 pt-2 border-t border-slate-200">
            <button onClick={() => setAnalise(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded text-sm">Voltar</button>
            <button onClick={confirmar} disabled={!analise.itens?.length} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded text-sm font-semibold">Confirmar ({analise.itens?.length || 0})</button>
          </div>
        </div>
      )}
    </ModalBase>
  );
}

// ============ MODAL IMPORTAR DIÁRIAS AVULSAS (XLSX) ============
function ModalImportarDiariasXLSX({ funcionariosExistentes = [], onImportar, onClose }) {
  const [analise, setAnalise] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [aba, setAba] = useState('xlsx'); // 'xlsx' | 'texto'
  const [textoColado, setTextoColado] = useState('');
  const fileRef = useRef(null);

  const cruzar = (parsed) => {
    const norm = (s) => (s || '').toString().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const validos = [];
    const naoEncontrados = [];
    parsed.itens.forEach(it => {
      const func = funcionariosExistentes.find(x => norm(x.nome) === norm(it.nome) || norm(x.nome).includes(norm(it.nome)) || norm(it.nome).includes(norm(x.nome)));
      if (func) validos.push({ ...it, funcionarioId: func.id, nome: func.nome });
      else naoEncontrados.push(it);
    });
    setAnalise({ erros: parsed.erros, validos, naoEncontrados });
  };

  const handleFile = async (file) => {
    if (!file) return;
    setCarregando(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      let aoa = null;
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });
        if (data.length > 1 && (data[0] || []).some(h => normCol(String(h || '')) === 'DATA')) { aoa = data; break; }
      }
      if (!aoa) aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });
      cruzar(parseDiariasFromAOA(aoa));
    } catch (e) {
      setAnalise({ erros: [`Erro ao ler arquivo: ${e?.message || 'desconhecido'}`], validos: [], naoEncontrados: [] });
    } finally { setCarregando(false); }
  };

  const handleTexto = () => {
    if (!textoColado.trim()) { setAnalise({ erros: ['Cole pelo menos o cabeçalho e uma linha de dados.'], validos: [], naoEncontrados: [] }); return; }
    cruzar(parseLancamentosAvulsosFromText(textoColado));
  };

  const confirmar = () => { if (analise) onImportar({ itens: analise.validos }); };

  return (
    <ModalBase titulo="Importar Lançamentos Avulsos" onClose={onClose}>
      {!analise ? (
        <div className="space-y-4">
          <div className="flex border-b border-slate-200">
            <button onClick={() => setAba('xlsx')} className={`px-4 py-2 text-sm font-medium border-b-2 transition ${aba === 'xlsx' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Planilha (XLSX)</button>
            <button onClick={() => setAba('texto')} className={`px-4 py-2 text-sm font-medium border-b-2 transition ${aba === 'texto' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Texto colado</button>
          </div>

          {aba === 'xlsx' ? (
            <>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-blue-600 mb-2 flex items-center gap-2"><Download className="w-4 h-4" />Passo 1 — Baixe o modelo</h3>
                <p className="text-xs text-slate-600 mb-3">4 colunas: <b>data</b>, <b>Colaborador</b>, <b>Valor</b>, <b>Grupo Folha</b>. Apenas colaboradores já cadastrados serão importados.</p>
                <button onClick={() => gerarModeloDiariasXLSX()} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Download className="w-4 h-4" />Baixar modelo XLSX</button>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><Upload className="w-4 h-4" />Passo 2 — Envie sua planilha</h3>
                <p className="text-xs text-slate-400 mb-3">Aceita .xlsx, .xls, .csv. Datas em DD/MM/AAAA ou formato Excel. Categorias novas são criadas automaticamente.</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => handleFile(e.target.files?.[0])} className="text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white file:font-medium hover:file:bg-blue-500" />
                {carregando && <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5"><RefreshCw className="w-3 h-3 animate-spin" />Lendo arquivo...</p>}
              </div>
            </>
          ) : (
            <>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-blue-600 mb-2 flex items-center gap-2"><FileText className="w-4 h-4" />Cole os dados</h3>
                <p className="text-xs text-slate-600">Copie diretamente do Excel/Sheets. Cabeçalho na primeira linha. Colunas separadas por <b>tab</b>, <b>;</b> ou <b>|</b>.</p>
                <p className="text-xs text-slate-400 mt-2">Cabeçalho aceito: <span className="font-mono">data  Colaborador  Valor  Grupo Folha</span></p>
              </div>
              <textarea
                value={textoColado}
                onChange={e => setTextoColado(e.target.value)}
                rows={10}
                placeholder={"data\tColaborador\tValor\tGrupo Folha\n01/04/2026\tJOÃO DA SILVA\tR$ 2.090,00\tESCOLTA ARMADA\n01/04/2026\tMARIA SANTOS\t1850,00\tCONDOMÍNIO SPRING PARK"}
                className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono"
              />
              <button onClick={handleTexto} disabled={!textoColado.trim()} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded text-sm font-medium flex items-center justify-center gap-2"><Search className="w-4 h-4" />Analisar texto</button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {analise.erros.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 text-sm text-red-300">
              <p className="font-semibold mb-1 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />Atenção:</p>
              <ul className="list-disc pl-5 text-xs">{analise.erros.map((er, i) => <li key={i}>{er}</li>)}</ul>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-3 text-center">
              <div className="text-2xl font-bold text-emerald-300">{analise.validos.length}</div>
              <div className="text-[10px] uppercase text-slate-400">Para importar</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 text-center">
              <div className="text-2xl font-bold text-amber-300">{analise.naoEncontrados.length}</div>
              <div className="text-[10px] uppercase text-slate-400">Não encontrados</div>
            </div>
          </div>
          {analise.validos.length > 0 && (
            <div>
              <h4 className="text-xs uppercase text-slate-400 font-semibold mb-1.5">Lançamentos a importar</h4>
              <div className="bg-white rounded max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="text-slate-500 sticky top-0 bg-slate-50"><tr><th className="text-left py-1.5 px-2">Data</th><th className="text-left px-2">Colaborador</th><th className="text-right px-2">Valor</th><th className="text-left px-2">Grupo Folha</th></tr></thead>
                  <tbody>{analise.validos.map((it, i) => (
                    <tr key={i} className="border-t border-slate-200/50">
                      <td className="py-1 px-2 font-mono text-[10px]">{it.data ? it.data.split('-').reverse().join('/') : '—'}</td>
                      <td className="px-2">{it.nome}</td>
                      <td className="px-2 text-right text-emerald-300 font-medium">{fmt(it.valor)}</td>
                      <td className="px-2 text-blue-600 text-[11px]">{it.folhaGrupo || '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
          {analise.naoEncontrados.length > 0 && (
            <div>
              <h4 className="text-xs uppercase text-amber-300 font-semibold mb-1.5 flex items-center gap-1.5"><AlertCircle className="w-3 h-3" />Não cadastrados (serão ignorados)</h4>
              <div className="bg-amber-500/5 rounded max-h-32 overflow-y-auto px-3 py-2 text-xs text-slate-600">
                {analise.naoEncontrados.map((it, i) => <div key={i}>• {it.nome} — {fmt(it.valor)} em {it.data ? it.data.split('-').reverse().join('/') : '—'}</div>)}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2 border-t border-slate-200">
            <button onClick={() => setAnalise(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded text-sm">Voltar</button>
            <button onClick={confirmar} disabled={analise.validos.length === 0} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded text-sm font-semibold">Confirmar importação ({analise.validos.length})</button>
          </div>
        </div>
      )}
    </ModalBase>
  );
}

function ModalImportarFuncionarios({ funcionariosExistentes = [], onImportar, onClose }) {
  const [analise, setAnalise] = useState(null); // { erros, novos: [], atualizar: [] }
  const [carregando, setCarregando] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setCarregando(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      // Procura a primeira aba que tenha cabeçalho "Nome"
      let aoa = null;
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });
        if (data.length > 1 && (data[0] || []).some(h => normCol(String(h || '')).startsWith('NOME'))) {
          aoa = data; break;
        }
      }
      if (!aoa) aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });
      const r = parseFuncionariosFromAOA(aoa);
      // Cruza com existentes (match por nome normalizado)
      const normalizar = (s) => (s || '').toString().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const novos = [];
      const atualizar = [];
      r.funcionarios.forEach(f => {
        const existente = funcionariosExistentes.find(x => normalizar(x.nome) === normalizar(f.nome));
        if (existente) atualizar.push({ novo: f, existente });
        else novos.push(f);
      });
      setAnalise({ erros: r.erros, novos, atualizar });
    } catch (e) {
      setAnalise({ erros: [`Erro ao ler arquivo: ${e?.message || 'desconhecido'}`], novos: [], atualizar: [] });
    } finally {
      setCarregando(false);
    }
  };

  const confirmar = () => {
    if (!analise) return;
    onImportar({ novos: analise.novos, atualizar: analise.atualizar });
  };

  const total = analise ? analise.novos.length + analise.atualizar.length : 0;

  return (
    <ModalBase titulo="Importar Funcionários via Planilha" onClose={onClose}>
      {!analise ? (
        <div className="space-y-4">
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
            <h3 className="font-semibold text-indigo-600 mb-2 flex items-center gap-2"><Download className="w-4 h-4" />Passo 1 — Baixe o modelo</h3>
            <p className="text-xs text-slate-600 mb-3">Use o modelo oficial para garantir que todas as colunas sejam reconhecidas. Inclui aba de instruções com a descrição de cada campo.</p>
            <button onClick={() => gerarModeloFuncionariosXLSX()} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Download className="w-4 h-4" />Baixar modelo XLSX</button>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><Upload className="w-4 h-4" />Passo 2 — Envie sua planilha preenchida</h3>
            <p className="text-xs text-slate-400 mb-3">Aceita .xlsx, .xls ou .csv. Funcionários com nome já existente serão mesclados (atualizados).</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => handleFile(e.target.files?.[0])} className="text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-indigo-600 file:text-white file:font-medium hover:file:bg-indigo-500" />
            {carregando && <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5"><RefreshCw className="w-3 h-3 animate-spin" />Lendo arquivo...</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {analise.erros.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 text-sm text-red-300">
              <p className="font-semibold mb-1 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />Atenção:</p>
              <ul className="list-disc pl-5 text-xs">{analise.erros.map((er, i) => <li key={i}>{er}</li>)}</ul>
            </div>
          )}
          {total === 0 && analise.erros.length === 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-sm text-amber-700">Nenhum funcionário encontrado para importar. Verifique se a planilha tem dados nas linhas após o cabeçalho.</div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-300">{analise.novos.length}</div>
                  <div className="text-[10px] uppercase text-slate-400">Novos</div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-amber-300">{analise.atualizar.length}</div>
                  <div className="text-[10px] uppercase text-slate-400">Atualizar</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-slate-700">{total}</div>
                  <div className="text-[10px] uppercase text-slate-400">Total</div>
                </div>
              </div>
              {analise.novos.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5"><Plus className="w-3 h-3 text-emerald-600" />Novos funcionários ({analise.novos.length})</h4>
                  <div className="bg-white rounded max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="text-slate-500 sticky top-0 bg-slate-50"><tr><th className="text-left py-1.5 px-2">Nome</th><th className="text-left px-2">Categoria</th><th className="text-left px-2">CPF</th><th className="text-right px-2">Sal. Fixo</th></tr></thead>
                      <tbody>{analise.novos.map((f, i) => (
                        <tr key={i} className="border-t border-slate-200/50">
                          <td className="py-1 px-2">{f.nome}</td>
                          <td className="px-2 text-slate-400">{f.categoria}</td>
                          <td className="px-2 text-slate-500">{f.cpf || '—'}</td>
                          <td className="px-2 text-right text-slate-600">{num(f.salarioFixo) > 0 ? fmt(f.salarioFixo) : '—'}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
              {analise.atualizar.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5"><Edit2 className="w-3 h-3 text-amber-600" />Funcionários a atualizar ({analise.atualizar.length})</h4>
                  <div className="bg-white rounded max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="text-slate-500 sticky top-0 bg-slate-50"><tr><th className="text-left py-1.5 px-2">Nome</th><th className="text-left px-2">ID atual</th><th className="text-left px-2">Mudanças detectadas</th></tr></thead>
                      <tbody>{analise.atualizar.map((u, i) => {
                        const mudancas = [];
                        ['categoria', 'cpf', 'rg', 'telefone', 'email', 'endereco', 'salarioFixo', 'chavePix'].forEach(k => {
                          const novo = u.novo[k]; const antigo = u.existente[k];
                          if (novo && String(novo) !== String(antigo || '')) mudancas.push(k);
                        });
                        return (
                          <tr key={i} className="border-t border-slate-200/50">
                            <td className="py-1 px-2">{u.novo.nome}</td>
                            <td className="px-2 text-slate-500 font-mono">{u.existente.id}</td>
                            <td className="px-2 text-amber-300">{mudancas.length > 0 ? mudancas.join(', ') : <span className="text-slate-500">sem alterações</span>}</td>
                          </tr>
                        );
                      })}</tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5">Os funcionários existentes terão apenas os campos PREENCHIDOS na planilha sobrescritos. Foto e documentos atuais são preservados.</p>
                </div>
              )}
            </>
          )}
          <div className="flex justify-between gap-2 mt-4">
            <button onClick={() => { setAnalise(null); if (fileRef.current) fileRef.current.value = ''; }} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">← Escolher outro arquivo</button>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button>
              <button onClick={confirmar} disabled={total === 0} className="px-4 py-2 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-500 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><CheckCircle2 className="w-4 h-4" />Importar {total} funcionário{total !== 1 ? 's' : ''}</button>
            </div>
          </div>
        </div>
      )}
    </ModalBase>
  );
}

function ModalConfirm({ titulo, mensagem, onConfirm, onClose, cor = 'red' }) {
  const corBtn = { red: 'bg-red-600 hover:bg-red-500', emerald: 'bg-emerald-600 hover:bg-emerald-500', amber: 'bg-amber-600 hover:bg-amber-500' }[cor];
  return <ModalBase titulo={titulo} onClose={onClose} pequeno><p className="text-sm text-slate-600 mb-4">{mensagem}</p><div className="flex justify-end gap-2"><button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button><button onClick={onConfirm} className={`px-4 py-2 rounded-lg text-sm font-medium ${corBtn}`}>Confirmar</button></div></ModalBase>;
}

function ModalBase({ titulo, children, onClose, pequeno, grande }) {
  const w = pequeno ? 'max-w-sm' : grande ? 'max-w-3xl' : 'max-w-xl';
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-3 sm:p-6">
        <div className={`bg-white border border-slate-200 rounded-xl p-4 sm:p-5 w-full ${w} my-4 sm:my-8`}>
          <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
            <h3 className="font-bold text-base sm:text-lg truncate">{titulo}</h3>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded flex-shrink-0"><X className="w-4 h-4 sm:w-5 sm:h-5" /></button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children, full, span }) {
  const SPAN = { 2: 'sm:col-span-2', 3: 'sm:col-span-3', 4: 'sm:col-span-4', 5: 'sm:col-span-5', 6: 'sm:col-span-6' };
  const cls = span ? (SPAN[span] || '') : full ? 'sm:col-span-2' : '';
  return <div className={`min-w-0 ${cls}`}><label className="block text-xs text-slate-400 mb-1">{label}</label>{children}</div>;
}

// ============ PARSERS ============
const ALIASES_IMPORT = { PLACAVTR: 'placaVtr', PLACA: 'placa', AGENTE1: 'agente1', AGENTE2: 'agente2', MOTORISTA: 'motorista', EQUIPE: 'equipe', INICIO: 'inicio', TERMINO: 'termino', CONVOCACAO: 'convocacao', INICIOMISSAO: 'inicioMissao', TERMINOFASE1: 'terminoFase1', INICIOFASE2: 'inicioFase2', TERMINOMISSAO: 'terminoMissao', TEMPODEESPERA: 'tempoEspera', TEMPOESPERA: 'tempoEspera', KMINICIAL: 'kmInicial', KMINIC: 'kmInicial', KMFINAL: 'kmFinal', KMFIN: 'kmFinal', ROTA: 'rota', PERCURSO: 'percurso', OBSERVACAO: 'observacao', PEDAGIO: 'pedagio', BATIDAEXTRA: 'batidaExtra', NOTAFISCAL: 'notaFiscal', NF: 'notaFiscal', VOLUME: 'volume', CLIENTE: 'subCliente', SUBCLIENTE: 'subCliente' };

function normCol(s) { return (s || '').toString().trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, ''); }
function parseTSV(text) { const lines = text.split(/\r?\n/).filter(l => l.length > 0); if (!lines.length) return { headers: [], rows: [] }; const sep = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ','); const headers = lines[0].split(sep).map(h => h.trim()); const rows = lines.slice(1).map(line => line.split(sep).map(v => v.trim())); return { headers, rows, sep }; }
function parseDataBR(s) { if (!s) return null; const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (!m) return null; let [, d, mn, y] = m; if (y.length === 2) y = '20' + y; return `${y}-${mn.padStart(2, '0')}-${d.padStart(2, '0')}`; }
function parseDateTimeBR(s, dataFallback) {
  if (!s) return null;
  const str = s.toString().trim();
  // Formato BR: DD/MM/YYYY HH:MM[:SS]
  const mBR = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})[\sT]+(\d{1,2}):(\d{2})/);
  if (mBR) { let [, d, mn, y, h, mi] = mBR; if (y.length === 2) y = '20' + y; return `${y}-${mn.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${mi}`; }
  // Formato ISO: YYYY-MM-DD[ T]HH:MM[:SS]
  const mISO = str.match(/(\d{4})-(\d{1,2})-(\d{1,2})[\sT]+(\d{1,2}):(\d{2})/);
  if (mISO) { const [, y, mn, d, h, mi] = mISO; return `${y}-${mn.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${mi}`; }
  // Apenas hora HH:MM[:SS] — usa dataFallback (data do lançamento) como base
  const mHora = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (mHora && dataFallback) { const [, h, mi] = mHora; return `${dataFallback}T${h.padStart(2, '0')}:${mi}`; }
  // Fallback: só data (DD/MM/YYYY ou YYYY-MM-DD), sem horário → null (não usar T00:00 p/ não confundir diff)
  const date = parseDataBR(str) || (str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) ? str.replace(/^(\d{4})-(\d{1,2})-(\d{1,2})$/, (_, y, m, d) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`) : null);
  return date ? `${date}T00:00` : null;
}
function parseMesBR(s) { if (!s) return null; const m = s.match(/^(\d{1,2})\/(\d{2,4})$/); if (m) { let [, mn, y] = m; if (y.length === 2) y = '20' + y; return `${y}-${mn.padStart(2, '0')}`; } const m2 = s.match(/^(\d{4})-(\d{1,2})$/); if (m2) return `${m2[1]}-${m2[2].padStart(2, '0')}`; const d = parseDataBR(s); return d ? d.slice(0, 7) : null; }
function parseNumeroBR(s) { if (s == null || s === '') return null; const str = s.toString(); if (str.startsWith('###') || str.match(/^[#]+$/)) return null; let cleaned = str.replace(/R\$\s*/g, '').replace(/\s/g, ''); if (cleaned.includes(',') && cleaned.includes('.')) cleaned = cleaned.replace(/\./g, '').replace(',', '.'); else if (cleaned.includes(',')) cleaned = cleaned.replace(',', '.'); const n = Number(cleaned); return isNaN(n) ? null : n; }

function buildHeaderMapLanc(template) {
  const map = { DATA: '@data', CODIGO: '@codServico', COD: '@codServico', CODSERVICO: '@codServico' };
  template.campos.forEach(c => { const labelNorm = normCol(c.l); if (labelNorm) map[labelNorm] = `extras.${c.k}`; const keyNorm = normCol(c.k); if (keyNorm && !map[keyNorm]) map[keyNorm] = `extras.${c.k}`; });
  Object.entries(ALIASES_IMPORT).forEach(([h, fk]) => { if (template.campos.some(c => c.k === fk)) map[h] = `extras.${fk}`; });
  if (!map.AGENTE) { if (template.campos.some(c => c.k === 'agente1')) map.AGENTE = 'extras.agente1'; else if (template.campos.some(c => c.k === 'agente')) map.AGENTE = 'extras.agente'; }
  if (!map.OBS) { if (template.campos.some(c => c.k === 'obs')) map.OBS = 'extras.obs'; else if (template.campos.some(c => c.k === 'observacao')) map.OBS = 'extras.observacao'; }
  // Natura Noturna: coluna INÍCIO na planilha = horário de convocação
  if (!map.INICIO && template.campos.some(c => c.k === 'convocacao')) map.INICIO = 'extras.convocacao';
  // Aceita coluna HORAS TRABALHADAS direto da planilha (formato HH:MM ou decimal)
  ['HORASTRABALHADAS', 'TOTALDEHORAS', 'HORASTRAB', 'HRTOTAL', 'HORAS', 'HRTRAB'].forEach(k => map[k] = '@horasTrabalhadas');
  // Aceita também KM rodados direto
  ['KMTOTAL', 'KMRODADOS', 'KMRODADO'].forEach(k => { if (!map[k]) map[k] = '@kmRodados'; });
  // Skip: colunas de totalizadores que o sistema recalcula
  ['DIA', 'HORAEXTRA', 'HORASEXTRAS', 'HE', 'KMEXTRA', 'KMEXTRAS', 'FRANQUIAHR', 'FRANQUIAHORA', 'FRANQUIAKM', 'VLRBASE', 'VLRHORAEXTRA', 'ADICIONAL', 'VALORAFATURAR', 'VALOR', 'FERIADO', 'MES', 'CLIENTE', 'CNPJ', 'CODEMISSAO', 'OS'].forEach(k => { if (!map[k]) map[k] = '@skip'; });
  return map;
}

// Converte "HH:MM" ou decimal em horas decimais
function parseHorasDecimal(s) {
  if (s == null || s === '') return null;
  const str = s.toString().trim();
  const mHHMM = str.match(/^(\d{1,3}):(\d{2})$/);
  if (mHHMM) return num(mHHMM[1]) + num(mHHMM[2]) / 60;
  return parseNumeroBR(str);
}

function parseRowLanc(row, headers, headerMap, template) {
  const dados = { extras: {} }; const issues = []; let allEmpty = true;
  // Primeira passada: extrai a data (necessária como fallback p/ HH:MM puro nos datetime)
  headers.forEach((h, i) => {
    if (headerMap[normCol(h)] !== '@data') return;
    const v = (row[i] || '').toString().trim();
    if (!v) return;
    const p = parseDataBR(v) || (v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/) ? `${v.slice(0, 4)}-${v.slice(5, 7).padStart(2, '0')}-${v.slice(8, 10).padStart(2, '0')}` : null);
    if (p) dados.data = p;
  });
  headers.forEach((h, i) => {
    const norm = normCol(h); const field = headerMap[norm];
    if (!field || field === '@skip' || field === '@data') return;
    const value = (row[i] || '').toString().trim();
    if (!value || value.startsWith('###') || value.match(/^[#]+$/)) return;
    allEmpty = false;
    if (field === '@codServico') dados.codServico = value;
    else if (field === '@horasTrabalhadas') { const h = parseHorasDecimal(value); if (h != null) dados.horasTrabalhadas = h; }
    else if (field === '@kmRodados') { const k = parseNumeroBR(value); if (k != null) dados.kmRodados = k; }
    else if (field.startsWith('extras.')) {
      const key = field.substring(7); const campo = template.campos.find(c => c.k === key);
      if (campo?.tipo === 'datetime') { const dt = parseDateTimeBR(value, dados.data); if (dt) dados.extras[key] = dt; else issues.push(`${campo.l} inválido: ${value}`); }
      else if (campo?.tipo === 'time') { const m = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/); if (m) dados.extras[key] = `${m[1].padStart(2, '0')}:${m[2]}`; }
      else if (campo?.tipo === 'number' || campo?.tipo === 'currency') { const n = parseNumeroBR(value); if (n != null) dados.extras[key] = n; }
      else dados.extras[key] = value;
    }
  });
  // @data marcou allEmpty como true acima? Considera não-vazio se há ao menos data ou cod
  if (dados.data || dados.codServico) allEmpty = false;
  return { dados, issues, naoVazio: !allEmpty };
}

function parseRowSimples(row, headers, headerMap) {
  const dados = {}; const issues = []; let allEmpty = true;
  headers.forEach((h, i) => {
    const norm = normCol(h); const field = headerMap[norm];
    if (!field) return;
    const value = (row[i] || '').toString().trim();
    if (!value || value.startsWith('###') || value.match(/^[#]+$/)) return;
    allEmpty = false;
    if (field === '@data') { const p = parseDataBR(value); if (p) dados.data = p; else issues.push(`data inválida: ${value}`); }
    else if (field === 'competencia') { const c = parseMesBR(value); if (c) dados.competencia = c; }
    else if (field === 'valor') { const n = parseNumeroBR(value); if (n != null) dados.valor = n; }
    else dados[field] = value;
  });
  return { dados, issues, naoVazio: !allEmpty };
}

// ============ MODAL IMPORTAR ============
function ModalImportar({ destino = 'lancamento', servicos, onSaveLanc, onSaveDesp, onSaveDesc, onClose }) {
  const [step, setStep] = useState('input');
  const [templateId, setTemplateId] = useState('');
  const [defaultCod, setDefaultCod] = useState('');
  const [defaultCompetencia, setDefaultCompetencia] = useState('');
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState(null);
  const template = TEMPLATES[templateId];
  const servicosT = useMemo(() => servicos.filter(s => s.template === templateId && s.status === 'ATIVO'), [servicos, templateId]);
  const isLanc = destino === 'lancamento';
  const titulo = isLanc ? 'Importar lançamentos' : destino === 'despesa' ? 'Importar despesas' : 'Importar vales/adiantamentos';
  const colsEsperadas = destino === 'despesa' ? 'LANÇAMENTO, COMPETÊNCIA (ou DATA), TIPO (FIXA/PARCELA), VALOR, C. CUSTO, ORIGEM'
    : destino === 'desconto' ? 'BENEFICIÁRIO, COMPETÊNCIA (ou DATA), TIPO, VALOR, C. CUSTO, FORMA DE PAGAMENTO' : null;

  const analisar = () => {
    if (isLanc && !templateId) return alert('Selecione o template');
    if (!rawText.trim()) return alert('Cole os dados');
    const tsv = parseTSV(rawText);
    if (!tsv.headers.length) return alert('Cabeçalhos não identificados');
    let allRows = []; let headerMap;
    if (isLanc) {
      headerMap = buildHeaderMapLanc(template);
      allRows = tsv.rows.map(row => parseRowLanc(row, tsv.headers, headerMap, template)).filter(r => r.naoVazio);
      allRows.forEach(r => {
        if (!r.dados.codServico && defaultCod) r.dados.codServico = defaultCod;
        r.valid = true;
        if (!r.dados.data) { r.issues.push('data ausente'); r.valid = false; }
        if (!r.dados.codServico) { r.issues.push('código ausente'); r.valid = false; }
        else if (!servicos.find(x => x.cod === r.dados.codServico)) { r.issues.push(`código #${r.dados.codServico} não cadastrado`); r.valid = false; }
      });
    } else {
      headerMap = destino === 'despesa' ? HEADER_MAP_DESPESA : HEADER_MAP_DESCONTO;
      allRows = tsv.rows.map(row => parseRowSimples(row, tsv.headers, headerMap)).filter(r => r.naoVazio);
      allRows.forEach(r => {
        r.valid = true;
        if (!r.dados.competencia && r.dados.data) r.dados.competencia = r.dados.data.slice(0, 7);
        if (!r.dados.competencia && defaultCompetencia) r.dados.competencia = defaultCompetencia;
        if (!r.dados.competencia) { r.issues.push('competência ausente (informe na planilha ou defina padrão)'); r.valid = false; }
        if (!r.dados.valor || r.dados.valor === 0) { r.issues.push('valor ausente'); r.valid = false; }
        if (destino === 'despesa') {
          if (!r.dados.descricao) { r.issues.push('lançamento ausente'); r.valid = false; }
          if (!r.dados.tipo) r.dados.tipo = 'AVULSA';
        } else {
          if (!r.dados.alvoNome) { r.issues.push('beneficiário ausente'); r.valid = false; }
          if (!r.dados.tipoVale) r.dados.tipoVale = 'VALE';
        }
      });
    }
    setParsed({ headers: tsv.headers, allRows, headerMap, valid: allRows.filter(r => r.valid), invalid: allRows.filter(r => !r.valid) });
    setStep('preview');
  };

  const importar = () => {
    const rows = parsed.valid.map(r => r.dados);
    if (destino === 'lancamento') onSaveLanc(rows);
    else if (destino === 'despesa') onSaveDesp(rows);
    else onSaveDesc(rows);
  };

  return (
    <ModalBase titulo={titulo} onClose={onClose} grande>
      {step === 'input' && (
        <div className="space-y-4">
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded p-3 text-xs text-slate-600"><b className="text-indigo-600">Como usar:</b> Copie e cole direto do Excel/Google Sheets (incluindo cabeçalho).</div>
          {isLanc ? (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <Campo label="Template *"><select value={templateId} onChange={e => { setTemplateId(e.target.value); setDefaultCod(''); }} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm"><option value="">Selecione...</option>{Object.values(TEMPLATES).map(t => <option key={t.id} value={t.id}>{t.nome} · {t.cliente}</option>)}</select></Campo>
                <Campo label="Serviço padrão (opcional)"><select value={defaultCod} onChange={e => setDefaultCod(e.target.value)} disabled={!templateId} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm disabled:opacity-50"><option value="">— sem padrão —</option>{servicosT.map(s => <option key={s.cod} value={s.cod}>#{s.cod} · {s.descricao}</option>)}</select></Campo>
              </div>
              {template && (
                <div className="bg-slate-50 rounded p-3 text-xs">
                  <div className="text-slate-400 mb-1.5">Colunas reconhecidas:</div>
                  <div className="flex flex-wrap gap-1">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">DATA</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">CÓDIGO</span>
                    {template.campos.map(c => <span key={c.k} className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">{c.l.toUpperCase()}</span>)}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <Campo label="Competência padrão (opcional — usada quando não vier na planilha)"><input type="month" value={defaultCompetencia} onChange={e => setDefaultCompetencia(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" /></Campo>
              <div className="bg-slate-50 rounded p-3 text-xs">
                <div className="text-slate-400 mb-1.5">Colunas esperadas:</div>
                <div className="font-mono text-[10px] text-slate-600">{colsEsperadas}</div>
                <div className="text-slate-500 mt-2 italic">A competência vem da coluna COMPETÊNCIA. Se ausente, usa o mês da DATA. Se nem isso, usa a "Competência padrão" acima.</div>
              </div>
            </>
          )}
          <Campo label="Cole aqui os dados (com cabeçalho)" full><textarea value={rawText} onChange={e => setRawText(e.target.value)} rows={10} placeholder="Cabeçalho na primeira linha..." className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs font-mono" /></Campo>
          <div className="flex justify-end gap-2"><button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button><button onClick={analisar} disabled={(isLanc && !templateId) || !rawText.trim()} className="px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 font-medium disabled:opacity-50">Analisar →</button></div>
        </div>
      )}
      {step === 'preview' && parsed && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-xs"><Stat label="Total" valor={parsed.allRows.length} /><Stat label="Válidos" valor={parsed.valid.length} cor="text-emerald-600" /><Stat label="Inválidos" valor={parsed.invalid.length} cor="text-red-600" /></div>
          <div className="bg-slate-50 rounded p-2 text-xs">
            <div className="text-slate-400 mb-1">Mapeamento:</div>
            <div className="flex flex-wrap gap-1">{parsed.headers.map((h, i) => { const norm = normCol(h); const mapped = parsed.headerMap[norm]; const isMapped = mapped && mapped !== '@skip'; const isSkip = mapped === '@skip'; return <span key={i} className={`px-2 py-0.5 rounded font-mono text-[10px] ${isMapped ? 'bg-emerald-500/20 text-emerald-700' : isSkip ? 'bg-slate-200 text-slate-500' : 'bg-amber-500/20 text-amber-700'}`} title={isMapped ? `→ ${mapped.replace('extras.', '').replace('@', '')}` : isSkip ? 'ignorada' : 'não reconhecida'}>{h || '(vazia)'}</span>; })}</div>
          </div>
          <div className="max-h-80 overflow-auto bg-white rounded border border-slate-200">
            <table className="w-full text-xs">
              <thead className="text-[10px] text-slate-400 bg-white sticky top-0"><tr><th className="text-left px-2 py-1.5">#</th><th className="text-center px-2">OK</th>{isLanc && <th className="text-left px-2">Data</th>}{isLanc ? <><th className="text-left px-2">Cód.</th><th className="text-left px-2">Detalhes</th></> : <><th className="text-left px-2">Compet.</th><th className="text-left px-2">{destino === 'despesa' ? 'Lançamento' : 'Beneficiário'}</th><th className="text-left px-2">Tipo</th><th className="text-right px-2">Valor</th></>}<th className="text-left px-2">Problemas</th></tr></thead>
              <tbody>{parsed.allRows.map((r, i) => { const e = r.dados.extras || {}; return (
                <tr key={i} className="border-b border-slate-200/50">
                  <td className="px-2 py-1 text-slate-500">{i + 1}</td>
                  <td className="text-center px-2">{r.valid ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" /> : <X className="w-3.5 h-3.5 text-red-600 inline" />}</td>
                  {isLanc && <td className="px-2 whitespace-nowrap">{r.dados.data ? fmtData(r.dados.data) : <span className="text-red-600">—</span>}</td>}
                  {isLanc ? (<><td className="px-2 font-mono">{r.dados.codServico || <span className="text-red-600">—</span>}</td><td className="px-2 max-w-[280px] truncate">{[e.agente1, e.agente, e.motorista, e.rota, e.percurso, e.subCliente].filter(Boolean).slice(0, 3).join(' · ') || '—'}</td></>) : (<><td className="px-2">{r.dados.competencia ? fmtMesCurto(r.dados.competencia) : '—'}</td><td className="px-2 max-w-[200px] truncate">{(destino === 'despesa' ? r.dados.descricao : r.dados.alvoNome) || <span className="text-red-600">—</span>}</td><td className="px-2 text-xs">{(destino === 'despesa' ? r.dados.tipo : r.dados.tipoVale) || '—'}</td><td className="text-right px-2 font-medium">{r.dados.valor ? fmt(r.dados.valor) : <span className="text-red-600">—</span>}</td></>)}
                  <td className="px-2 text-amber-600 text-[10px]">{r.issues.join('; ')}</td>
                </tr>
              ); })}</tbody>
            </table>
          </div>
          <div className="flex justify-between gap-2"><button onClick={() => setStep('input')} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">← Voltar</button><div className="flex gap-2"><button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button><button onClick={importar} disabled={!parsed.valid.length} className="px-4 py-2 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-500 font-medium disabled:opacity-50">Importar {parsed.valid.length}</button></div></div>
        </div>
      )}
    </ModalBase>
  );
}

// ============ MODAL IMPORTAR DIÁRIAS ============
function ModalImportarDiarias({ onImportar, onFechar }) {
  const [texto, setTexto] = React.useState('');
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Importar Lançamentos Avulsos</h3>
          <button onClick={onFechar} className="p-1.5 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded p-3 text-xs text-slate-600">
          <b className="text-indigo-600">Formato esperado (tab ou ponto-e-vírgula):</b><br />
          <span className="font-mono">DATA&nbsp;&nbsp;&nbsp;&nbsp;CLIENTE&nbsp;&nbsp;&nbsp;&nbsp;NOME&nbsp;&nbsp;&nbsp;&nbsp;VALOR</span><br />
          <span className="font-mono text-slate-400">04/05/2026&nbsp;&nbsp;&nbsp;&nbsp;NATURA&nbsp;&nbsp;&nbsp;&nbsp;João Silva&nbsp;&nbsp;&nbsp;&nbsp;R$ 160,00</span>
        </div>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Cole o conteúdo do arquivo aqui..."
          className="w-full h-52 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button>
          <button onClick={() => onImportar(texto)} disabled={!texto.trim()} className="px-4 py-2 rounded-lg text-sm bg-orange-600 hover:bg-orange-500 font-medium disabled:opacity-50 flex items-center gap-2"><Upload className="w-4 h-4" />Importar</button>
        </div>
      </div>
    </div>
  );
}

// ============ MODAL DIÁRIA AVULSA ============
function ModalDiaria({ dados, funcionarios, categoriasFolha = [], onSalvar, onFechar }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [f, setF] = React.useState(dados || { data: hoje, competencia: hoje.slice(0, 7), funcionarioId: '', nome: '', clienteNome: '', folhaGrupo: '', valor: '' });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  // Auto-preenche folhaGrupo ao escolher funcionário (sugestão a partir do cadastro)
  useEffect(() => {
    if (!f.funcionarioId || f.folhaGrupo) return;
    const func = funcionarios.find(x => x.id === f.funcionarioId);
    if (func?.folhaGrupo) setF(p => ({ ...p, folhaGrupo: func.folhaGrupo }));
  }, [f.funcionarioId]);
  const salvar = () => {
    if (!f.funcionarioId || !f.data || !f.valor) return;
    const func = funcionarios.find(x => x.id === f.funcionarioId);
    onSalvar({ ...f, nome: func?.nome || f.nome, competencia: f.data.slice(0, 7), folhaGrupo: (f.folhaGrupo || '').toUpperCase(), valor: parseFloat(String(f.valor).replace(',', '.')) || 0 });
  };
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{dados ? 'Editar Lançamento Avulso' : 'Novo Lançamento Avulso'}</h3>
          <button onClick={onFechar} className="p-1.5 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid gap-3">
          <label className="text-sm text-slate-600">Data *
            <input type="date" value={f.data} onChange={e => set('data', e.target.value)} className="mt-1 w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-slate-600">Funcionário *
            <select value={f.funcionarioId} onChange={e => set('funcionarioId', e.target.value)} className="mt-1 w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm">
              <option value="">Selecione...</option>
              {funcionarios.filter(x => x.status === 'ATIVO').sort((a,b) => a.nome.localeCompare(b.nome)).map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-600">Categoria de folha
            <input list="cat-folha-diaria" value={f.folhaGrupo || ''} onChange={e => set('folhaGrupo', e.target.value.toUpperCase())} placeholder="Ex: ARMADA, ESCRITÓRIO" className="mt-1 w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
            <datalist id="cat-folha-diaria">{categoriasFolha.map(c => <option key={c.id} value={c.nome} />)}</datalist>
            <span className="text-[10px] text-slate-500 mt-1 block">Vincula essa diária a uma categoria de folha. Aparece no resumo agrupado.</span>
          </label>
          <label className="text-sm text-slate-600">Cliente (opcional)
            <input value={f.clienteNome || ''} onChange={e => set('clienteNome', e.target.value)} placeholder="Ex: NATURA" className="mt-1 w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-slate-600">Valor (R$) *
            <input type="number" step="0.01" min="0" value={f.valor} onChange={e => set('valor', e.target.value)} placeholder="160.00" className="mt-1 w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-slate-600">Observações
            <textarea value={f.observacoes || ''} onChange={e => set('observacoes', e.target.value)} rows={2} className="mt-1 w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm resize-none" />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button>
          <button onClick={salvar} disabled={!f.funcionarioId || !f.data || !f.valor} className="px-4 py-2 rounded-lg text-sm bg-orange-600 hover:bg-orange-500 font-medium disabled:opacity-50 flex items-center gap-2"><Save className="w-4 h-4" />Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ============ GERAÇÃO DE PDF DE PROPOSTA COMERCIAL — layout Grupo MR ============
async function gerarPropostaPDF(proposta) {
  // Paleta Grupo MR
  const PRETO   = [10, 10, 10];
  const PRETO3  = [26, 26, 26];
  const OURO    = [201, 168, 76];
  const BRANCO  = [255, 255, 255];
  const CINZA   = [136, 136, 136];
  const CINZA2  = [204, 204, 204];

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 14;
  const fmtVal = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtData = (s) => s ? new Date(s).toLocaleDateString('pt-BR') : '';

  // ── Pré-carrega recursos em paralelo ─────────────────────────────────────
  let itens = proposta.itens || [];
  let clientesImg = null;
  const logosEco = {}; // { url: base64 }

  const fetchBase64 = async (url) => {
    const r = await fetch(url);
    const blob = await r.blob();
    return new Promise(res => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  // Retorna dimensões reais da imagem a partir de base64 (para escala proporcional)
  const getImgDims = (b64) => new Promise((res) => {
    const img = new Image();
    img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => res({ w: 4, h: 1 });
    img.src = b64;
  });

  // Redimensiona imagem para PNG (preserva transparência; reduz tamanho pelo resize)
  const compressImg = (b64, maxPx = 800) => new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      if (scale >= 1) { res(b64); return; }
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      res(canvas.toDataURL('image/png'));
    };
    img.onerror = () => res(b64);
    img.src = b64;
  });

  // Eco items definidos antes do fetch para incluir logos no batch
  const ecoItems = [
    { nome: 'UP Vigilância',  desc: 'Segurança patrimonial, escolta armada e eventos. Autorizada pela Polícia Federal.', logoUrl: 'https://celso.cloud/imgs/mrup2.png' },
    { nome: 'MR Assessoria',  desc: 'Gestão de Facilities, portaria, controle de acesso e consultoria estratégica.',       logoUrl: 'https://celso.cloud/imgs/3333.png' },
    { nome: 'MR Tracker',     desc: 'Rastreamento veicular e inteligência para recuperação de ativos em tempo real.',      logoUrl: 'https://celso.cloud/imgs/1711997787.png' },
  ];

  // URLs a baixar: prestadores + eco items (dedupado)
  const logoUrls = [...new Set([
    ...PRESTADORES_PROPOSTA.map(p => p.logoUrl).filter(Boolean),
    ...ecoItems.map(e => e.logoUrl).filter(Boolean),
    'https://celso.cloud/imgs/alv.png',
  ])];
  const allFetches = [
    // itens da API
    (async () => {
      if (itens.length === 0 && proposta.id) {
        const r = await fetch(`/api/propostas/item.php?id=${proposta.id}`, { credentials: 'include' });
        const json = await r.json();
        itens = json?.data?.itens || json?.itens || [];
      }
    })(),
    // imagem de clientes — PNG redimensionado, máx 1200px
    fetchBase64('https://celso.cloud/imgs/91b29c44-fa8f-434a-8dc4-ab395cd3fef3.png').then(b64 => compressImg(b64, 1200)),
    // logos das empresas — PNG redimensionado, máx 600px
    ...logoUrls.map(url => fetchBase64(url).then(b64 => compressImg(b64, 600)).then(b64 => ({ url, b64 }))),
  ];

  const results = await Promise.allSettled(allFetches);
  if (results[1].status === 'fulfilled') clientesImg = results[1].value;
  results.slice(2).forEach(r => { if (r.status === 'fulfilled') logosEco[r.value.url] = r.value.b64; });

  const valorTotal = itens.reduce((s, it) => s + Number(it.valor_total || 0), 0);
  const numero = proposta.numero_formatado || `P-${String(proposta.numero || '').padStart(4, '0')}`;
  const nomeCliente = proposta.cliente_razao || proposta.cliente_nome || '—';

  // ── Helpers ──────────────────────────────────────────────────────────────
  const fillPage = (c = PRETO) => { doc.setFillColor(...c); doc.rect(0, 0, W, H, 'F'); };

  // Cabeçalho das páginas internas (reutilizado em cada nova página)
  const innerHeader = () => {
    fillPage();
    doc.setDrawColor(...OURO); doc.setLineWidth(0.4);
    doc.line(M, 12, W - M, 12);
    // Logo — centraliza "GRUPO MR" calculando largura real
    doc.setFontSize(9); doc.setFont(undefined, 'bold');
    doc.setTextColor(...BRANCO); doc.text('GRUPO ', M, 9);
    const gw = doc.getTextWidth('GRUPO ');
    doc.setTextColor(...OURO); doc.text('MR', M + gw, 9);
    doc.setFontSize(7.5); doc.setFont(undefined, 'normal');
    doc.setTextColor(...CINZA); doc.text('grupomr.seg.br', W - M, 9, { align: 'right' });
  };

  const sectionTitle = (text, y) => {
    doc.setFillColor(...OURO); doc.rect(M, y, 3, 9, 'F');
    doc.setFontSize(11); doc.setFont(undefined, 'bold');
    doc.setTextColor(...OURO); doc.text(text.toUpperCase(), M + 6, y + 7);
    return y + 14;
  };

  // ════════════════════════════════════════════════════════════════════════════
  // PÁGINA 1 — CAPA
  // ════════════════════════════════════════════════════════════════════════════
  fillPage();

  // Grade diagonal sutil (linhas muito escuras, quase invisíveis sobre o preto)
  doc.setDrawColor(22, 18, 5);
  doc.setLineWidth(0.2);
  const step = 22;
  for (let i = -Math.ceil(H / step); i < Math.ceil(W / step) + 4; i++) {
    doc.line(i * step, 0, i * step + H, H);
  }

  // "PROPOSTA COMERCIAL" topo direita
  doc.setFontSize(13); doc.setFont(undefined, 'bold');
  doc.setTextColor(...OURO);
  doc.text('PROPOSTA COMERCIAL', W - M, 20, { align: 'right' });
  const tagW = doc.getTextWidth('PROPOSTA COMERCIAL');
  doc.setDrawColor(...OURO); doc.setLineWidth(0.5);
  doc.line(W - M - tagW, 23, W - M, 23);

  // "GRUPO MR" — centralizado calculando largura real de cada parte
  const logoY = 138;
  doc.setFontSize(36); doc.setFont(undefined, 'bold');
  const grupoStr = 'GRUPO ';
  const mrStr = 'MR';
  const grupoW = doc.getTextWidth(grupoStr);
  const mrW = doc.getTextWidth(mrStr);
  const logoStartX = (W - grupoW - mrW) / 2;
  doc.setTextColor(...BRANCO);
  doc.text(grupoStr, logoStartX, logoY);
  doc.setTextColor(...OURO);
  doc.text(mrStr, logoStartX + grupoW, logoY);

  // Linha separadora dourada
  doc.setDrawColor(...OURO); doc.setLineWidth(0.6);
  doc.line(W / 2 - 42, logoY + 9, W / 2 + 42, logoY + 9);

  // Subtítulo
  doc.setFontSize(10); doc.setFont(undefined, 'normal');
  doc.setTextColor(...CINZA);
  doc.text('Segurança, Facilities & Consultoria', W / 2, logoY + 19, { align: 'center' });

  // Card "Aos Cuidados de"
  const cardW = 148, cardH = 48, cardX = (W - cardW) / 2, cardY = H - 98;
  doc.setFillColor(13, 13, 0);
  doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'F');
  doc.setDrawColor(...OURO); doc.setLineWidth(0.6);
  doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'S');
  doc.setFillColor(...OURO); doc.rect(cardX, cardY, 3, cardH, 'F');

  doc.setFontSize(7); doc.setFont(undefined, 'normal');
  doc.setTextColor(...CINZA);
  doc.text('Aos Cuidados de', W / 2, cardY + 11, { align: 'center' });
  doc.setFontSize(14); doc.setFont(undefined, 'bold');
  doc.setTextColor(...OURO);
  // Nome longo: quebra se necessário
  const nomeLinhas = doc.splitTextToSize(nomeCliente, cardW - 14);
  doc.text(nomeLinhas[0], W / 2, cardY + 24, { align: 'center' });
  if (nomeLinhas.length > 1) {
    doc.setFontSize(11);
    doc.text(nomeLinhas[1], W / 2, cardY + 34, { align: 'center' });
  }
  if (proposta.cliente_nome && proposta.cliente_nome !== nomeCliente) {
    doc.setFontSize(10); doc.setFont(undefined, 'normal');
    doc.setTextColor(...CINZA2);
    doc.text(proposta.cliente_nome, W / 2, cardY + 40, { align: 'center' });
  }

  // Linha inferior
  doc.setDrawColor(...OURO); doc.setLineWidth(0.4);
  doc.line(M, H - 20, W - M, H - 20);

  // ════════════════════════════════════════════════════════════════════════════
  // PÁGINA 2 — QUEM SOMOS + ECOSSISTEMA
  // ════════════════════════════════════════════════════════════════════════════
  doc.addPage(); innerHeader();
  let y = 22;

  y = sectionTitle('Quem Somos', y);
  doc.setFontSize(9.5); doc.setFont(undefined, 'normal'); doc.setTextColor(...CINZA2);
  const t1 = doc.splitTextToSize('Fundado em 2016, o Grupo MR é formado por profissionais com mais de 20 anos de experiência nos setores de segurança pública e privada. Nascemos com a visão de ser um ecossistema completo de soluções em segurança, facilities e inteligência operacional.', W - 2 * M);
  doc.text(t1, M, y); y += t1.length * 5 + 5;
  const t2 = doc.splitTextToSize('Nossa abordagem combina tecnologia de ponta com expertise humana, garantindo proteção real e mensurada para nossos clientes em todo o Brasil.', W - 2 * M);
  doc.text(t2, M, y); y += t2.length * 5 + 10;

  y = sectionTitle('Nosso Ecossistema', y);
  const ecoColW = (W - 2 * M - 8) / 3;
  const ecoCH = 62;
  const ecoLogoMaxW = ecoColW - 10;
  const ecoLogoMaxH = 22;
  for (let i = 0; i < ecoItems.length; i++) {
    const item = ecoItems[i];
    const cx = M + i * (ecoColW + 4);
    doc.setFillColor(...PRETO3); doc.roundedRect(cx, y, ecoColW, ecoCH, 3, 3, 'F');
    doc.setDrawColor(42, 42, 42); doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, ecoColW, ecoCH, 3, 3, 'S');

    const logoB64 = item.logoUrl ? logosEco[item.logoUrl] : null;
    if (logoB64) {
      // Escala proporcional: cabe em ecoLogoMaxW × ecoLogoMaxH sem distorção
      const dims = await getImgDims(logoB64);
      const asp = (dims.w / dims.h) || 1;
      let lw = ecoLogoMaxW, lh = lw / asp;
      if (lh > ecoLogoMaxH) { lh = ecoLogoMaxH; lw = lh * asp; }
      const lx = cx + (ecoColW - lw) / 2;
      doc.addImage(logoB64, 'PNG', lx, y + 5, lw, lh, undefined, 'FAST');
      doc.setFontSize(8.5); doc.setFont(undefined, 'bold'); doc.setTextColor(...OURO);
      doc.text(item.nome, cx + ecoColW / 2, y + 33, { align: 'center' });
      doc.setFontSize(7); doc.setFont(undefined, 'normal'); doc.setTextColor(...CINZA);
      const dl = doc.splitTextToSize(item.desc, ecoColW - 8);
      doc.text(dl, cx + ecoColW / 2, y + 40, { align: 'center' });
    } else {
      doc.setFontSize(9.5); doc.setFont(undefined, 'bold'); doc.setTextColor(...OURO);
      doc.text(item.nome, cx + ecoColW / 2, y + 18, { align: 'center' });
      doc.setFontSize(7.5); doc.setFont(undefined, 'normal'); doc.setTextColor(...CINZA);
      const dl = doc.splitTextToSize(item.desc, ecoColW - 6);
      doc.text(dl, cx + ecoColW / 2, y + 27, { align: 'center' });
    }
  }
  y += ecoCH + 8;

  if (proposta.prestador && proposta.prestador.toUpperCase().includes('UP VIGILÂNCIA')) {
    const alvUrl = 'https://celso.cloud/imgs/alv.png';
    const alvB64 = logosEco[alvUrl];
    y = sectionTitle('Autorização da Polícia Federal', y);
    if (alvB64) {
      const alvMaxW = W - 2 * M;
      const alvMaxH = 80;
      const dims = await getImgDims(alvB64);
      const asp = (dims.w / dims.h) || 1;
      let aw = alvMaxW, ah = aw / asp;
      if (ah > alvMaxH) { ah = alvMaxH; aw = ah * asp; }
      const ax = M + (alvMaxW - aw) / 2;
      doc.addImage(alvB64, 'PNG', ax, y, aw, ah, undefined, 'FAST');
      y += ah + 8;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PÁGINA 3 — CLIENTES + NÚMEROS
  // ════════════════════════════════════════════════════════════════════════════
  doc.addPage(); innerHeader();
  y = 22;

  y = sectionTitle('Principais Clientes', y);
  if (clientesImg) {
    // Imagem real de clientes (mantém proporção, max 80mm de altura)
    const imgMaxW = W - 2 * M, imgMaxH = 80;
    doc.addImage(clientesImg, 'PNG', M, y, imgMaxW, imgMaxH, undefined, 'FAST');
    y += imgMaxH + 8;
  } else {
    // Fallback: badges de texto
    const cliList = ['Avon', 'Natura', 'Sinqia', 'MD Delivery', 'Col. Santa Maria', 'iTracker', 'BRK / Alpargatas', 'AMAB', 'Spring Park', 'M. Rocha Engenharia', 'Grupo Tombini', 'Escoltech', 'Assai Atacadista', 'Vivere'];
    const bCols = 5, bW = (W - 2 * M - (bCols - 1) * 2) / bCols, bH = 11;
    cliList.forEach((cli, i) => {
      const col = i % bCols, row = Math.floor(i / bCols);
      const bx = M + col * (bW + 2), by = y + row * (bH + 3);
      doc.setFillColor(...PRETO3); doc.roundedRect(bx, by, bW, bH, 2, 2, 'F');
      doc.setFontSize(7.5); doc.setFont(undefined, 'normal'); doc.setTextColor(...CINZA2);
      doc.text(cli, bx + bW / 2, by + bH / 2 + 1.2, { align: 'center' });
    });
    y += Math.ceil(cliList.length / bCols) * (bH + 3) + 12;
  }

  y = sectionTitle('Nossa Experiência em Números', y);
  const nums = [
    { val: '50k+', label: 'Rotas Acompanhadas' },
    { val: '1200+', label: 'Ações Pronta Resposta' },
    { val: '200+', label: 'Cargas Recuperadas' },
    { val: '15+', label: 'Eventos' },
    { val: '7', label: 'Estados Atendidos' },
  ];
  const numColW = (W - 2 * M - 8) / 5;
  nums.forEach((n, i) => {
    const nx = M + i * (numColW + 2), numH = 38;
    doc.setFillColor(...PRETO3); doc.roundedRect(nx, y, numColW, numH, 3, 3, 'F');
    doc.setFontSize(22); doc.setFont(undefined, 'bold'); doc.setTextColor(...OURO);
    doc.text(n.val, nx + numColW / 2, y + 18, { align: 'center' });
    doc.setFontSize(7); doc.setFont(undefined, 'normal'); doc.setTextColor(...CINZA);
    doc.text(n.label.toUpperCase(), nx + numColW / 2, y + 29, { align: 'center' });
  });
  y += 48;

  // ════════════════════════════════════════════════════════════════════════════
  // PÁGINA 4+ — PROPOSTA COMERCIAL (dados reais)
  // ════════════════════════════════════════════════════════════════════════════
  doc.addPage(); innerHeader();
  y = 22;

  y = sectionTitle('Proposta Comercial', y);

  // Meta info
  const dataEmissao = proposta.criado_em ? fmtData(proposta.criado_em) : fmtData(new Date().toISOString());
  doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(...OURO);
  doc.text(`Proposta: ${numero}`, M, y);
  doc.setFont(undefined, 'normal'); doc.setTextColor(...CINZA2);
  doc.text(`Emissão: ${dataEmissao}`, M + 58, y);
  if (proposta.vencimento) doc.text(`Vencimento: ${proposta.vencimento}`, M + 116, y);
  y += 5;
  doc.text(`Categoria: ${proposta.categoria || ''}`, M, y);
  y += 10;

  // Tomador
  doc.setFillColor(...PRETO3); doc.roundedRect(M, y, W - 2 * M, 22, 3, 3, 'F');
  doc.setFillColor(...OURO); doc.rect(M, y, 3, 22, 'F');
  doc.setFontSize(7); doc.setFont(undefined, 'normal'); doc.setTextColor(...CINZA);
  doc.text('TOMADOR DO SERVICO', M + 6, y + 6);
  doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.setTextColor(...OURO);
  doc.text(nomeCliente, M + 6, y + 14);
  const cnpjFmt = String(proposta.cliente_cnpj || '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  doc.setFontSize(8.5); doc.setFont(undefined, 'normal'); doc.setTextColor(...CINZA2);
  doc.text(`CNPJ: ${cnpjFmt}`, M + 6, y + 20);
  if (proposta.cliente_email) doc.text(`E-mail: ${proposta.cliente_email}`, M + 84, y + 20);
  y += 28;

  // Prestador do serviço — exibido no escopo da proposta
  if (proposta.prestador) {
    const prestInfo = PRESTADORES_PROPOSTA.find(p => p.nome === proposta.prestador);
    const prestLogo = prestInfo?.logoUrl ? logosEco[prestInfo.logoUrl] : null;
    const pCardH = 22;
    doc.setFillColor(...PRETO3); doc.roundedRect(M, y, W - 2 * M, pCardH, 3, 3, 'F');
    doc.setFillColor(...OURO); doc.rect(M, y, 3, pCardH, 'F');
    doc.setFontSize(7); doc.setFont(undefined, 'normal'); doc.setTextColor(...CINZA);
    doc.text('PRESTADOR DO SERVICO', M + 6, y + 6);
    doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.setTextColor(...OURO);
    doc.text(proposta.prestador, M + 6, y + 14);
    if (prestInfo) {
      doc.setFontSize(8.5); doc.setFont(undefined, 'normal'); doc.setTextColor(...CINZA2);
      doc.text(`CNPJ: ${prestInfo.cnpj}`, M + 6, y + 20);
    }
    if (prestLogo) {
      const pDims = await getImgDims(prestLogo);
      const pAsp = (pDims.w / pDims.h) || 1;
      const pLogoMaxH = pCardH - 4, pLogoMaxW = 48;
      let plw = pLogoMaxW, plh = plw / pAsp;
      if (plh > pLogoMaxH) { plh = pLogoMaxH; plw = plh * pAsp; }
      doc.addImage(prestLogo, 'PNG', W - M - plw - 4, y + (pCardH - plh) / 2, plw, plh, undefined, 'FAST');
    }
    y += pCardH + 6;
  }

  // Campos de texto
  const camposTexto = [
    ['OBJETO DA PROPOSTA', proposta.condicoes_comerciais],
    ['CONDICOES DE FATURAMENTO', proposta.condicoes_faturamento],
    ['PRAZOS', proposta.prazos],
    ['OBSERVACOES', proposta.observacoes],
  ].filter(([, v]) => v?.trim());

  for (const [label, valor] of camposTexto) {
    if (y > 258) { doc.addPage(); innerHeader(); y = 22; }
    doc.setFontSize(7); doc.setFont(undefined, 'normal'); doc.setTextColor(...OURO);
    doc.text(label, M, y); y += 4;
    doc.setFontSize(9); doc.setTextColor(...CINZA2);
    const linhas = doc.splitTextToSize(valor, W - 2 * M);
    doc.text(linhas, M, y);
    y += linhas.length * 4.5 + 6;
  }

  if (y > 200) { doc.addPage(); innerHeader(); y = 22; }

  // Tabela de itens — colunas com larguras explícitas para quebra correta
  const isFacilities = proposta.categoria === 'FACILITIES';
  const contentW = W - 2 * M; // 182 mm
  let tHead, tBody, tColStyles;
  if (isFacilities) {
    tHead = [['Descrição', 'Efetivo', 'Escala', 'Qtd', 'Valor Unit. (R$)', 'Total (R$)']];
    tBody = itens.map(it => [
      it.descricao || '',
      it.efetivo != null ? String(it.efetivo) : '',
      it.escala || '',
      String(it.quantidade || 1),
      fmtVal(it.valor_unitario),
      fmtVal(it.valor_total),
    ]);
    tColStyles = {
      0: { cellWidth: 72 },                       // Descrição
      1: { cellWidth: 18, halign: 'center' },      // Efetivo
      2: { cellWidth: 26, halign: 'center' },      // Escala
      3: { cellWidth: 14, halign: 'center' },      // Qtd
      4: { cellWidth: 26, halign: 'right' },       // Unitário
      5: { cellWidth: 26, halign: 'right' },       // Total
    };
  } else {
    tHead = [['Descrição', 'Qtd', 'Valor Unit. (R$)', 'Total (R$)']];
    tBody = itens.map(it => {
      // Exibe número sem decimais quando inteiro (3h em vez de 3.00h)
      const fmtN = (v) => { const n = Number(v) || 0; return n === Math.floor(n) ? String(Math.floor(n)) : n.toFixed(2).replace('.', ','); };
      const ops = [
        (Number(it.franquia_horas) > 0 || Number(it.franquia_km) > 0)
          ? `Franquia: ${fmtN(it.franquia_horas)}h / ${fmtN(it.franquia_km)}km` : '',
        Number(it.hora_extra_fatura) > 0 ? `H.extra: R$ ${fmtVal(it.hora_extra_fatura)}/h` : '',
        Number(it.km_extra_fatura) > 0 ? `KM extra: R$ ${fmtVal(it.km_extra_fatura)}/km` : '',
        // Adic.dom. sempre visível (mesmo R$ 0,00) para que todos os itens ESCOLTA sejam comparáveis
        `Adic.dom.: R$ ${fmtVal(it.adicional_domingos_fatura || 0)}`,
      ].filter(Boolean).join('  •  ');
      const desc = ops ? `${it.descricao || ''}\n${ops}` : (it.descricao || '');
      return [desc, String(it.quantidade || 1), fmtVal(it.valor_unitario), fmtVal(it.valor_total)];
    });
    tColStyles = {
      0: { cellWidth: 110 },                      // Descrição larga (aceita quebra de linha)
      1: { cellWidth: 16, halign: 'center' },     // Qtd
      2: { cellWidth: 30, halign: 'right' },      // Unitário
      3: { cellWidth: 26, halign: 'right' },      // Total
    };
  }

  autoTable(doc, {
    startY: y,
    head: tHead,
    body: tBody,
    columnStyles: tColStyles,
    styles: { overflow: 'linebreak', cellPadding: 2.5 },
    headStyles: { fillColor: OURO, textColor: PRETO, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: CINZA2, fillColor: PRETO3 },
    alternateRowStyles: { fillColor: [22, 22, 22] },
    tableLineColor: [42, 42, 42],
    tableLineWidth: 0.2,
    margin: { left: M, right: M },
    // Para ESCOLTA: quando a célula Descrição tem 2 linhas, renderiza a 2ª em tom menor
    willDrawCell: (data) => {
      if (!isFacilities && data.section === 'body' && data.column.index === 0) {
        const lines = data.cell.text;
        if (lines.length >= 2) {
          // Redesenha manualmente: 1ª linha normal, 2ª linha em gray menor
          const x = data.cell.x + data.cell.padding('left');
          const y0 = data.cell.y + data.cell.padding('top');
          doc.setFontSize(9); doc.setFont(undefined, 'normal');
          doc.setTextColor(...CINZA2);
          doc.text(lines[0], x, y0 + 6);
          doc.setFontSize(7); doc.setTextColor(120, 120, 120);
          doc.text(lines.slice(1).join(' '), x, y0 + 12);
          return false; // cancela renderização padrão desta célula
        }
      }
    },
    didDrawPage: () => {
      const pg = doc.internal.getCurrentPageInfo().pageNumber;
      if (pg > 4) innerHeader();
    },
  });
  y = doc.lastAutoTable.finalY + 5;

  // Barra de total dourada
  if (y > 272) { doc.addPage(); innerHeader(); y = 22; }
  doc.setFillColor(...OURO);
  doc.rect(M, y, W - 2 * M, 12, 'F');
  doc.setTextColor(...PRETO);
  doc.setFontSize(10.5); doc.setFont(undefined, 'bold');
  doc.text('VALOR TOTAL DA PROPOSTA', M + 5, y + 8);
  doc.text(`R$ ${fmtVal(valorTotal)}`, W - M - 5, y + 8, { align: 'right' });
  y += 18;

  // ════════════════════════════════════════════════════════════════════════════
  // ÚLTIMA PÁGINA — CONTATO
  // ════════════════════════════════════════════════════════════════════════════
  doc.addPage(); innerHeader();
  y = 22;
  y = sectionTitle('Estamos à Disposição', y);

  const ctH = 68, ctX = M + 20, ctW = W - 2 * M - 40;
  doc.setFillColor(...PRETO3); doc.roundedRect(ctX, y, ctW, ctH, 5, 5, 'F');
  doc.setDrawColor(...OURO); doc.setLineWidth(0.8);
  doc.roundedRect(ctX, y, ctW, ctH, 5, 5, 'S');
  doc.setFillColor(...OURO); doc.roundedRect(ctX, y, 4, ctH, 3, 3, 'F');

  doc.setFontSize(7); doc.setFont(undefined, 'normal'); doc.setTextColor(...CINZA);
  doc.text('PLANTÃO COMERCIAL', W / 2, y + 12, { align: 'center' });
  doc.setFontSize(16); doc.setFont(undefined, 'bold'); doc.setTextColor(...OURO);
  doc.text('Celso Almeida', W / 2, y + 25, { align: 'center' });
  doc.setFontSize(9.5); doc.setFont(undefined, 'normal'); doc.setTextColor(...CINZA2);
  doc.text('celso.almeida@grupomr.seg.br', W / 2, y + 36, { align: 'center' });
  doc.text('(21) 96914-4872  |  (21) 2751-3930', W / 2, y + 44, { align: 'center' });
  doc.setFontSize(8); doc.setTextColor(...CINZA);
  doc.text('Rua Américo de Souza, 53 – Vila São João | São João de Meriti – RJ', W / 2, y + 52, { align: 'center' });
  if (proposta.vencimento) {
    doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(...OURO);
    doc.text(`Validade da proposta: ${proposta.vencimento}`, W / 2, y + 62, { align: 'center' });
  }
  y += ctH + 22;

  // Rodapé logo final
  doc.setDrawColor(...OURO); doc.setLineWidth(0.4);
  doc.line(M, y, W - M, y); y += 8;
  doc.setFontSize(14); doc.setFont(undefined, 'bold');
  const fGrupoW = doc.getTextWidth('GRUPO ');
  const fMrW   = doc.getTextWidth('MR');
  const fStartX = (W - fGrupoW - fMrW) / 2;
  doc.setTextColor(...BRANCO); doc.text('GRUPO ', fStartX, y);
  doc.setTextColor(...OURO);   doc.text('MR', fStartX + fGrupoW, y);
  doc.setFontSize(8); doc.setFont(undefined, 'normal'); doc.setTextColor(...CINZA);
  doc.text('grupomr.seg.br', W / 2, y + 8, { align: 'center' });

  // ════════════════════════════════════════════════════════════════════════════
  // NUMERAÇÃO DE PÁGINAS (pós-build, exceto capa)
  // ════════════════════════════════════════════════════════════════════════════
  const totalPages = doc.internal.getNumberOfPages();
  for (let pg = 2; pg <= totalPages; pg++) {
    doc.setPage(pg);
    doc.setFontSize(7); doc.setFont(undefined, 'normal');
    doc.setTextColor(...CINZA);
    doc.text(`Página ${pg - 1} de ${totalPages - 1}`, W - M, H - 5, { align: 'right' });
  }

  doc.save(`Proposta_${numero}_${nomeCliente.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

// ============ GERAÇÃO DE PDF DE MEDIÇÃO (resumo do fechamento) — layout Grupo MR ============
function gerarMedicaoPDFBlob(fechamento, lancamentos, servicos) {
  // Paleta Grupo MR
  const PRETO   = [10, 10, 10];
  const PRETO3  = [26, 26, 26];
  const OURO    = [201, 168, 76];
  const BRANCO  = [255, 255, 255];
  const CINZA   = [136, 136, 136];
  const CINZA2  = [204, 204, 204];

  const isNatura = ['NATURA_NOTURNA', 'NATURA_MOTOLINK'].includes(fechamento.template)
    || (fechamento.templates || []).some(t => ['NATURA_NOTURNA', 'NATURA_MOTOLINK'].includes(t));
  const orientation = isNatura ? 'portrait' : 'landscape';
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const W = orientation === 'landscape' ? 297 : 210;
  const H = orientation === 'landscape' ? 210 : 297;
  const M = 14;

  const cliente = fechamento.cliente || '';
  const periodo = fechamento.periodo || '';
  const numero  = fechamento.numeroFmt || '';
  const lancs   = (fechamento.lancamentos || []).map(lid => lancamentos.find(l => String(l.id) === String(lid))).filter(Boolean);
  const fmtHora = (dt) => { const m = String(dt || '').match(/T?(\d{2}:\d{2})/); return m ? m[1] : (dt ? String(dt) : ''); };
  const fmtVal  = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Helpers ──────────────────────────────────────────────────────────────
  const fillPage = () => { doc.setFillColor(...PRETO); doc.rect(0, 0, W, H, 'F'); };
  const pageHeader = () => {
    fillPage();
    // Linha dourada topo
    doc.setDrawColor(...OURO); doc.setLineWidth(0.4);
    doc.line(M, 12, W - M, 12);
    // Logo GRUPO MR
    doc.setFontSize(9); doc.setFont(undefined, 'bold');
    doc.setTextColor(...BRANCO); doc.text('GRUPO ', M, 9);
    doc.setTextColor(...OURO); doc.text('MR', M + 16, 9);
    // Site
    doc.setFontSize(7.5); doc.setFont(undefined, 'normal');
    doc.setTextColor(...CINZA); doc.text('grupomr.seg.br', W - M, 9, { align: 'right' });
  };

  // ── Página única ─────────────────────────────────────────────────────────
  pageHeader();
  let y = 18;

  // Título centralizado
  doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.setTextColor(...OURO);
  doc.text('MEDICAO DE SERVICOS', W / 2, y, { align: 'center' });
  y += 8;
  doc.setDrawColor(...OURO); doc.setLineWidth(0.5);
  doc.line(W / 2 - 40, y, W / 2 + 40, y);
  y += 6;

  // Card cabeçalho (cliente + período + fatura)
  const cardH = fechamento.dataInicio && fechamento.dataFim ? 24 : 20;
  doc.setFillColor(...PRETO3); doc.roundedRect(M, y, W - 2 * M, cardH, 3, 3, 'F');
  doc.setFillColor(...OURO); doc.rect(M, y, 3, cardH, 'F');

  doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(...OURO);
  doc.text(cliente, M + 6, y + 7);
  doc.setFontSize(8); doc.setFont(undefined, 'normal'); doc.setTextColor(...CINZA2);
  const periodoFmt = periodo ? periodo.slice(0, 7).split('-').reverse().join('/') : '';
  let metaTexto = `Competencia: ${periodoFmt}`;
  if (numero) metaTexto += `   |   Fatura: ${numero}`;
  doc.text(metaTexto, M + 6, y + 13);
  if (fechamento.dataInicio && fechamento.dataFim) {
    doc.setTextColor(...CINZA);
    doc.text(`Periodo: ${fechamento.dataInicio.split('-').reverse().join('/')} a ${fechamento.dataFim.split('-').reverse().join('/')}`, M + 6, y + 20);
  }
  y += cardH + 6;

  // ── Tabela de lançamentos ─────────────────────────────────────────────────
  let head, rows, colStyles;
  if (isNatura) {
    rows = lancs.map(l => [
      l.os || '',
      l.data ? l.data.split('-').reverse().join('/') : '',
      l.descricao || '',
      fmtVal(l.totalFatura),
    ]);
    head = [['OS', 'Data', 'Servico', 'Valor (R$)']];
    colStyles = { 3: { halign: 'right' } };
  } else {
    rows = lancs.map(l => [
      l.os || '',
      l.data ? l.data.split('-').reverse().join('/') : '',
      l.descricao || '',
      l.extras?.kmInicial ?? '',
      l.extras?.kmFinal ?? '',
      Number(l.kmRodados || 0) || '',
      Number(l.extraKmFatura || 0) || '',
      fmtHora(l.extras?.inicio),
      fmtHora(l.extras?.termino),
      Number(l.horasTrabalhadas || 0) || '',
      Number(l.extraHorasFatura || 0) || '',
      fmtVal(l.totalFatura),
    ]);
    head = [['OS', 'Data', 'Servico', 'KM Ini.', 'KM Fin.', 'KM Rod.', 'KM Ext.', 'H. Inicio', 'H. Fim', 'H. Trab.', 'H. Extra', 'Valor (R$)']];
    colStyles = { 11: { halign: 'right' } };
  }

  autoTable(doc, {
    head,
    body: rows,
    startY: y,
    styles: { fontSize: 7, cellPadding: 1.8, textColor: CINZA2, fillColor: PRETO3 },
    headStyles: { fillColor: OURO, textColor: PRETO, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [22, 22, 22] },
    tableLineColor: [42, 42, 42],
    tableLineWidth: 0.2,
    columnStyles: colStyles,
    margin: { left: M, right: M },
  });

  // v99 — PDF de medição não exibe impostos (alíquota/ISS/retenções/líquido).
  // É um demonstrativo dos serviços prestados + valor bruto faturado. Cliente não recebe info tributária.
  const finalY = doc.lastAutoTable.finalY + 4;

  // Barra de total dourada
  if (finalY < H - 22) {
    doc.setFillColor(...OURO);
    doc.rect(M, finalY, W - 2 * M, 11, 'F');
    doc.setTextColor(...PRETO);
    doc.setFontSize(9); doc.setFont(undefined, 'bold');
    doc.text(`${lancs.length} lancamentos`, M + 4, finalY + 7.5);
    doc.text(`TOTAL: R$ ${fmtVal(fechamento.totalFatura)}`, W - M - 4, finalY + 7.5, { align: 'right' });
  }

  // Rodapé
  const footerY = H - 8;
  doc.setDrawColor(...OURO); doc.setLineWidth(0.3);
  doc.line(M, footerY - 4, W - M, footerY - 4);
  doc.setFontSize(7); doc.setFont(undefined, 'normal'); doc.setTextColor(...CINZA);
  doc.text('GRUPO MR — Seguranca, Facilities & Consultoria', M, footerY);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, W - M, footerY, { align: 'right' });

  return doc.output('blob');
}

// ============ MODAL EDITAR CLIENTE DA FATURA ============
function ModalEditarClienteFatura({ clienteAtual, clientes, onSave, onClose }) {
  const [cliente, setCliente] = useState(clienteAtual || '');
  return (
    <ModalBase titulo="Editar Cliente da Fatura" onClose={onClose} pequeno>
      <div className="space-y-4">
        <Campo label="Cliente *">
          <select value={cliente} onChange={e => setCliente(e.target.value)} autoFocus className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm">
            <option value="">Selecione o cliente</option>
            {clientes.map(c => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
          </select>
        </Campo>
        <div className="flex gap-2 pt-1">
          <button onClick={() => { if (!cliente) return; onSave(cliente); }} disabled={!cliente} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 py-2 rounded-lg text-sm font-medium">Salvar</button>
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm">Cancelar</button>
        </div>
      </div>
    </ModalBase>
  );
}

// ============ MODAL EDITAR COMPETÊNCIA DA FATURA ============
function ModalEditarCompetenciaFatura({ periodoAtual, onSave, onClose }) {
  const [periodo, setPeriodo] = useState(periodoAtual || '');
  return (
    <ModalBase titulo="Editar Competência" onClose={onClose} pequeno>
      <div className="space-y-4">
        <Campo label="Competência (AAAA-MM) *">
          <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} autoFocus className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
        </Campo>
        <div className="flex gap-2 pt-1">
          <button onClick={() => { if (!periodo) return; onSave(periodo); }} disabled={!periodo} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 py-2 rounded-lg text-sm font-medium">Salvar</button>
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm">Cancelar</button>
        </div>
      </div>
    </ModalBase>
  );
}

// ============ MODAL INFORMAR NF ============
const EMPRESAS_FATURANTE = ['MR ASSESSORIA', 'UP VIGILÂNCIA'];
function ModalInformarNF({ onConfirmar, onClose }) {
  const [nfNumero, setNfNumero] = useState('');
  const [nfData, setNfData] = useState(new Date().toISOString().slice(0, 10));
  const [empresa, setEmpresa] = useState('');
  return (
    <ModalBase titulo="Informar Número da NF" onClose={onClose} pequeno>
      <div className="space-y-3">
        <Campo label="Número da NF *">
          <input value={nfNumero} onChange={e => setNfNumero(e.target.value)} autoFocus placeholder="Ex: 12345" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
        </Campo>
        <Campo label="Data de emissão">
          <input type="date" value={nfData} onChange={e => setNfData(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
        </Campo>
        <Campo label="Empresa faturante">
          <select value={empresa} onChange={e => setEmpresa(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm">
            <option value="">— selecionar —</option>
            {EMPRESAS_FATURANTE.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </Campo>
        <div className="flex gap-2 pt-1">
          <button onClick={() => { if (!nfNumero.trim()) return; onConfirmar(nfNumero.trim(), nfData, empresa || undefined); }} className="flex-1 bg-purple-600 hover:bg-purple-500 py-2 rounded-lg text-sm font-medium disabled:opacity-50" disabled={!nfNumero.trim()}>Confirmar NF-emitida</button>
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm">Cancelar</button>
        </div>
      </div>
    </ModalBase>
  );
}

// ============ MODAL IMPORTAR XML NF-e — GERAR FATURA ============
function ModalImportarXMLNF({ clientes, onSave, onClose }) {
  const [arquivo, setArquivo] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [erro, setErro] = useState('');
  const hojeMes = new Date().toISOString().slice(0, 7);
  const [form, setForm] = useState({
    nfNumero: '', nfData: new Date().toISOString().slice(0, 10),
    cliente: '', competencia: hojeMes,
    totalFatura: '', descricao: 'Prestação de Serviços de Segurança e Escolta Armada',
    template: '',
  });

  const guessTemplate = (nome) => {
    const n = (nome || '').toUpperCase();
    if (n.includes('NATURA')) return 'NATURA_NOTURNA';
    if (n.includes('IRB')) return 'IRB_ITRACKER';
    if (n.includes('TOMBINI')) return 'TOMBINI';
    if (n.includes('ESCOLTECH')) return 'ESCOLTECH';
    if (n.includes('BRK')) return 'BRK';
    return '';
  };

  const parseXML = (text) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Arquivo XML inválido ou corrompido.');
    const get = (sel) => doc.querySelector(sel)?.textContent?.trim() || '';
    // NF-e padrão SEFAZ
    const nNF = get('nNF');
    const dhEmi = get('dhEmi') || get('dEmi');
    const xNomeEmit = get('emit xNome') || get('emit > xNome');
    const cnpjEmit = get('emit CNPJ').replace(/\D/g, '');
    const xNomeDest = get('dest xNome') || get('dest > xNome');
    const cnpjDest = get('dest CNPJ').replace(/\D/g, '');
    // ValorServicos/ValorServico = valor bruto NFS-e (sem retenções). vLiq é o líquido — só fallback final.
    const vNF = get('ValorServicos') || get('ValorServico') || get('ICMSTot vNF') || get('vNF') || get('vServico') || get('Valor') || get('vLiq') || get('ValorLiquidoNfse');
    const xProd = get('xProd') || get('xServ') || get('Discriminacao') || '';
    const infCpl = get('infCpl') || get('xInf') || '';
    // Data de emissão → YYYY-MM-DD
    let dataFmt = '';
    if (dhEmi) {
      const d = new Date(dhEmi.replace(/([+-]\d{2}:\d{2}|Z)$/, 'Z'));
      if (!isNaN(d.getTime())) dataFmt = d.toISOString().slice(0, 10);
    }
    // Competência: tenta extrair de infCpl, fallback = mês da emissão
    let competencia = '';
    const matchComp = infCpl.match(/(\d{2})[\/.](\d{4})/);
    if (matchComp) competencia = `${matchComp[2]}-${matchComp[1].padStart(2, '0')}`;
    if (!competencia && dataFmt) competencia = dataFmt.slice(0, 7);
    const fmtCnpj = (c) => c.length === 14 ? c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : c;
    return { nNF, data: dataFmt, emitente: { nome: xNomeEmit, cnpj: fmtCnpj(cnpjEmit) }, destinatario: { nome: xNomeDest, cnpj: fmtCnpj(cnpjDest) }, valor: vNF, descricao: xProd, competencia, infCpl, cnpjEmit, cnpjDest };
  };

  const onSelectFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setArquivo(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const r = parseXML(ev.target.result);
        setParsed(r); setErro('');
        // Matching automático de cliente por CNPJ ou nome
        const matchCli = clientes.find(c => {
          const cnpjC = (c.cnpj || '').replace(/\D/g, '');
          return (cnpjC && (cnpjC === r.cnpjEmit || cnpjC === r.cnpjDest)) ||
            c.nome.toUpperCase().includes((r.emitente.nome || '').toUpperCase().slice(0, 8)) ||
            c.nome.toUpperCase().includes((r.destinatario.nome || '').toUpperCase().slice(0, 8));
        });
        setForm(prev => ({
          ...prev,
          nfNumero: r.nNF || prev.nfNumero,
          nfData: r.data || prev.nfData,
          cliente: matchCli?.nome || prev.cliente,
          competencia: r.competencia || prev.competencia,
          totalFatura: r.valor || prev.totalFatura,
          descricao: r.descricao || prev.descricao,
          template: matchCli ? guessTemplate(matchCli.nome) : prev.template,
        }));
      } catch (e) { setErro(e.message); setParsed(null); }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const valido = form.cliente && form.totalFatura && form.nfNumero && form.competencia;

  return (
    <ModalBase titulo="Importar XML NF-e — Gerar Fatura" onClose={onClose} grande>
      <div className="space-y-4">
        {/* Upload */}
        <label className="block w-full cursor-pointer border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-lg p-5 text-center transition">
          <input type="file" accept=".xml,text/xml,application/xml" onChange={onSelectFile} className="hidden" />
          <FileText className="w-7 h-7 mx-auto mb-1.5 text-slate-500" />
          <div className="text-sm text-slate-400">{arquivo ? <span className="text-indigo-600 font-medium">{arquivo.name}</span> : 'Clique para selecionar o XML da NF-e / NFS-e'}</div>
          <div className="text-xs text-slate-600 mt-1">Padrão SEFAZ NF-e (mod 55/65) e NFS-e nacional</div>
        </label>

        {erro && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300"><AlertCircle className="w-4 h-4 inline mr-1" />{erro}</div>}

        {parsed && (
          <div className="bg-white border border-slate-200/60 rounded-lg p-3 text-xs space-y-1.5">
            <div className="font-semibold text-slate-600">Dados extraídos do XML</div>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-slate-400">
              {parsed.emitente.nome && <><span>Emitente:</span><span className="text-slate-700">{parsed.emitente.nome}{parsed.emitente.cnpj && ` — ${parsed.emitente.cnpj}`}</span></>}
              {parsed.destinatario.nome && <><span>Destinatário:</span><span className="text-slate-700">{parsed.destinatario.nome}{parsed.destinatario.cnpj && ` — ${parsed.destinatario.cnpj}`}</span></>}
              {parsed.valor && <><span>Valor:</span><span className="text-emerald-600 font-mono">R$ {parsed.valor}</span></>}
              {parsed.infCpl && <><span>Info adicional:</span><span className="text-slate-400 line-clamp-2">{parsed.infCpl}</span></>}
            </div>
          </div>
        )}

        {/* Formulário — preenchido automaticamente, editável */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo label="Número da NF *">
            <input value={form.nfNumero} onChange={e => setForm({...form, nfNumero: e.target.value})} placeholder="Ex: 12345" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
          </Campo>
          <Campo label="Data de emissão *">
            <input type="date" value={form.nfData} onChange={e => setForm({...form, nfData: e.target.value})} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
          </Campo>
          <Campo label="Cliente *">
            <select value={form.cliente} onChange={e => setForm({...form, cliente: e.target.value, template: guessTemplate(e.target.value)})} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm">
              <option value="">Selecione o cliente</option>
              {clientes.map(c => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Competência *">
            <input type="month" value={form.competencia} onChange={e => setForm({...form, competencia: e.target.value})} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
          </Campo>
          <Campo label="Valor total (R$) *">
            <input value={form.totalFatura} onChange={e => setForm({...form, totalFatura: e.target.value})} placeholder="Ex: 15000.00" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
          </Campo>
          <Campo label="Template do serviço">
            <select value={form.template} onChange={e => setForm({...form, template: e.target.value})} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm">
              <option value="">Selecione...</option>
              {Object.keys(TEMPLATES).map(t => <option key={t} value={t}>{TEMPLATES[t].nome}</option>)}
            </select>
          </Campo>
          <Campo label="Descrição (aparece no PDF/XLSX)" span={2}>
            <input value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
          </Campo>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={() => { if (!valido) return; onSave(form); }} disabled={!valido} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
            <FileCheck className="w-4 h-4" />Gerar Fatura {form.nfNumero ? `— NF ${form.nfNumero}` : ''}
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm">Cancelar</button>
        </div>
      </div>
    </ModalBase>
  );
}

// ============ MODAL ENVIAR MEDIÇÃO POR EMAIL ============
function ModalEnviarMedicao({ fechamento, lancamentos, servicos, funcionarios, emailsCobranca = [], clientes = [], onClose, onEnviar, onEnviadoOk }) {
  const cliente = fechamento.cliente || '';
  const periodo = fechamento.periodo || '';
  const [destinatarios, setDestinatarios] = useState(() => Array.isArray(emailsCobranca) ? [...emailsCobranca] : []);
  const [emailInput, setEmailInput] = useState('');
  const [assunto, setAssunto] = useState(`MEDIÇÃO DE SERVIÇOS - ${cliente} ${periodo}`);
  const [corpo, setCorpo] = useState(`Prezado cliente,\n\nSegue em anexo a medição de serviços referente à competência ${periodo}.\n\nQualquer dúvida estamos à disposição.\n\nAtenciosamente,`);
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const adicionarEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (!e) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { onEnviar({ msg: 'E-mail inválido', tipo: 'error' }); return; }
    if (destinatarios.includes(e)) { onEnviar({ msg: 'E-mail já adicionado', tipo: 'error' }); return; }
    setDestinatarios([...destinatarios, e]);
    setEmailInput('');
  };
  const removerEmail = (e) => setDestinatarios(destinatarios.filter(x => x !== e));

  const salvarLista = async () => {
    const cli = clientes.find(c => c.nome === cliente);
    if (!cli?._apiId) { onEnviar({ msg: 'Cliente não encontrado para salvar lista', tipo: 'error' }); return; }
    setSalvando(true);
    try {
      const resp = await fetch(`/api/clientes/item.php?id=${cli._apiId}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: cli.nome, emails_cobranca: destinatarios }),
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error);
      onEnviar({ msg: 'Lista de e-mails salva!', tipo: 'success' });
    } catch (e) {
      onEnviar({ msg: `Erro ao salvar: ${e.message}`, tipo: 'error' });
    } finally {
      setSalvando(false);
    }
  };

  const enviar = async () => {
    if (destinatarios.length === 0) { onEnviar({ msg: 'Adicione ao menos um destinatário', tipo: 'error' }); return; }
    setEnviando(true);
    try {
      const pdfBlob = gerarMedicaoPDFBlob(fechamento, lancamentos, servicos);
      const pdfBase64 = await blobToBase64(pdfBlob);
      const xlsxBuffer = gerarFaturaXLSXBuffer(fechamento, lancamentos, servicos, funcionarios);
      const xlsxBase64 = await arrayBufferToBase64(xlsxBuffer);
      const safeCliente = cliente.replace(/[^a-zA-Z0-9]+/g, '_');
      const pdfName = `Medicao_${safeCliente}_${periodo}.pdf`;
      const xlsxName = `Medicao_${safeCliente}_${periodo}.xlsx`;
      const resp = await fetch('/api/email/enviar_medicao.php', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente, periodo, destinatarios, assunto, corpo,
          fechamento_id: fechamento._apiId || null,
          anexos: [
            { nome: pdfName, mime: 'application/pdf', base64: pdfBase64 },
            { nome: xlsxName, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', base64: xlsxBase64 },
          ],
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || `Erro HTTP ${resp.status}`);
      onEnviar({ msg: `Medição enviada para ${destinatarios.length} destinatário(s)`, tipo: 'success' });
      if (onEnviadoOk && fechamento.id) onEnviadoOk(fechamento.id);
      onClose();
    } catch (e) {
      onEnviar({ msg: `Falha no envio: ${e.message}`, tipo: 'error' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ModalBase titulo={`Enviar medição — ${cliente}`} onClose={onClose} grande>
      <div className="space-y-4">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-slate-600">
          <p>Serão anexados automaticamente:</p>
          <ul className="list-disc pl-5 mt-1 text-slate-400">
            <li><b className="text-slate-600">PDF</b> com resumo da medição (lançamentos + totais)</li>
            <li><b className="text-slate-600">XLSX</b> com a planilha completa da fatura</li>
          </ul>
        </div>

        <Campo label="Destinatários*">
          <div className="flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarEmail(); } }}
              placeholder="email@cliente.com"
              className="flex-1 bg-white border border-slate-200 rounded px-3 py-2 text-sm"
            />
            <button onClick={adicionarEmail} type="button" className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-sm font-medium">Adicionar</button>
          </div>
          {destinatarios.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {destinatarios.map(e => (
                <span key={e} className="bg-indigo-500/20 border border-indigo-500/40 text-indigo-700 text-xs px-2 py-1 rounded-full flex items-center gap-1.5">
                  {e}
                  <button onClick={() => removerEmail(e)} type="button" className="hover:text-slate-900"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
          {destinatarios.length > 0 && (
            <button onClick={salvarLista} disabled={salvando} type="button" className="mt-2 text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 disabled:opacity-50">
              <Save className="w-3 h-3" />{salvando ? 'Salvando...' : 'Salvar lista para próximos envios'}
            </button>
          )}
        </Campo>

        <Campo label="Assunto">
          <input type="text" value={assunto} onChange={e => setAssunto(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
        </Campo>

        <Campo label="Corpo do e-mail">
          <textarea value={corpo} onChange={e => setCorpo(e.target.value)} rows={6} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
        </Campo>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <button onClick={onClose} disabled={enviando} className="px-4 py-2 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button>
          <button onClick={enviar} disabled={enviando || destinatarios.length === 0} className="px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 font-medium">
            {enviando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {enviando ? 'Enviando...' : `Enviar (${destinatarios.length})`}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}

// ============ HELPERS DE EMAIL ============
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return Promise.resolve(btoa(binary));
}

// Wrapper que gera XLSX da fatura como ArrayBuffer (sem download)
function gerarFaturaXLSXBuffer(fechamento, lancamentos, servicos, funcionarios) {
  const wb = XLSX.utils.book_new();
  const lancs = (fechamento.lancamentos || []).map(lid => lancamentos.find(l => String(l.id) === String(lid))).filter(Boolean);
  const isNatura = ['NATURA_NOTURNA', 'NATURA_MOTOLINK'].includes(fechamento.template)
    || (fechamento.templates || []).some(t => ['NATURA_NOTURNA', 'NATURA_MOTOLINK'].includes(t));
  const fmtHora = (dt) => { const m = String(dt || '').match(/T?(\d{2}:\d{2})/); return m ? m[1] : (dt ? String(dt) : ''); };

  let headers, rows, colWidths, moneyCol;
  if (isNatura) {
    headers = ['OS', 'Data', 'Cód.', 'Serviço', 'Cliente', 'Horas trab.', 'KM rod.', 'Hr extras', 'KM extras', 'Total fatura'];
    rows = lancs.map(l => [
      l.os || '',
      l.data ? l.data.split('-').reverse().join('/') : '',
      l.codServico || '',
      l.descricao || '',
      l.cliente || '',
      Number(l.horasTrabalhadas || 0),
      Number(l.kmRodados || 0),
      Number(l.extraHorasFatura || 0),
      Number(l.extraKmFatura || 0),
      Number(l.totalFatura || 0),
    ]);
    rows.push([]);
    rows.push(['', '', '', '', `TOTAL (${lancs.length})`, '', '', '', '', Number(fechamento.totalFatura || 0)]);
    colWidths = [{ wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 32 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
    moneyCol = 9;
  } else {
    headers = ['OS', 'Data', 'Cód.', 'Serviço', 'Cliente', 'KM Ini.', 'KM Fin.', 'KM Rod.', 'KM Extra', 'H. Início', 'H. Término', 'Horas Trab.', 'H. Extra', 'Total fatura'];
    rows = lancs.map(l => [
      l.os || '',
      l.data ? l.data.split('-').reverse().join('/') : '',
      l.codServico || '',
      l.descricao || '',
      l.cliente || '',
      l.extras?.kmInicial ?? '',
      l.extras?.kmFinal ?? '',
      Number(l.kmRodados || 0),
      Number(l.extraKmFatura || 0),
      fmtHora(l.extras?.inicio),
      fmtHora(l.extras?.termino),
      Number(l.horasTrabalhadas || 0),
      Number(l.extraHorasFatura || 0),
      Number(l.totalFatura || 0),
    ]);
    rows.push([]);
    rows.push(['', '', '', '', `TOTAL (${lancs.length})`, '', '', '', '', '', '', '', '', Number(fechamento.totalFatura || 0)]);
    colWidths = [{ wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 32 }, { wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 14 }];
    moneyCol = 13;
  }

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = colWidths;
  for (let r = 1; r <= rows.length; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: moneyCol })];
    if (cell && typeof cell.v === 'number') cell.z = '"R$ "#,##0.00';
  }
  XLSX.utils.book_append_sheet(wb, ws, 'Medição');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

// ============ MODAL MASSA — CATEGORIA DE FOLHA ============
function ModalMassaFolhaCategoria({ chaves = [], grupos = [], onSave, onClose }) {
  const [valor, setValor] = useState('');
  return (
    <ModalBase titulo={`Mudar categoria de ${chaves.length} folha(s)`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-slate-400">Espelha o grupo de folha do salário fixo. Pode escolher um grupo existente ou digitar um novo.</p>
        <Campo label="Categoria de Folha">
          <input list="grupos-massa" value={valor} onChange={e => setValor(e.target.value.toUpperCase())} placeholder="Ex: ARMADA, ESCRITÓRIO" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
          <datalist id="grupos-massa">{grupos.map(g => <option key={g} value={g} />)}</datalist>
        </Campo>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 rounded text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button>
          <button onClick={() => onSave(valor.trim())} className="px-4 py-2 rounded text-sm bg-blue-600 hover:bg-blue-500 font-medium flex items-center gap-2"><Save className="w-4 h-4" />Aplicar</button>
        </div>
      </div>
    </ModalBase>
  );
}

// ============ MODAL MASSA — COMPETÊNCIA DE FOLHA ============
function ModalMassaFolhaCompetencia({ chaves = [], onSave, onClose }) {
  const hojeMes = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
  const [valor, setValor] = useState(hojeMes);
  return (
    <ModalBase titulo={`Mudar competência de ${chaves.length} folha(s)`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-slate-400">Reatribui a competência de exibição (não move os lançamentos). Útil para reorganizar folhas em meses diferentes.</p>
        <Campo label="Nova competência (AAAA-MM)">
          <input type="month" value={valor} onChange={e => setValor(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" />
        </Campo>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 rounded text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button>
          <button onClick={() => onSave(valor)} disabled={!valor} className="px-4 py-2 rounded text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-40 font-medium flex items-center gap-2"><Save className="w-4 h-4" />Aplicar</button>
        </div>
      </div>
    </ModalBase>
  );
}

// ============ MODAL CATEGORIA DE FOLHA (CRUD) ============
function ModalCategoriaFolha({ dados, onSave, onClose }) {
  const [nome, setNome] = useState(dados?.nome || '');
  return (
    <ModalBase titulo={dados ? 'Editar categoria de folha' : 'Nova categoria de folha'} onClose={onClose}>
      <div className="space-y-4">
        <Campo label="Nome*">
          <input type="text" value={nome} onChange={e => setNome(e.target.value.toUpperCase())} placeholder="Ex: ARMADA, ESCRITÓRIO, MOTOLINK" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-medium" autoFocus />
        </Campo>
        <p className="text-xs text-slate-500">Categorias de folha agrupam lançamentos e funcionários numa mesma folha de pagamento, independente do mês original do lançamento (basta marcar a competência).</p>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 rounded text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button>
          <button onClick={() => onSave({ ...dados, nome })} disabled={!nome.trim()} className="px-4 py-2 rounded text-sm bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed font-medium flex items-center gap-2"><Save className="w-4 h-4" />Salvar</button>
        </div>
      </div>
    </ModalBase>
  );
}

// ============ MODAL MASSA — COMPETÊNCIA DE LANÇAMENTOS ============
function ModalMassaLancCompetencia({ ids = [], onSave, onClose }) {
  const hojeMes = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
  const [valor, setValor] = useState(hojeMes);
  return (
    <ModalBase titulo={`Mudar competência de ${ids.length} lançamento(s)`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-slate-400">Define a competência da folha para os lançamentos selecionados. Lançamentos com datas em meses diferentes mas mesma competência aparecerão na MESMA folha.</p>
        <Campo label="Nova competência (AAAA-MM)">
          <input type="month" value={valor} onChange={e => setValor(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" autoFocus />
        </Campo>
        <p className="text-xs text-amber-300">⚠ Para limpar a competência (voltar a usar a data do lançamento), deixe em branco e clique em "Aplicar".</p>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <button onClick={() => onSave(ids, '')} className="px-4 py-2 rounded text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Limpar</button>
          <button onClick={onClose} className="px-4 py-2 rounded text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button>
          <button onClick={() => onSave(ids, valor)} disabled={!valor} className="px-4 py-2 rounded text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-40 font-medium flex items-center gap-2"><Save className="w-4 h-4" />Aplicar</button>
        </div>
      </div>
    </ModalBase>
  );
}

// ============ MODAL RESUMO PDF (impressão / salvar PDF) ============
function ModalResumoPDF({ resumo, competencia, onClose }) {
  if (!resumo) return null;
  const totalFolhaRG = num(resumo.totalFolhaPorCategoria);
  const totalValesRG = num(resumo.totalAdiantamentos);
  const folhaLiquidaRG = roundMoney(totalFolhaRG - totalValesRG);
  const todasOpRG = [...(resumo.despesasFixas || []), ...(resumo.despesasAvulsas || []), ...(resumo.parcelamentos || [])];
  const totalCartaoEmpresaRG = sumMoney(todasOpRG.filter(d => ['CARTAO CORPORATIVO', 'EMPRESA'].includes(normalizar(d.origem))), d => d.valor);
  const totalGalopRG = sumMoney((resumo.despesasAvulsas || []).filter(d => normalizar(d.origem).includes('GALOP')), d => d.valor);
  const totalManhaesRG = sumMoney((resumo.despesasChefia || []).filter(d => normalizar(d.origem) === normalizar('MANHÃES')), d => d.valor);
  const totalRicardoRG = sumMoney((resumo.despesasChefia || []).filter(d => normalizar(d.origem) === 'RICARDO'), d => d.valor);
  const totalGeralRG = roundMoney(folhaLiquidaRG + totalCartaoEmpresaRG + totalGalopRG + totalManhaesRG + totalRicardoRG);

  const Sec = ({ titulo, children }) => <>
    <h2 style={{ fontSize: '14px', margin: '18px 0 6px', borderBottom: '2px solid #4f46e5', paddingBottom: '2px', color: '#1e293b' }}>{titulo}</h2>
    {children}
  </>;
  const tableStyle = { width: '100%', fontSize: '11px', borderCollapse: 'collapse' };
  const th = { textAlign: 'left', padding: '4px 8px', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '10px' };
  const td = { padding: '3px 8px', borderBottom: '1px solid #e2e8f0' };
  const tdR = { ...td, textAlign: 'right' };
  const tfTotal = { padding: '5px 8px', borderTop: '2px solid #1e293b', fontWeight: 'bold', background: '#f8fafc' };

  return (
    <PrintModal titulo={`Resumo financeiro — ${fmtMes(competencia)}`} onClose={onClose}>
      <div style={{ borderBottom: '3px solid #4f46e5', paddingBottom: '10px', marginBottom: '14px' }}>
        <h1 style={{ fontSize: '20px', margin: '0 0 4px', color: '#1e293b' }}>RESUMO FINANCEIRO MR</h1>
        <div style={{ fontSize: '12px', color: '#64748b' }}>Competência: <b>{fmtMes(competencia)}</b> · Gerado em {new Date().toLocaleString('pt-BR')}</div>
      </div>

      <Sec titulo="1. Faturamento por Cliente">
        <table style={tableStyle}>
          <thead><tr><th style={th}>Cliente</th><th style={{ ...th, textAlign: 'right' }}>Valor</th></tr></thead>
          <tbody>{(resumo.faturamento || []).map((f, i) => <tr key={i}><td style={td}>{f.cliente}</td><td style={tdR}>{fmt(f.valor)}</td></tr>)}</tbody>
          <tfoot><tr><td style={tfTotal}>TOTAL</td><td style={{ ...tfTotal, textAlign: 'right' }}>{fmt(resumo.totalFaturamento)}</td></tr></tfoot>
        </table>
      </Sec>

      <Sec titulo="2. Folha por Categoria">
        <table style={tableStyle}>
          <thead><tr><th style={th}>Categoria</th><th style={{ ...th, textAlign: 'center' }}>Qtd</th><th style={{ ...th, textAlign: 'right' }}>Valor</th></tr></thead>
          <tbody>{(resumo.folhaPorCategoria || []).map((g, i) => <tr key={i}><td style={td}>{g.categoria}</td><td style={{ ...td, textAlign: 'center' }}>{g.qtd}</td><td style={tdR}>{fmt(g.total)}</td></tr>)}</tbody>
          <tfoot><tr><td style={tfTotal} colSpan={2}>TOTAL</td><td style={{ ...tfTotal, textAlign: 'right' }}>{fmt(resumo.totalFolhaPorCategoria)}</td></tr></tfoot>
        </table>
      </Sec>

      {(resumo.adiantamentos || []).length > 0 && <Sec titulo="3. Vales / Adiantamentos">
        <table style={tableStyle}>
          <thead><tr><th style={th}>Beneficiário</th><th style={th}>Tipo</th><th style={th}>Forma</th><th style={{ ...th, textAlign: 'right' }}>Valor</th></tr></thead>
          <tbody>{resumo.adiantamentos.map(a => <tr key={a.id}><td style={td}>{a.alvoNome}</td><td style={td}>{a.tipoVale || 'VALE'}</td><td style={td}>{a.formaPagamento || '—'}</td><td style={tdR}>{fmt(a.valor)}</td></tr>)}</tbody>
          <tfoot><tr><td style={tfTotal} colSpan={3}>TOTAL</td><td style={{ ...tfTotal, textAlign: 'right' }}>{fmt(resumo.totalAdiantamentos)}</td></tr></tfoot>
        </table>
      </Sec>}

      {(resumo.despesasFixas || []).length > 0 && <Sec titulo="4. Despesas Fixas">
        <table style={tableStyle}>
          <thead><tr><th style={th}>Lançamento</th><th style={th}>Origem</th><th style={{ ...th, textAlign: 'right' }}>Valor</th></tr></thead>
          <tbody>{resumo.despesasFixas.map(d => <tr key={d.id}><td style={td}>{d.descricao}</td><td style={td}>{d.origem || '—'}</td><td style={tdR}>{fmt(d.valor)}</td></tr>)}</tbody>
          <tfoot><tr><td style={tfTotal} colSpan={2}>TOTAL</td><td style={{ ...tfTotal, textAlign: 'right' }}>{fmt(resumo.totalFixas)}</td></tr></tfoot>
        </table>
      </Sec>}

      {(resumo.despesasAvulsas || []).length > 0 && <Sec titulo="5. Despesas Avulsas">
        <table style={tableStyle}>
          <thead><tr><th style={th}>Lançamento</th><th style={th}>Origem</th><th style={{ ...th, textAlign: 'right' }}>Valor</th></tr></thead>
          <tbody>{resumo.despesasAvulsas.map(d => <tr key={d.id}><td style={td}>{d.descricao}</td><td style={td}>{d.origem || '—'}</td><td style={tdR}>{fmt(d.valor)}</td></tr>)}</tbody>
          <tfoot><tr><td style={tfTotal} colSpan={2}>TOTAL</td><td style={{ ...tfTotal, textAlign: 'right' }}>{fmt(resumo.totalAvulsas)}</td></tr></tfoot>
        </table>
      </Sec>}

      {(resumo.parcelamentos || []).length > 0 && <Sec titulo="6. Parcelamentos">
        <table style={tableStyle}>
          <thead><tr><th style={th}>Lançamento</th><th style={th}>Origem</th><th style={{ ...th, textAlign: 'right' }}>Valor</th></tr></thead>
          <tbody>{resumo.parcelamentos.map(d => <tr key={d.id}><td style={td}>{d.descricao}</td><td style={td}>{d.origem || '—'}</td><td style={tdR}>{fmt(d.valor)}</td></tr>)}</tbody>
          <tfoot><tr><td style={tfTotal} colSpan={2}>TOTAL</td><td style={{ ...tfTotal, textAlign: 'right' }}>{fmt(resumo.totalParcelamentos)}</td></tr></tfoot>
        </table>
      </Sec>}

      {(resumo.despesasChefia || []).length > 0 && <Sec titulo="7. Despesas da Chefia">
        <table style={tableStyle}>
          <thead><tr><th style={th}>Lançamento</th><th style={th}>Origem</th><th style={{ ...th, textAlign: 'right' }}>Valor</th></tr></thead>
          <tbody>{resumo.despesasChefia.map(d => <tr key={d.id}><td style={td}>{d.descricao}</td><td style={td}>{d.origem || '—'}</td><td style={tdR}>{fmt(d.valor)}</td></tr>)}</tbody>
          <tfoot><tr><td style={tfTotal} colSpan={2}>TOTAL</td><td style={{ ...tfTotal, textAlign: 'right' }}>{fmt(resumo.totalDespChefia || 0)}</td></tr></tfoot>
        </table>
      </Sec>}

      <div style={{ pageBreakBefore: 'always' }} />
      <Sec titulo="Relatório Gerencial — Despesas">
        <table style={{ ...tableStyle, fontSize: '12px' }}>
          <tbody>
            <tr><td style={td}>Folha total (bruto)</td><td style={tdR}>{fmt(totalFolhaRG)}</td></tr>
            <tr><td style={{ ...td, paddingLeft: '20px', color: '#b91c1c' }}>(−) Vales / Adiantamentos</td><td style={{ ...tdR, color: '#b91c1c' }}>−{fmt(totalValesRG)}</td></tr>
            <tr style={{ background: '#fef3c7', fontWeight: 'bold' }}><td style={{ padding: '5px 8px' }}>= Folha líquida a pagar</td><td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmt(folhaLiquidaRG)}</td></tr>
            <tr><td style={td}>(+) Despesas do mês</td><td style={tdR}>{fmt(totalCartaoEmpresaRG)}</td></tr>
            <tr><td style={td}>(+) Galop (combustível)</td><td style={tdR}>{fmt(totalGalopRG)}</td></tr>
            <tr><td style={td}>(+) Despesas Manhães</td><td style={tdR}>{fmt(totalManhaesRG)}</td></tr>
            <tr><td style={td}>(+) Despesas Ricardo</td><td style={tdR}>{fmt(totalRicardoRG)}</td></tr>
            <tr style={{ background: '#dcfce7', border: '2px solid #16a34a', fontWeight: 'bold', fontSize: '14px' }}><td style={{ padding: '8px' }}>= TOTAL GERAL A PAGAR</td><td style={{ padding: '8px', textAlign: 'right' }}>{fmt(totalGeralRG)}</td></tr>
          </tbody>
        </table>
      </Sec>

      <div style={{ marginTop: '24px', paddingTop: '8px', borderTop: '1px solid #cbd5e1', fontSize: '10px', color: '#64748b', textAlign: 'center' }}>
        celso.cloud · MRSys {APP_VERSION} · {new Date().toLocaleString('pt-BR')}
      </div>
    </PrintModal>
  );
}

// ============ MODAL TRANSFERIR VIA CORA (PIX folha) ============
function ModalTransferirCora({ folhas = [], onSucesso, onClose }) {
  const [empresa, setEmpresa] = useState('MR_ASSESSORIA');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);

  const totalLiquido = folhas.reduce((s, f) => s + f.liquido, 0);

  const enviar = async () => {
    setEnviando(true);
    setErro(null);
    try {
      const payload = {
        empresa,
        folhas: folhas.map(f => ({
          funcionario_id: f.funcionario.id,
          funcionario_nome: f.funcionario.nome,
          competencia: f.periodo,
          valor_liquido: f.liquido,
          chave_pix: (f.funcionario.chavePix || '').trim(),
          tipo_pix: f.funcionario.tipoPix || '',
          folha_id: f.folhaId || null,
        })),
      };
      const resp = await fetch('/api/cora/transferir.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || json?.ok === false) {
        throw new Error(json?.error || `HTTP ${resp.status}`);
      }
      setResultado(json.data);
    } catch (e) {
      setErro(e.message || 'Falha de rede');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ModalBase titulo="Transferir folha via Cora (PIX)" onClose={onClose} grande>
      {!resultado ? (
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div><b>Cada PIX é o valor LÍQUIDO da folha</b> (bruto + adicionais − descontos). <b>Aprovação manual no app Cora.</b> Esta ação envia as transferências e elas ficam <b>aguardando aprovação</b>. Alguém precisa abrir o app Cora da empresa selecionada e confirmar cada PIX. Quando aprovadas, o webhook atualiza para <b>pago</b> automaticamente.</div>
          </div>
          <Campo label="Empresa pagadora">
            <select value={empresa} onChange={e => setEmpresa(e.target.value)} disabled={enviando} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm">
              <option value="MR_ASSESSORIA">MR ASSESSORIA</option>
              <option value="UP_VIGILANCIA">UP VIGILÂNCIA</option>
            </select>
          </Campo>
          <div>
            <h4 className="text-xs uppercase font-semibold text-slate-400 mb-2">{folhas.length} folha(s) elegível(is)</h4>
            <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 max-h-80">
              <table className="w-full text-xs">
                <thead className="text-[10px] text-slate-400 bg-slate-50 border-b border-slate-200"><tr>
                  <th className="text-left py-2 px-2">Funcionário</th>
                  <th className="text-left px-2">Mês</th>
                  <th className="text-left px-2">Tipo PIX</th>
                  <th className="text-left px-2">Chave PIX</th>
                  <th className="text-right px-2">Valor líquido</th>
                </tr></thead>
                <tbody>{folhas.map((f, i) => (
                  <tr key={i} className="border-b border-slate-200/40">
                    <td className="py-1.5 px-2 font-medium">{f.funcionario.nome}</td>
                    <td className="px-2 text-slate-400">{fmtMesCurto(f.periodo)}</td>
                    <td className="px-2 text-slate-400">{f.funcionario.tipoPix || '—'}</td>
                    <td className="px-2 font-mono text-slate-600">{f.funcionario.chavePix}</td>
                    <td className="px-2 text-right font-semibold text-emerald-300" title="Líquido = bruto + adicionais − descontos">{fmt(f.liquido)}</td>
                  </tr>
                ))}</tbody>
                <tfoot className="border-t-2 border-slate-200 font-bold bg-slate-100"><tr>
                  <td colSpan={4} className="py-2 px-2 uppercase">TOTAL LÍQUIDO</td>
                  <td className="text-right px-2 text-emerald-300 text-sm">{fmt(totalLiquido)}</td>
                </tr></tfoot>
              </table>
            </div>
          </div>
          {erro && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-700">{erro}</div>}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button onClick={onClose} disabled={enviando} className="px-4 py-2 rounded text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button>
            <button onClick={enviar} disabled={enviando || folhas.length === 0} className="px-4 py-2 rounded text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 font-semibold flex items-center gap-2">
              {enviando ? <><RefreshCw className="w-4 h-4 animate-spin" />Enviando...</> : <><Send className="w-4 h-4" />Transferir {folhas.length}</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-2 text-center"><div className="text-[10px] text-emerald-300 uppercase">Enviadas</div><div className="text-2xl font-bold text-emerald-700">{resultado.resumo.enviadas}</div></div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2 text-center"><div className="text-[10px] text-amber-300 uppercase">Duplicadas</div><div className="text-2xl font-bold text-amber-700">{resultado.resumo.duplicadas}</div></div>
            <div className="bg-red-500/10 border border-red-500/30 rounded p-2 text-center"><div className="text-[10px] text-red-300 uppercase">Erros</div><div className="text-2xl font-bold text-red-700">{resultado.resumo.erros}</div></div>
          </div>
          <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 max-h-80">
            <table className="w-full text-xs">
              <thead className="text-[10px] text-slate-400 bg-slate-50 border-b border-slate-200"><tr>
                <th className="text-left py-2 px-2">Funcionário</th>
                <th className="text-center px-2">Status</th>
                <th className="text-left px-2">Mensagem</th>
                <th className="text-left px-2">Cora ID</th>
              </tr></thead>
              <tbody>{resultado.resultados.map((r, i) => (
                <tr key={i} className="border-b border-slate-200/40">
                  <td className="py-1.5 px-2 font-medium">{r.funcionario_nome}</td>
                  <td className="px-2 text-center"><span className={`text-[10px] px-2 py-0.5 rounded-full ${r.status === 'enviada' ? 'bg-emerald-500/20 text-emerald-700' : r.status === 'duplicada' ? 'bg-amber-500/20 text-amber-700' : 'bg-red-500/20 text-red-700'}`}>{r.status}</span></td>
                  <td className="px-2 text-slate-600">{r.mensagem || '—'}</td>
                  <td className="px-2 font-mono text-slate-500 text-[10px]">{r.cora_transfer_id || '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button onClick={() => onSucesso?.()} className="px-4 py-2 rounded text-sm bg-emerald-600 hover:bg-emerald-500 font-semibold">Concluir</button>
          </div>
        </div>
      )}
    </ModalBase>
  );
}

// ============ MODAL HISTÓRICO DE TRANSFERÊNCIAS CORA ============
function ModalHistoricoCora({ onAbrirWebhooks, onClose }) {
  const [transferencias, setTransferencias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [reenviandoId, setReenviandoId] = useState(null);
  const [filtro, setFiltro] = useState({ empresa: '', status: '', competencia: '' });

  const carregar = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      if (filtro.empresa)     params.set('empresa', filtro.empresa);
      if (filtro.status)      params.set('status', filtro.status);
      if (filtro.competencia) params.set('competencia', filtro.competencia);
      params.set('limit', '200');
      const resp = await fetch(`/api/cora/listar.php?${params}`, { credentials: 'include' });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || json?.ok === false) throw new Error(json?.error || `HTTP ${resp.status}`);
      setTransferencias(json.data || []);
    } catch (e) {
      setErro(e.message || 'Falha ao carregar histórico');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, [filtro]);

  const reenviar = async (t) => {
    if (!confirm(`Reenviar transferência para ${t.funcionario_nome} (${fmt(t.valor_liquido)})?`)) return;
    setReenviandoId(t.id);
    try {
      const resp = await fetch('/api/cora/transferir.php', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa: t.empresa,
          folhas: [{
            funcionario_id: t.funcionario_id,
            funcionario_nome: t.funcionario_nome,
            competencia: t.competencia,
            valor_liquido: parseFloat(t.valor_liquido),
            chave_pix: t.chave_pix,
            tipo_pix: t.tipo_pix,
            folha_id: t.folha_id || null,
          }],
        }),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || json?.ok === false) throw new Error(json?.error || 'Falha ao reenviar');
      const r = json.data?.resultados?.[0];
      alert(`Reenvio: ${r?.status || '?'} — ${r?.mensagem || 'sem mensagem'}`);
      await carregar();
    } catch (e) {
      alert('Erro ao reenviar: ' + e.message);
    } finally {
      setReenviandoId(null);
    }
  };

  const corStatus = (s) => ({
    'enviada': 'bg-emerald-500/20 text-emerald-700',
    'aguardando_aprovacao': 'bg-blue-500/20 text-blue-600',
    'concluida': 'bg-emerald-700/40 text-emerald-700',
    'rejeitada': 'bg-red-500/20 text-red-700',
    'cancelada': 'bg-slate-100 text-slate-500',
    'erro': 'bg-rose-600/30 text-rose-200',
  })[s] || 'bg-slate-100 text-slate-700';

  return (
    <ModalBase titulo="Histórico de transferências Cora" onClose={onClose} grande>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <select value={filtro.empresa} onChange={e => setFiltro(f => ({ ...f, empresa: e.target.value }))} className="bg-white border border-slate-200 rounded px-3 py-1.5 text-xs">
            <option value="">Todas empresas</option>
            <option value="MR_ASSESSORIA">MR ASSESSORIA</option>
            <option value="UP_VIGILANCIA">UP VIGILÂNCIA</option>
          </select>
          <select value={filtro.status} onChange={e => setFiltro(f => ({ ...f, status: e.target.value }))} className="bg-white border border-slate-200 rounded px-3 py-1.5 text-xs">
            <option value="">Todos status</option>
            <option value="enviada">Enviada</option>
            <option value="aguardando_aprovacao">Aguardando aprovação</option>
            <option value="concluida">Concluída</option>
            <option value="rejeitada">Rejeitada</option>
            <option value="cancelada">Cancelada</option>
            <option value="erro">Erro</option>
          </select>
          <input type="month" value={filtro.competencia} onChange={e => setFiltro(f => ({ ...f, competencia: e.target.value }))} className="bg-white border border-slate-200 rounded px-3 py-1.5 text-xs" />
          <button onClick={carregar} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-xs flex items-center gap-1.5"><RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />Atualizar</button>
          <div className="flex-1" />
          <button onClick={onAbrirWebhooks} className="bg-blue-700/40 hover:bg-blue-600/60 text-blue-700 px-3 py-1.5 rounded text-xs flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />Ver webhooks</button>
        </div>
        {erro && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-700">{erro}</div>}
        <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 max-h-[60vh]">
          <table className="w-full text-xs">
            <thead className="text-[10px] text-slate-400 bg-slate-50 border-b border-slate-200 sticky top-0"><tr>
              <th className="text-left py-2 px-2">Data</th>
              <th className="text-left px-2">Funcionário</th>
              <th className="text-left px-2">Mês</th>
              <th className="text-left px-2">Empresa</th>
              <th className="text-right px-2" title="Valor líquido transferido (bruto + adicionais − descontos)">Líquido</th>
              <th className="text-center px-2">Status</th>
              <th className="text-left px-2">Cora ID / Erro</th>
              <th className="text-right px-2">Ações</th>
            </tr></thead>
            <tbody>{transferencias.length === 0 && !carregando ? (
              <tr><td colSpan={8} className="py-8 text-center text-slate-500 italic">Nenhuma transferência encontrada</td></tr>
            ) : transferencias.map(t => (
              <tr key={t.id} className="border-b border-slate-200/40">
                <td className="py-1.5 px-2 text-slate-400 whitespace-nowrap">{new Date(t.criado_em).toLocaleString('pt-BR')}</td>
                <td className="px-2 font-medium">{t.funcionario_nome}</td>
                <td className="px-2 text-slate-400">{fmtMesCurto(t.competencia)}</td>
                <td className="px-2 text-slate-400">{t.empresa === 'MR_ASSESSORIA' ? 'MR' : 'UP'}</td>
                <td className="px-2 text-right font-semibold text-emerald-300">{fmt(t.valor_liquido)}</td>
                <td className="px-2 text-center"><span className={`text-[10px] px-2 py-0.5 rounded-full ${corStatus(t.status)}`}>{t.status}</span></td>
                <td className="px-2 max-w-[200px] truncate">
                  {t.cora_transfer_id && <span className="font-mono text-slate-500 text-[10px]">{t.cora_transfer_id}</span>}
                  {t.erro_mensagem && <span className="text-rose-600 text-[10px] block">{t.erro_mensagem}</span>}
                </td>
                <td className="px-2 text-right">
                  {t.status === 'erro' || t.status === 'rejeitada' ? (
                    <button onClick={() => reenviar(t)} disabled={reenviandoId === t.id} className="bg-amber-700/60 hover:bg-amber-600/80 text-amber-700 text-[10px] px-2 py-0.5 rounded flex items-center gap-1 ml-auto">
                      {reenviandoId === t.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Reenviar
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>{transferencias.length} transferência(s) listada(s)</span>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900">Fechar</button>
        </div>
      </div>
    </ModalBase>
  );
}

// ============ MODAL AUDITORIA DE WEBHOOKS RECEBIDOS ============
function ModalWebhooksCora({ onVoltar, onClose }) {
  const [logs, setLogs] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtro, setFiltro] = useState({ empresa: '', signature_valid: '', processado: '' });

  const carregar = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      if (filtro.empresa)              params.set('empresa', filtro.empresa);
      if (filtro.signature_valid !== '') params.set('signature_valid', filtro.signature_valid);
      if (filtro.processado !== '')      params.set('processado', filtro.processado);
      params.set('limit', '200');
      const resp = await fetch(`/api/cora/logs.php?${params}`, { credentials: 'include' });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || json?.ok === false) throw new Error(json?.error || `HTTP ${resp.status}`);
      setLogs(json.data || []);
    } catch (e) {
      setErro(e.message || 'Falha ao carregar webhooks');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, [filtro]);

  return (
    <ModalBase titulo="Webhooks Cora recebidos (auditoria)" onClose={onClose} grande>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <select value={filtro.empresa} onChange={e => setFiltro(f => ({ ...f, empresa: e.target.value }))} className="bg-white border border-slate-200 rounded px-3 py-1.5 text-xs">
            <option value="">Todas empresas</option>
            <option value="MR_ASSESSORIA">MR ASSESSORIA</option>
            <option value="UP_VIGILANCIA">UP VIGILÂNCIA</option>
          </select>
          <select value={filtro.signature_valid} onChange={e => setFiltro(f => ({ ...f, signature_valid: e.target.value }))} className="bg-white border border-slate-200 rounded px-3 py-1.5 text-xs">
            <option value="">Assinatura: todos</option>
            <option value="1">Válida</option>
            <option value="0">Inválida</option>
          </select>
          <select value={filtro.processado} onChange={e => setFiltro(f => ({ ...f, processado: e.target.value }))} className="bg-white border border-slate-200 rounded px-3 py-1.5 text-xs">
            <option value="">Processamento: todos</option>
            <option value="1">Processado</option>
            <option value="0">Não processado</option>
          </select>
          <button onClick={carregar} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-xs flex items-center gap-1.5"><RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />Atualizar</button>
          <div className="flex-1" />
          <button onClick={onVoltar} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-xs">← Voltar p/ histórico</button>
        </div>
        {erro && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-700">{erro}</div>}
        <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 max-h-[60vh]">
          <table className="w-full text-xs">
            <thead className="text-[10px] text-slate-400 bg-slate-50 border-b border-slate-200 sticky top-0"><tr>
              <th className="text-left py-2 px-2">Recebido</th>
              <th className="text-left px-2">Evento</th>
              <th className="text-left px-2">Empresa</th>
              <th className="text-left px-2">Cora ID</th>
              <th className="text-center px-2">Assin.</th>
              <th className="text-center px-2">Process.</th>
              <th className="text-left px-2">Erro / IP</th>
            </tr></thead>
            <tbody>{logs.length === 0 && !carregando ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-500 italic">Nenhum webhook recebido</td></tr>
            ) : logs.map(l => (
              <tr key={l.id} className="border-b border-slate-200/40">
                <td className="py-1.5 px-2 text-slate-400 whitespace-nowrap">{new Date(l.recebido_em).toLocaleString('pt-BR')}</td>
                <td className="px-2 font-mono text-[10px]">{l.evento || '—'}</td>
                <td className="px-2 text-slate-400">{l.empresa || '—'}</td>
                <td className="px-2 font-mono text-slate-500 text-[10px] max-w-[160px] truncate" title={l.cora_transfer_id}>{l.cora_transfer_id || '—'}</td>
                <td className="px-2 text-center">{l.signature_valid == 1 ? <span className="text-emerald-600">✓</span> : <span className="text-red-600">✗</span>}</td>
                <td className="px-2 text-center">{l.processado == 1 ? <span className="text-emerald-600">✓</span> : <span className="text-amber-600">—</span>}</td>
                <td className="px-2 text-rose-600 max-w-[200px] truncate text-[10px]" title={l.erro_processamento}>{l.erro_processamento || (l.ip_origem ? <span className="text-slate-500">{l.ip_origem}</span> : '')}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>{logs.length} webhook(s) listado(s)</span>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900">Fechar</button>
        </div>
      </div>
    </ModalBase>
  );
}

// ============ MODAIS DE SALVAMENTO DE RESUMO ============
function ModalSalvarResumo({ competencia, onSave, onClose }) {
  const sugestao = `Resumo ${competencia || ''}`.trim();
  const [nome, setNome] = useState(sugestao);
  return (
    <ModalBase titulo="Salvar resumo atual" onClose={onClose} pequeno>
      <p className="text-xs text-slate-400 mb-3">Salva um snapshot dos totais e do relatório gerencial da competência <b className="text-slate-700">{competencia || '—'}</b>. Os valores ficam congelados — não mudam quando você adicionar lançamentos ou despesas depois.</p>
      <Campo label="Nome do resumo">
        <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Fechamento abril 2026" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" autoFocus />
      </Campo>
      <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 mt-4">
        <button onClick={onClose} className="px-4 py-2 rounded text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button>
        <button onClick={() => nome.trim() && onSave(nome.trim())} disabled={!nome.trim()} className="px-4 py-2 rounded text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-40 font-medium flex items-center gap-2"><Save className="w-4 h-4" />Salvar</button>
      </div>
    </ModalBase>
  );
}

function ModalCarregarResumos({ resumos = [], onVer, onExcluir, onClose }) {
  const ordenados = [...resumos].sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
  return (
    <ModalBase titulo={`Resumos salvos (${resumos.length})`} onClose={onClose}>
      {ordenados.length === 0 ? (
        <p className="text-sm text-slate-400 italic py-6 text-center">Nenhum resumo salvo. Use o botão "Salvar resumo" no cabeçalho do Resumo para criar.</p>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {ordenados.map(r => (
            <div key={r.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 truncate">{r.nome}</div>
                <div className="text-xs text-slate-400 mt-0.5">Competência <b className="text-slate-600">{r.competencia || '—'}</b> · salvo em {new Date(r.criadoEm).toLocaleString('pt-BR')}</div>
                <div className="text-xs text-emerald-300 mt-0.5">Total a pagar: <b>{fmt(r.totalGeralPagar)}</b></div>
              </div>
              <button onClick={() => onVer(r)} className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" />Ver</button>
              <button onClick={() => { if (confirm(`Excluir resumo "${r.nome}"?`)) onExcluir(r.id); }} className="bg-red-700/60 hover:bg-red-600 text-red-700 p-1.5 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end pt-3 border-t border-slate-200 mt-4">
        <button onClick={onClose} className="px-4 py-2 rounded text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Fechar</button>
      </div>
    </ModalBase>
  );
}

function ModalVisualizarResumo({ resumo, onClose }) {
  if (!resumo) return null;
  return (
    <ModalBase titulo={`${resumo.nome} · ${resumo.competencia || ''}`} onClose={onClose}>
      <p className="text-xs text-slate-400 mb-4">Snapshot salvo em {new Date(resumo.criadoEm).toLocaleString('pt-BR')}{resumo.qtdFaturas > 0 ? ` · ${resumo.qtdFaturas} fatura(s)` : ''}{resumo.numerosFaturas?.length ? ` · ${resumo.numerosFaturas.join(', ')}` : ''}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-slate-200"><td className="py-2 px-3 text-slate-600">Faturamento total</td><td className="text-right px-3 font-medium text-emerald-300">{fmt(resumo.totalFaturamento)}</td></tr>
            <tr className="border-b border-slate-200"><td className="py-2 px-3 text-slate-400 pl-6">(−) Imposto</td><td className="text-right px-3 text-yellow-400">−{fmt(resumo.totalImpostoFat)}</td></tr>
            <tr className="border-b-2 border-slate-200"></tr>
            <tr className="border-b border-slate-200"><td className="py-2 px-3 text-slate-600">Folha total (bruto)</td><td className="text-right px-3 font-medium text-blue-600">{fmt(resumo.totalFolha)}</td></tr>
            <tr className="border-b border-slate-200"><td className="py-2 px-3 text-slate-400 pl-6">(−) Vales / Adiantamentos</td><td className="text-right px-3 text-red-600">−{fmt(resumo.totalVales)}</td></tr>
            <tr className="border-b-2 border-slate-200 bg-slate-50"><td className="py-2 px-3 font-semibold text-slate-700">= Folha líquida a pagar</td><td className="text-right px-3 font-bold text-amber-300">{fmt(resumo.folhaLiquida)}</td></tr>
            <tr className="border-b border-slate-200"><td className="py-2 px-3 text-slate-600">(+) Despesas do mês</td><td className="text-right px-3 font-medium text-orange-600">{fmt(resumo.totalCartaoEmpresa)}</td></tr>
            <tr className="border-b border-slate-200"><td className="py-2 px-3 text-slate-600">(+) Galop (combustível)</td><td className="text-right px-3 font-medium text-orange-600">{fmt(resumo.totalGalop)}</td></tr>
            <tr className="border-b border-slate-200"><td className="py-2 px-3 text-slate-600">(+) Despesas Manhães</td><td className="text-right px-3 font-medium text-violet-600">{fmt(resumo.totalManhaes)}</td></tr>
            <tr className="border-b border-slate-200"><td className="py-2 px-3 text-slate-600">(+) Despesas Ricardo</td><td className="text-right px-3 font-medium text-violet-600">{fmt(resumo.totalRicardo)}</td></tr>
            <tr className="bg-emerald-500/10 border-2 border-emerald-500"><td className="py-3 px-3 font-bold text-emerald-700 uppercase">TOTAL GERAL A PAGAR</td><td className="text-right px-3 text-xl font-bold text-emerald-300">{fmt(resumo.totalGeralPagar)}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="flex justify-end pt-3 border-t border-slate-200 mt-4">
        <button onClick={onClose} className="px-4 py-2 rounded text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Voltar</button>
      </div>
    </ModalBase>
  );
}

// ============ MODAL MASSA — ATRIBUIR PRESTADOR A LANÇAMENTOS ============
function ModalMassaLancPrestador({ ids = [], funcionarios = [], onSave, onClose }) {
  const [nome, setNome] = useState('');
  const [slot, setSlot] = useState('auto');
  const ativos = [...funcionarios].filter(f => f.status === 'ATIVO').sort((a, b) => a.nome.localeCompare(b.nome));
  return (
    <ModalBase titulo={`Atribuir prestador em ${ids.length} lançamento(s)`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-slate-400">Atribui um prestador (funcionário ATIVO) aos lançamentos selecionados. Útil para corrigir lançamentos sem agente, garantindo que entrem na folha.</p>
        <Campo label="Prestador">
          <select value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" autoFocus>
            <option value="">Selecione um funcionário...</option>
            {ativos.map(f => <option key={f.id} value={f.nome}>{f.nome}{f.folhaGrupo ? ` — ${f.folhaGrupo}` : ''}</option>)}
          </select>
        </Campo>
        <Campo label="Onde atribuir">
          <select value={slot} onChange={e => setSlot(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm">
            <option value="auto">Primeiro slot vazio (agente1 → agente → agente2 → motorista)</option>
            <option value="agente1">Agente 1 (substitui)</option>
            <option value="agente">Agente (substitui)</option>
            <option value="agente2">Agente 2 (substitui)</option>
            <option value="motorista">Motorista (substitui)</option>
          </select>
        </Campo>
        <p className="text-xs text-amber-300">⚠ Modo "Primeiro vazio" pula lançamentos com todos os slots preenchidos. Modos específicos sobrescrevem o slot mesmo se já tiver alguém.</p>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 rounded text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button>
          <button onClick={() => onSave(ids, nome, slot)} disabled={!nome} className="px-4 py-2 rounded text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 font-medium flex items-center gap-2"><Save className="w-4 h-4" />Aplicar em {ids.length}</button>
        </div>
      </div>
    </ModalBase>
  );
}

// ============ MODAL MASSA — CATEGORIA DE FOLHA EM LANÇAMENTOS ============
function ModalMassaLancCatFolha({ ids = [], categorias = [], onSave, onClose }) {
  const [valor, setValor] = useState('');
  return (
    <ModalBase titulo={`Mudar categoria de folha em ${ids.length} lançamento(s)`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-slate-400">Define a categoria que esses lançamentos terão na folha de pagamento. As categorias são gerenciadas na aba <b>Cat. Folha</b>.</p>
        {categorias.length === 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 text-xs text-amber-700">
            Nenhuma categoria cadastrada. Vá na aba <b>Cat. Folha</b> e crie ao menos uma. Você ainda pode digitar livremente abaixo.
          </div>
        )}
        <Campo label="Categoria">
          <input list="cat-folha-massa" value={valor} onChange={e => setValor(e.target.value.toUpperCase())} placeholder="Ex: ARMADA, ESCRITÓRIO" className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm" autoFocus />
          <datalist id="cat-folha-massa">{categorias.map(c => <option key={c.id} value={c.nome} />)}</datalist>
        </Campo>
        <p className="text-xs text-amber-300">⚠ Deixe em branco e clique "Limpar" para remover a categoria dos selecionados.</p>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <button onClick={() => onSave(ids, '')} className="px-4 py-2 rounded text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Limpar</button>
          <button onClick={onClose} className="px-4 py-2 rounded text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button>
          <button onClick={() => onSave(ids, valor)} disabled={!valor.trim()} className="px-4 py-2 rounded text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-40 font-medium flex items-center gap-2"><Save className="w-4 h-4" />Aplicar</button>
        </div>
      </div>
    </ModalBase>
  );
}

// ============ MODAL EDITAR VALORES PAGOS (lançamento fechado) ============
function ModalEditarPagoLancamento({ dados, onSave, onClose }) {
  const l = dados || {};
  const [f, setF] = useState({
    diariaPaga: num(l.diariaPaga),
    extraHorasPaga: num(l.extraHorasPaga),
    extraKmPago: num(l.extraKmPago),
    adicDomPago: num(l.adicDomPago),
    pedagioReembolso: num(l.pedagioReembolso),
  });
  const totalCalc = roundMoney(num(f.diariaPaga) + num(f.extraHorasPaga) + num(f.extraKmPago) + num(f.adicDomPago) + num(f.pedagioReembolso));
  const totalFatura = num(l.totalFatura);
  const imposto = num(l.imposto);
  const novoLucro = roundMoney(totalFatura - totalCalc - imposto);
  return (
    <ModalBase titulo={`Editar valores pagos — ${l.descricao || ''}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 text-xs text-amber-700">
          <p className="font-semibold mb-1">⚠ Lançamento fechado em fatura</p>
          <p>Você pode editar os valores pagos para ajustar a folha do funcionário. <b>A fatura NÃO é alterada</b> — apenas o que você paga internamente.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 rounded p-2"><div className="text-slate-500 uppercase text-[10px]">OS · Data</div><div className="font-mono text-sm">{l.os || '—'} · {l.data ? l.data.split('-').reverse().join('/') : ''}</div></div>
          <div className="bg-slate-50 rounded p-2"><div className="text-slate-500 uppercase text-[10px]">Cliente · Serviço</div><div className="text-sm truncate">{l.cliente} · #{l.codServico}</div></div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-2"><div className="text-slate-500 uppercase text-[10px]">Total Faturado</div><div className="font-bold text-emerald-600 text-base">{fmt(totalFatura)}</div></div>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded p-2"><div className="text-slate-500 uppercase text-[10px]">Total Pago (novo)</div><div className="font-bold text-orange-400 text-base">{fmt(totalCalc)}</div></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo label="Diária paga (base)"><input type="number" step="0.01" value={f.diariaPaga} onChange={e => setF({ ...f, diariaPaga: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono" /></Campo>
          <Campo label="Hora extra paga"><input type="number" step="0.01" value={f.extraHorasPaga} onChange={e => setF({ ...f, extraHorasPaga: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono" /></Campo>
          <Campo label="KM extra pago"><input type="number" step="0.01" value={f.extraKmPago} onChange={e => setF({ ...f, extraKmPago: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono" /></Campo>
          <Campo label="Adicional dom/feriado pago"><input type="number" step="0.01" value={f.adicDomPago} onChange={e => setF({ ...f, adicDomPago: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono" /></Campo>
          <Campo label="Reembolso de pedágio" full><input type="number" step="0.01" value={f.pedagioReembolso} onChange={e => setF({ ...f, pedagioReembolso: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono" /></Campo>
        </div>
        <div className="bg-slate-50 rounded p-3 text-xs grid grid-cols-3 gap-3">
          <div><div className="text-slate-500 uppercase text-[10px]">Imposto</div><div className="font-mono">{fmt(imposto)}</div></div>
          <div><div className="text-slate-500 uppercase text-[10px]">Lucro recalculado</div><div className={`font-mono font-bold ${novoLucro >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(novoLucro)}</div></div>
          <div><div className="text-slate-500 uppercase text-[10px]">Δ Pago</div><div className={`font-mono ${(totalCalc - num(l.totalPago)) >= 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{(totalCalc - num(l.totalPago)) >= 0 ? '+' : ''}{fmt(totalCalc - num(l.totalPago))}</div></div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 rounded text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">Cancelar</button>
          <button onClick={() => onSave(l.id, f)} className="px-4 py-2 rounded text-sm bg-orange-600 hover:bg-orange-500 font-medium flex items-center gap-2"><Save className="w-4 h-4" />Salvar valores pagos</button>
        </div>
      </div>
    </ModalBase>
  );
}

// ============ MODAL IMPORTAR DESPESAS (XLSX + Texto) ============
function ModalImportarDespesasXLSX({ onImportar, onClose }) {
  const [analise, setAnalise] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [aba, setAba] = useState('xlsx');
  const [textoColado, setTextoColado] = useState('');
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setCarregando(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      let aoa = null;
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });
        if (data.length > 1 && (data[0] || []).some(h => normCol(String(h || '')).startsWith('DESCRI') || normCol(String(h || '')) === 'VALOR')) { aoa = data; break; }
      }
      if (!aoa) aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });
      setAnalise(parseDespesasFromAOA(aoa));
    } catch (e) {
      setAnalise({ erros: [`Erro ao ler arquivo: ${e?.message || 'desconhecido'}`], itens: [] });
    } finally { setCarregando(false); }
  };

  const handleTexto = () => {
    if (!textoColado.trim()) { setAnalise({ erros: ['Cole pelo menos o cabeçalho e uma linha de dados.'], itens: [] }); return; }
    setAnalise(parseDespesasFromText(textoColado));
  };

  const confirmar = () => { if (analise) onImportar({ itens: analise.itens || [] }); };

  return (
    <ModalBase titulo="Importar Despesas" onClose={onClose}>
      {!analise ? (
        <div className="space-y-4">
          <div className="flex border-b border-slate-200">
            <button onClick={() => setAba('xlsx')} className={`px-4 py-2 text-sm font-medium border-b-2 transition ${aba === 'xlsx' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Planilha (XLSX)</button>
            <button onClick={() => setAba('texto')} className={`px-4 py-2 text-sm font-medium border-b-2 transition ${aba === 'texto' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Texto colado</button>
          </div>
          {aba === 'xlsx' ? (
            <>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-blue-600 mb-2 flex items-center gap-2"><Download className="w-4 h-4" />Passo 1 — Baixe o modelo</h3>
                <p className="text-xs text-slate-600 mb-3">9 colunas: <b>Data</b>, <b>Descrição</b>, <b>Tipo</b>, <b>Valor</b>, <b>Centro de Custo</b>, <b>Origem</b>, <b>Competência</b>, <b>Status</b>, <b>Observações</b>.</p>
                <button onClick={() => gerarModeloDespesasXLSX()} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Download className="w-4 h-4" />Baixar modelo XLSX</button>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><Upload className="w-4 h-4" />Passo 2 — Envie sua planilha</h3>
                <p className="text-xs text-slate-400 mb-3">Aceita .xlsx, .xls, .csv. Tipos aceitos: FIXA, PARCELA, AVULSA. Status: pendente / pago / cancelado.</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => handleFile(e.target.files?.[0])} className="text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white file:font-medium hover:file:bg-blue-500" />
                {carregando && <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5"><RefreshCw className="w-3 h-3 animate-spin" />Lendo arquivo...</p>}
              </div>
            </>
          ) : (
            <>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-blue-600 mb-2 flex items-center gap-2"><FileText className="w-4 h-4" />Cole os dados</h3>
                <p className="text-xs text-slate-600">Copie do Excel/Sheets. Cabeçalho na primeira linha. Separadores: tab, <code>;</code> ou <code>|</code>.</p>
              </div>
              <textarea
                value={textoColado}
                onChange={e => setTextoColado(e.target.value)}
                rows={10}
                placeholder={"Data\tDescrição\tTipo\tValor\tCentro de Custo\tOrigem\n01/04/2026\tAluguel escritório\tFIXA\t3500,00\tAdministrativo\tCARTÃO CORPORATIVO"}
                className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono"
              />
              <button onClick={handleTexto} disabled={!textoColado.trim()} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded text-sm font-medium flex items-center justify-center gap-2"><Search className="w-4 h-4" />Analisar texto</button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {analise.erros.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 text-sm text-red-300">
              <p className="font-semibold mb-1 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />Atenção:</p>
              <ul className="list-disc pl-5 text-xs">{analise.erros.map((er, i) => <li key={i}>{er}</li>)}</ul>
            </div>
          )}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-3 text-center">
            <div className="text-2xl font-bold text-emerald-300">{analise.itens?.length || 0}</div>
            <div className="text-[10px] uppercase text-slate-400">Despesas a importar</div>
          </div>
          {analise.itens?.length > 0 && (
            <div className="bg-white rounded max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="text-slate-500 sticky top-0 bg-slate-50"><tr><th className="text-left py-1.5 px-2">Compet.</th><th className="text-left px-2">Descrição</th><th className="text-left px-2">Tipo</th><th className="text-right px-2">Valor</th></tr></thead>
                <tbody>{analise.itens.map((it, i) => (
                  <tr key={i} className="border-t border-slate-200/50">
                    <td className="py-1 px-2 font-mono text-[10px]">{it.competencia}</td>
                    <td className="px-2">{it.descricao}</td>
                    <td className="px-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">{it.tipo}</span></td>
                    <td className="px-2 text-right text-red-300 font-medium">{fmt(it.valor)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <div className="flex gap-2 pt-2 border-t border-slate-200">
            <button onClick={() => setAnalise(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded text-sm">Voltar</button>
            <button onClick={confirmar} disabled={!analise.itens?.length} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded text-sm font-semibold">Confirmar ({analise.itens?.length || 0})</button>
          </div>
        </div>
      )}
    </ModalBase>
  );
}

// ============ MODAL HISTÓRICO DE E-MAILS ============
function ModalHistoricoEmail({ onClose }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const carregar = async (off = 0) => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/email/historico.php?limit=${limit}&offset=${off}`, { credentials: 'include' });
      const data = await resp.json();
      if (data.ok) { setItems(data.data.items || []); setTotal(data.data.total || 0); setOffset(off); }
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { carregar(0); }, []);

  const fmtDt = s => s ? new Date(s).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

  return (
    <ModalBase titulo="Histórico de envios de e-mail" onClose={onClose} grande>
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">Nenhum e-mail registrado ainda.</p>
        ) : (
          <>
            <p className="text-xs text-slate-500">{total} registro(s) no total</p>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-2 px-3">Data/Hora</th>
                    <th className="text-left px-3">Tipo</th>
                    <th className="text-left px-3">Assunto</th>
                    <th className="text-left px-3">Destinatários</th>
                    <th className="text-center px-3">Status</th>
                    <th className="text-left px-3">Enviado por</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b border-slate-200/50 hover:bg-slate-50">
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600">{fmtDt(item.enviado_em)}</td>
                      <td className="px-3"><span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-600">{item.tipo}</span></td>
                      <td className="px-3 max-w-[200px] truncate">{item.assunto}</td>
                      <td className="px-3">
                        <div className="flex flex-wrap gap-1">
                          {(item.destinatarios || []).map(e => <span key={e} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{e}</span>)}
                        </div>
                      </td>
                      <td className="text-center px-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${item.status === 'ok' ? 'bg-emerald-500/20 text-emerald-700' : 'bg-red-500/20 text-red-700'}`}>{item.status}</span>
                      </td>
                      <td className="px-3 text-slate-400">{item.enviado_por_nome || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > limit && (
              <div className="flex gap-2 justify-center pt-2">
                <button onClick={() => carregar(Math.max(0, offset - limit))} disabled={offset === 0} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 rounded text-xs">Anterior</button>
                <span className="text-xs text-slate-500 self-center">{Math.floor(offset / limit) + 1} / {Math.ceil(total / limit)}</span>
                <button onClick={() => carregar(offset + limit)} disabled={offset + limit >= total} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 rounded text-xs">Próxima</button>
              </div>
            )}
          </>
        )}
      </div>
    </ModalBase>
  );
}
