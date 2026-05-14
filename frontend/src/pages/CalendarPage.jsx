// pages/CalendarPage.jsx
// Calendrier 100% React — zéro dépendance externe
// Pas de problème de compatibilité FullCalendar / React 18 / CRA

import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { getCalendarEvents }   from '../api/hearings';

// ── Constantes ────────────────────────────────────────────────────────────────
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin',
                   'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS_FR   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

// ── Helpers date ──────────────────────────────────────────────────────────────
const toYMD   = (d) => d.toISOString().split('T')[0];
const today   = () => toYMD(new Date());

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfMonth(year, month) {
  // 0=dim → transformer en 0=lun
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

// ── Badge couleur par statut ──────────────────────────────────────────────────
const EVENT_COLORS = {
  scheduled: '#1e40af',
  completed: '#16a34a',
  postponed: '#f59e0b',
  cancelled: '#94a3b8',
  pending:   '#f59e0b',
  expired:   '#ef4444',
  deadline:  '#f59e0b',
};

// ── Tooltip ───────────────────────────────────────────────────────────────────
function Tooltip({ event, onClose }) {
  if (!event) return null;
  const ep = event.extendedProps || {};
  const STATUS_LABELS = {
    scheduled:'Planifiée', completed:'Terminée', postponed:'Reportée',
    cancelled:'Annulée',   pending:'En attente', expired:'Expirée',
  };
  return (
    <div style={T.overlay} onClick={onClose}>
      <div style={T.box} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <span style={{ fontWeight:700, fontSize:14, color:'#0f172a', flex:1 }}>{event.title}</span>
          <button onClick={onClose} style={T.close}>×</button>
        </div>
        {ep.case_title && <p style={T.line}>📁 {ep.case_title}</p>}
        {ep.location   && <p style={T.line}>📍 {ep.location}</p>}
        {event.start   && <p style={T.line}>📅 {new Date(event.start).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</p>}
        {ep.status     && (
          <span style={T.badge}>{STATUS_LABELS[ep.status] || ep.status}</span>
        )}
      </div>
    </div>
  );
}
const T = {
  overlay:{ position:'fixed', inset:0, background:'rgba(0,0,0,.2)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' },
  box:    { background:'#fff', borderRadius:14, padding:'20px 24px', width:300, boxShadow:'0 20px 60px rgba(0,0,0,.15)', fontFamily:"'DM Sans',sans-serif" },
  close:  { background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#94a3b8', padding:0, marginLeft:8, lineHeight:1 },
  line:   { fontSize:12, color:'#64748b', margin:'8px 0 0' },
  badge:  { display:'inline-block', marginTop:10, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#f1f5f9', color:'#475569' },
};

// ── Cellule de jour ────────────────────────────────────────────────────────────
function DayCell({ day, year, month, events, onEventClick, isToday }) {
  const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const dayEvents = events.filter(e => {
    const eDate = (e.start || '').split('T')[0];
    return eDate === dateStr;
  });

  return (
    <div style={{
      ...DC.cell,
      background: isToday ? '#eff6ff' : '#fff',
      borderColor: isToday ? '#bfdbfe' : '#f1f5f9',
    }}>
      <span style={{
        ...DC.num,
        background: isToday ? '#1e40af' : 'transparent',
        color:      isToday ? '#fff'    : '#374151',
      }}>
        {day}
      </span>
      <div style={DC.events}>
        {dayEvents.slice(0, 3).map((ev, i) => (
          <button
            key={i}
            onClick={() => onEventClick(ev)}
            style={{
              ...DC.evBtn,
              background: EVENT_COLORS[ev.extendedProps?.status] || '#1e40af',
            }}
          >
            {ev.title.length > 18 ? ev.title.slice(0, 17) + '…' : ev.title}
          </button>
        ))}
        {dayEvents.length > 3 && (
          <span style={DC.more}>+{dayEvents.length - 3} autre{dayEvents.length - 3 > 1 ? 's' : ''}</span>
        )}
      </div>
    </div>
  );
}
const DC = {
  cell:  { padding:'6px 6px 8px', border:'1px solid #f1f5f9', minHeight:90, display:'flex', flexDirection:'column', gap:3 },
  num:   { fontSize:12, fontWeight:700, width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginBottom:2 },
  events:{ display:'flex', flexDirection:'column', gap:2, flex:1 },
  evBtn: { display:'block', width:'100%', textAlign:'left', border:'none', borderRadius:4, padding:'2px 5px', fontSize:10, fontWeight:600, color:'#fff', cursor:'pointer', lineHeight:1.4, whiteSpace:'nowrap', overflow:'hidden' },
  more:  { fontSize:10, color:'#94a3b8', paddingLeft:4 },
};

// ── Onglet liste ──────────────────────────────────────────────────────────────
function ListView({ events, onEventClick }) {
  const sorted = [...events].sort((a,b) => (a.start||'').localeCompare(b.start||''));
  if (!sorted.length) return (
    <div style={{ textAlign:'center', color:'#94a3b8', padding:'48px', fontSize:14 }}>
      <div style={{ fontSize:32, marginBottom:8 }}>📭</div>Aucun événement ce mois
    </div>
  );
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {sorted.map((ev, i) => {
        const ep  = ev.extendedProps || {};
        const col = EVENT_COLORS[ep.status] || '#1e40af';
        return (
          <button key={i} onClick={() => onEventClick(ev)} style={{ ...LV.item, borderLeft:`4px solid ${col}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <span style={{ fontWeight:600, fontSize:13, color:'#0f172a' }}>{ev.title}</span>
              <span style={{ fontSize:11, color:'#94a3b8', flexShrink:0, marginLeft:10 }}>
                {ev.start ? new Date(ev.start).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}) : ''}
              </span>
            </div>
            {ep.case_title && <div style={{ fontSize:11, color:'#64748b', marginTop:3 }}>📁 {ep.case_title}</div>}
          </button>
        );
      })}
    </div>
  );
}
const LV = {
  item: { display:'block', width:'100%', background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, padding:'12px 16px', cursor:'pointer', textAlign:'left', fontFamily:'inherit' },
};

// ─────────────────────────────────────────────────────────────────────────────
// CalendarPage
// ─────────────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const navigate = useNavigate();
  const now      = new Date();
  const [year,   setYear]   = useState(now.getFullYear());
  const [month,  setMonth]  = useState(now.getMonth());
  const [view,   setView]   = useState('month'); // 'month' | 'list'
  const [events, setEvents] = useState([]);
  const [loading,setLoading]= useState(true);
  const [tooltip,setTooltip]= useState(null);

  useEffect(() => {
    setLoading(true);
    const m = `${year}-${String(month+1).padStart(2,'0')}`;
    getCalendarEvents(m)
      .then(res => setEvents(res.data || []))
      .catch(e  => console.error('[CalendarPage]', e))
      .finally(()=> setLoading(false));
  }, [year, month]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y-1); setMonth(11); }
    else              setMonth(m => m-1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y+1); setMonth(0); }
    else               setMonth(m => m+1);
  };
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); };

  // Construire la grille
  const totalDays = daysInMonth(year, month);
  const startDay  = firstDayOfMonth(year, month);
  const todayStr  = today();

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={S.header}>
        <div style={S.headerIcon}>📅</div>
        <div style={{ flex:1 }}>
          <h1 style={S.title}>Agenda & Calendrier</h1>
          <p style={S.sub}>Audiences · Délais légaux</p>
        </div>
        <button onClick={() => navigate('/hearings/new')} style={S.btnAdd}>+ Nouvelle audience</button>
      </div>

      {/* Contrôles */}
      <div style={S.controls}>
        <div style={S.navGroup}>
          <button onClick={prevMonth} style={S.navBtn}>‹</button>
          <button onClick={goToday}   style={S.todayBtn}>Aujourd'hui</button>
          <button onClick={nextMonth} style={S.navBtn}>›</button>
        </div>
        <h2 style={S.monthTitle}>{MONTHS_FR[month]} {year}</h2>
        <div style={S.viewGroup}>
          {[{k:'month',l:'Mois'},{k:'list',l:'Liste'}].map(({k,l}) => (
            <button key={k} onClick={() => setView(k)} style={{
              ...S.viewBtn,
              background: view===k ? '#1e40af' : '#f8fafc',
              color:      view===k ? '#fff'    : '#64748b',
              borderColor:view===k ? '#1e40af' : '#e2e8f0',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Légende */}
      <div style={S.legend}>
        {[
          {color:'#1e40af',label:'Planifiée'},
          {color:'#16a34a',label:'Terminée'},
          {color:'#f59e0b',label:'Reportée / Délai'},
          {color:'#ef4444',label:'Expiré'},
          {color:'#94a3b8',label:'Annulée'},
        ].map(({color,label}) => (
          <div key={label} style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{width:9,height:9,borderRadius:3,background:color,flexShrink:0}}/>
            <span style={{fontSize:11,color:'#64748b'}}>{label}</span>
          </div>
        ))}
      </div>

      {/* Contenu */}
      <div style={S.calWrap}>
        {loading ? (
          <div style={S.loadingBox}>
            <span style={S.spinner}/> Chargement…
          </div>
        ) : view === 'month' ? (
          <>
            {/* En-têtes jours */}
            <div style={S.grid}>
              {DAYS_FR.map(d => (
                <div key={d} style={S.dayHeader}>{d}</div>
              ))}
            </div>
            {/* Grille */}
            <div style={S.grid}>
              {cells.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} style={{...DC.cell, background:'#fafafa', borderColor:'#f1f5f9'}} />;
                const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                return (
                  <DayCell
                    key={day}
                    day={day}
                    year={year}
                    month={month}
                    events={events}
                    onEventClick={setTooltip}
                    isToday={dateStr === todayStr}
                  />
                );
              })}
            </div>
          </>
        ) : (
          <ListView events={events} onEventClick={setTooltip} />
        )}
      </div>

      {tooltip && <Tooltip event={tooltip} onClose={() => setTooltip(null)} />}
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const S = {
  page:       {padding:'28px 32px', fontFamily:"'DM Sans',sans-serif", maxWidth:1050},
  header:     {display:'flex', alignItems:'center', gap:16, marginBottom:20},
  headerIcon: {width:48,height:48,borderRadius:12,background:'linear-gradient(135deg,#1e40af,#3b82f6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0},
  title:      {fontSize:22,fontWeight:700,color:'#0f172a',margin:0},
  sub:        {fontSize:13,color:'#64748b',margin:'3px 0 0'},
  btnAdd:     {padding:'9px 18px',background:'#1e40af',color:'#fff',border:'none',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'},
  controls:   {display:'flex',alignItems:'center',gap:16,marginBottom:14,flexWrap:'wrap'},
  navGroup:   {display:'flex',gap:4},
  navBtn:     {width:34,height:34,border:'1px solid #e2e8f0',borderRadius:8,background:'#fff',cursor:'pointer',fontSize:18,color:'#374151',display:'flex',alignItems:'center',justifyContent:'center'},
  todayBtn:   {padding:'7px 14px',border:'1px solid #e2e8f0',borderRadius:8,background:'#fff',cursor:'pointer',fontSize:12,fontWeight:600,color:'#374151',fontFamily:'inherit'},
  monthTitle: {fontSize:18,fontWeight:700,color:'#0f172a',margin:0,flex:1,textAlign:'center'},
  viewGroup:  {display:'flex',gap:4},
  viewBtn:    {padding:'7px 14px',border:'1px solid',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit',transition:'all .15s'},
  legend:     {display:'flex',gap:14,marginBottom:14,flexWrap:'wrap'},
  calWrap:    {background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:16,overflow:'hidden'},
  grid:       {display:'grid',gridTemplateColumns:'repeat(7,1fr)'},
  dayHeader:  {padding:'8px 6px',fontSize:11,fontWeight:700,color:'#94a3b8',textAlign:'center',textTransform:'uppercase',borderBottom:'1px solid #f1f5f9'},
  loadingBox: {display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:48,color:'#64748b',fontSize:14},
  spinner:    {display:'inline-block',width:18,height:18,border:'2px solid #e2e8f0',borderTop:'2px solid #1e40af',borderRadius:'50%',animation:'spin .7s linear infinite'},
};

/*
  index.css — ajouter si manquant :
  @keyframes spin { to { transform: rotate(360deg); } }
*/