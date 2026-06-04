// src/pages/client/ClientInvoices.jsx
import { useState, useEffect } from 'react';
import {
  Receipt, ChevronDown, ChevronUp, AlertCircle,
  CheckCircle, Clock, XCircle, CreditCard,
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('mizan_token')}` });

function fmt(amount) {
  return Number(amount || 0).toLocaleString('fr-MA', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }) + ' MAD';
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }) {
  const map = {
    en_attente: { bg:'#fff8e1', color:'#f57f17', icon: Clock,        label:'En attente' },
    payée:      { bg:'#e8f5e9', color:'#2e7d32', icon: CheckCircle,  label:'Payée'      },
    annulée:    { bg:'#f5f5f5', color:'#757575', icon: XCircle,      label:'Annulée'    },
    draft:      { bg:'#e3f2fd', color:'#1565c0', icon: Receipt,      label:'Brouillon'  },
  };
  const cfg = map[status] || { bg:'#f5f5f5', color:'#555', icon: Receipt, label: status };
  const Icon = cfg.icon;
  return (
    <span style={{ ...s.statusBadge, background: cfg.bg, color: cfg.color }}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function ProgressBar({ paid, total }) {
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  return (
    <div style={s.progressWrap}>
      <div style={{ ...s.progressFill, width: `${pct}%` }} />
    </div>
  );
}

function InvoiceCard({ invoice }) {
  const [expanded, setExpanded] = useState(false);
  const totalAmount = parseFloat(invoice.amount      || 0);
  const amountPaid  = parseFloat(invoice.amount_paid || 0);
  const amountDue   = parseFloat(invoice.amount_due  || 0);
  const isOverdue   = invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.invoice_status !== 'payée';

  return (
    <div style={{ ...s.invoiceCard, ...(isOverdue ? s.invoiceOverdue : {}) }}>
      <div style={s.invoiceHeader}>
        <div style={s.invoiceLeft}>
          <div style={s.invoiceIconWrap}>
            <Receipt size={18} color="#c9a84c" />
          </div>
          <div>
            <div style={s.invoiceNumber}>{invoice.invoice_number}</div>
            <div style={s.invoiceSub}>
              {invoice.case_title ? `Dossier : ${invoice.case_title}` : 'Sans dossier associé'}
            </div>
          </div>
        </div>
        <div style={s.invoiceRight}>
          <StatusBadge status={invoice.invoice_status || invoice.status} />
          <div style={s.invoiceAmount}>{fmt(totalAmount)}</div>
          <button style={s.expandBtn} onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      <div style={s.invoiceProgress}>
        <ProgressBar paid={amountPaid} total={totalAmount} />
        <div style={s.progressLabels}>
          <span style={s.progressPaid}>{fmt(amountPaid)} payé</span>
          <span style={{ ...s.progressDue, ...(amountDue > 0 ? s.progressDueRed : {}) }}>
            {fmt(amountDue)} restant
          </span>
        </div>
      </div>

      <div style={s.invoiceDates}>
        <span>Émise le {fmtDate(invoice.issue_date)}</span>
        <span style={s.dot}>·</span>
        <span style={isOverdue ? { color:'#c62828', fontWeight:600 } : {}}>
          Échéance : {fmtDate(invoice.due_date)}
          {isOverdue && ' ⚠ En retard'}
        </span>
        {invoice.description && (
          <>
            <span style={s.dot}>·</span>
            <span style={{ fontStyle:'italic', color:'#aaa' }}>{invoice.description}</span>
          </>
        )}
      </div>

      {expanded && (
        <div style={s.paymentsSection}>
          <div style={s.paymentsSectionTitle}>
            <CreditCard size={14} />
            Paiements enregistrés ({invoice.payments?.length || 0})
          </div>
          {!invoice.payments || invoice.payments.length === 0 ? (
            <p style={s.noPayments}>Aucun paiement enregistré.</p>
          ) : (
            <div style={s.paymentsList}>
              {invoice.payments.map((p) => (
                <div key={p.id} style={s.paymentRow}>
                  <CheckCircle size={14} color="#2e7d32" />
                  <div style={s.paymentInfo}>
                    <span style={s.paymentAmount}>{fmt(p.amount)}</span>
                    <span style={s.paymentMeta}>
                      {p.payment_method?.toUpperCase()} · {fmtDate(p.payment_date)}
                      {p.reference && ` · Réf: ${p.reference}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClientInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [filter,   setFilter]   = useState('all');

  useEffect(() => {
    fetch(`${API}/client/invoices`, { headers: hdrs() })
      .then(r => r.json())
      .then(d => { if (d.success) setInvoices(d.data); else setError(d.message || 'Erreur.'); })
      .catch(() => setError('Erreur de connexion.'))
      .finally(() => setLoading(false));
  }, []);

  const totalAmount = invoices.reduce((acc, i) => acc + parseFloat(i.amount      || 0), 0);
  const totalPaid   = invoices.reduce((acc, i) => acc + parseFloat(i.amount_paid || 0), 0);
  const totalDue    = invoices.reduce((acc, i) => acc + parseFloat(i.amount_due  || 0), 0);

  const filtered = filter === 'all'
    ? invoices
    : invoices.filter(i => (i.invoice_status || i.status) === filter);

  if (loading) return <div style={s.center}><div style={s.spinner} /></div>;
  if (error)   return <div style={s.errorBox}><AlertCircle size={16} />{error}</div>;

  return (
    <div>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>Mes factures</h1>
          <p  style={s.pageSub}>{invoices.length} facture(s)</p>
        </div>
      </div>

      <div style={s.summaryGrid}>
        <div style={s.summaryCard}>
          <div style={s.summaryLabel}>Total facturé</div>
          <div style={s.summaryValue}>{fmt(totalAmount)}</div>
        </div>
        <div style={{ ...s.summaryCard, borderTop:'3px solid #2e7d32' }}>
          <div style={s.summaryLabel}>Total payé</div>
          <div style={{ ...s.summaryValue, color:'#2e7d32' }}>{fmt(totalPaid)}</div>
        </div>
        <div style={{ ...s.summaryCard, borderTop:'3px solid #f57f17' }}>
          <div style={s.summaryLabel}>Reste à payer</div>
          <div style={{ ...s.summaryValue, color: totalDue > 0 ? '#c62828' : '#2e7d32' }}>
            {fmt(totalDue)}
          </div>
        </div>
      </div>

      <div style={s.filterRow}>
        {[
          { value:'all',        label:`Toutes (${invoices.length})` },
          { value:'en_attente', label:`En attente (${invoices.filter(i => (i.invoice_status||i.status)==='en_attente').length})` },
          { value:'payée',      label:`Payées (${invoices.filter(i => (i.invoice_status||i.status)==='payée').length})` },
        ].map(({ value, label }) => (
          <button
            key={value}
            style={{ ...s.filterBtn, ...(filter === value ? s.filterBtnActive : {}) }}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={s.empty}>
          <Receipt size={48} color="#ddd" />
          <p>Aucune facture dans cette catégorie.</p>
        </div>
      ) : (
        <div style={s.invoicesList}>
          {filtered.map((inv) => <InvoiceCard key={inv.id} invoice={inv} />)}
        </div>
      )}
    </div>
  );
}

