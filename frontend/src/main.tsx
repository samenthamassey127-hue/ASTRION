import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const navItems = [
  { icon: '◈', label: 'Mission control', active: true },
  { icon: '◎', label: 'Observations', badge: '03' },
  { icon: '⌁', label: 'Data streams' },
  { icon: '◌', label: 'Models' },
]

const telemetry = [
  { label: 'Objects tracked', value: '—', note: 'Awaiting data', icon: '◉' },
  { label: 'Signal coverage', value: '—', note: 'No sources connected', icon: '◒' },
  { label: 'Last sync', value: '—', note: 'Not available', icon: '↻' },
]

function App() {
  const [activeNav, setActiveNav] = useState('Mission control')
  const [view, setView] = useState('3D view')

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">✦</span><span>ASTRION</span><span className="brand-beta">M1</span></div>
        <div className="workspace-switcher"><span className="workspace-dot" /> <span><small>WORKSPACE</small>Northstar Lab</span><span className="chevron">⌄</span></div>
        <div className="nav-label">Workspace</div>
        <nav aria-label="Main navigation">
          {navItems.map((item) => <button className={`nav-item ${activeNav === item.label ? 'active' : ''}`} key={item.label} onClick={() => setActiveNav(item.label)}><span className="nav-icon">{item.icon}</span>{item.label}{item.badge && <span className="nav-badge">{item.badge}</span>}</button>)}
        </nav>
        <div className="nav-label lower-label">System</div>
        <nav>
          <button className="nav-item"><span className="nav-icon">⚙</span>Settings</button>
          <button className="nav-item"><span className="nav-icon">?</span>Help center</button>
        </nav>
        <div className="sidebar-footer"><div className="avatar">AM</div><div><strong>Alex Morgan</strong><small>Researcher</small></div><span className="more">•••</span></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="breadcrumbs"><span>Mission control</span><span className="slash">/</span><strong>{activeNav}</strong></div><div className="top-actions"><span className="system-status"><i /> All systems nominal</span><button className="icon-button" aria-label="Notifications">♧<span className="notification-dot" /></button><button className="icon-button" aria-label="Command menu">⌘</button></div></header>
        <div className="content-wrap">
          <section className="page-heading"><div><p className="eyebrow">MONDAY, 14 OCTOBER 2024 <span className="eyebrow-line" /></p><h1>Good morning, Alex <span className="wave">✦</span></h1><p className="subtitle">Your orbital intelligence workspace is ready.</p></div><button className="primary-button"><span>＋</span> New observation</button></section>

          <section className="telemetry-grid">{telemetry.map((item) => <article className="telemetry-card" key={item.label}><div className="card-top"><span>{item.label}</span><span className="telemetry-icon">{item.icon}</span></div><div className="telemetry-value">{item.value}</div><div className="telemetry-note"><span className="empty-dot" />{item.note}</div></article>)}</section>

          <section className="visualization-panel panel"><div className="panel-header"><div><div className="panel-title-row"><h2>Orbital scene</h2><span className="live-pill">STANDBY</span></div><p>Interactive spatial overview</p></div><div className="view-toggle">{['3D view', 'Map'].map((option) => <button className={view === option ? 'selected' : ''} onClick={() => setView(option)} key={option}>{option}</button>)}</div></div><div className="scene"><div className="scene-grid" /><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="scene-core">✦</div><div className="scene-empty"><div className="empty-illustration">◎</div><h3>Nothing in orbit yet</h3><p>Connect a data source or create an observation<br />to populate your orbital scene.</p><button className="secondary-button">Connect a data source <span>→</span></button></div><div className="scene-footer"><span><i className="legend-dot blue" /> Live telemetry</span><span><i className="legend-dot purple" /> Predicted path</span><span className="scene-coordinates">LAT — &nbsp; LONG — &nbsp; ALT —</span></div></div></section>

          <section className="bottom-grid"><article className="panel analysis-card"><div className="panel-header compact"><div><h2>Analysis queue</h2><p>Review and prioritize your next signal</p></div><button className="text-button">View all <span>→</span></button></div><div className="queue-empty"><span className="queue-icon">⌁</span><div><strong>Your queue is clear</strong><p>New observations will appear here for analysis.</p></div></div></article><article className="panel quick-card"><div className="panel-header compact"><div><h2>Quick analysis</h2><p>Start with a focused workflow</p></div></div><div className="analysis-controls"><button><span className="control-icon">✧</span><span><strong>Pattern scan</strong><small>Find anomalies in a signal</small></span><span className="arrow">→</span></button><button><span className="control-icon">◌</span><span><strong>Orbit estimate</strong><small>Model an object's trajectory</small></span><span className="arrow">→</span></button></div></article></section>
        </div>
        <footer className="app-footer"><span><span className="footer-mark">✦</span> ASTRION MILESTONE 1</span><span>STATIC WORKSPACE <b>·</b> ALL DATA LOCAL</span></footer>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