const s = {
  center:              { display:'flex', justifyContent:'center', alignItems:'center', height:300 },
  spinner:             { width:36, height:36, border:'3px solid #e0e0e0', borderTopColor:'#c9a84c', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
  errorBox:            { display:'flex', gap:8, alignItems:'center', padding:'14px 18px', background:'#fce4ec', color:'#c62828', borderRadius:8, fontSize:13 },
  pageHeader:          { marginBottom:20 },
  pageTitle:           { margin:0, fontSize:22, fontWeight:700, color:'#0f1923' },
  pageSub:             { margin:'4px 0 0', fontSize:13, color:'#888' },
  summaryGrid:         { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12, marginBottom:20 },
  summaryCard:         { background:'#fff', borderRadius:10, padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', borderTop:'3px solid #c9a84c' },
  summaryLabel:        { fontSize:12, color:'#888', marginBottom:6, fontWeight:500 },
  summaryValue:        { fontSize:20, fontWeight:700, color:'#0f1923' },
  filterRow:           { display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' },
  filterBtn:           { padding:'8px 16px', border:'1px solid #e0e0e0', borderRadius:20, background:'#fff', cursor:'pointer', fontSize:12, fontWeight:500, color:'#555' },
  filterBtnActive:     { background:'#0f1923', color:'#fff', borderColor:'#0f1923' },
  empty:               { textAlign:'center', padding:'60px 0', color:'#bbb' },
  invoicesList:        { display:'flex', flexDirection:'column', gap:12 },
  invoiceCard:         { background:'#fff', borderRadius:10, padding:'18px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', border:'1px solid transparent' },
  invoiceOverdue:      { borderColor:'#ffcdd2', background:'#fff9f9' },
  invoiceHeader:       { display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:12 },
  invoiceLeft:         { display:'flex', gap:12, alignItems:'center' },
  invoiceIconWrap:     { width:40, height:40, borderRadius:8, background:'#fff8e1', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  invoiceNumber:       { fontSize:15, fontWeight:700, color:'#0f1923' },
  invoiceSub:          { fontSize:12, color:'#888', marginTop:2 },
  invoiceRight:        { display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' },
  statusBadge:         { display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:20 },
  invoiceAmount:       { fontSize:18, fontWeight:700, color:'#0f1923' },
  expandBtn:           { background:'none', border:'1px solid #e0e0e0', borderRadius:6, padding:'4px 8px', cursor:'pointer', color:'#666', display:'flex', alignItems:'center' },
  invoiceProgress:     { marginBottom:10 },
  progressWrap:        { height:6, background:'#f0f0f0', borderRadius:3, overflow:'hidden', marginBottom:6 },
  progressFill:        { height:'100%', background:'linear-gradient(90deg, #2e7d32, #66bb6a)', borderRadius:3, transition:'width 0.3s' },
  progressLabels:      { display:'flex', justifyContent:'space-between', fontSize:11 },
  progressPaid:        { color:'#2e7d32', fontWeight:600 },
  progressDue:         { color:'#aaa' },
  progressDueRed:      { color:'#c62828', fontWeight:600 },
  invoiceDates:        { display:'flex', gap:6, fontSize:12, color:'#888', flexWrap:'wrap', alignItems:'center' },
  dot:                 { color:'#ddd' },
  paymentsSection:     { marginTop:14, paddingTop:14, borderTop:'1px solid #f0f0f0' },
  paymentsSectionTitle:{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, color:'#555', marginBottom:10 },
  noPayments:          { fontSize:12, color:'#aaa', textAlign:'center', padding:'10px 0' },
  paymentsList:        { display:'flex', flexDirection:'column', gap:8 },
  paymentRow:          { display:'flex', gap:10, alignItems:'flex-start', padding:'10px 12px', background:'#f9f9f9', borderRadius:6 },
  paymentInfo:         { display:'flex', flexDirection:'column', gap:2 },
  paymentAmount:       { fontSize:14, fontWeight:700, color:'#2e7d32' },
  paymentMeta:         { fontSize:11, color:'#888' },
};