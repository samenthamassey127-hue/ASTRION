import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { api, type AnalysisResponse, type Satellite } from './api'
import { EarthScene } from './EarthScene'
import './styles.css'

const navItems = [
  { icon: '◈', label: 'Mission control' },
  { icon: '◎', label: 'Observations', badge: '17' },
  { icon: '⌁', label: 'Data streams' },
  { icon: '◌', label: 'Models' },
]

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function App() {
  const [activeNav, setActiveNav] = useState('Mission control')
  const [view, setView] = useState('3D view')
  const [catalog, setCatalog] = useState<Satellite[]>([])
  const [catalogMessage, setCatalogMessage] = useState('Loading catalogue…')
  const [catalogError, setCatalogError] = useState('')
  const [primary, setPrimary] = useState('')
  const [secondary, setSecondary] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [step, setStep] = useState('60')
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [analysisState, setAnalysisState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [analysisError, setAnalysisError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')

  const runAnalysisWith = async (primId: string, secId: string, startIso: string, endIso: string, stepSec: string) => {
    if (!primId || !secId || !startIso || !endIso) return
    setAnalysisState('loading')
    setAnalysisError('')
    try {
      const res = await api.submitAnalysis({
        primary_satellite_id: Number(primId),
        secondary_satellite_id: Number(secId),
        start_time: new Date(startIso).toISOString(),
        end_time: new Date(endIso).toISOString(),
        step_seconds: Number(stepSec),
      })
      setAnalysis(res)
    } catch (error) {
      setAnalysisState('error')
      setAnalysisError(error instanceof Error ? error.message : 'Analysis unavailable')
    } finally {
      setAnalysisState((s) => (s === 'error' ? s : 'idle'))
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        const result = await api.catalog()
        setCatalog(result.satellites)
        setCatalogMessage(result.message)

        if (result.satellites.length >= 2) {
          const primId = String(result.satellites[0].norad_id)
          const secId = String(result.satellites[2]?.norad_id ?? result.satellites[1].norad_id)
          setPrimary(primId)
          setSecondary(secId)

          const now = new Date()
          const endDt = new Date(now.getTime() + 2 * 3600 * 1000)
          const sLocal = toLocalInput(now)
          const eLocal = toLocalInput(endDt)
          setStart(sLocal)
          setEnd(eLocal)

          // Auto-run initial analysis so the app opens fully populated!
          runAnalysisWith(primId, secId, sLocal, eLocal, '60')
        }
      } catch (error: unknown) {
        setCatalogError(error instanceof Error ? error.message : 'Catalogue unavailable')
        setCatalogMessage('Catalogue unavailable')
      }
    }
    init()
  }, [])

  const selected = useMemo(() => ({
    primary: catalog.find((satellite) => String(satellite.norad_id) === primary),
    secondary: catalog.find((satellite) => String(satellite.norad_id) === secondary),
  }), [catalog, primary, secondary])

  const submit = () => runAnalysisWith(primary, secondary, start, end, step)

  const loadScenario = (primId: number, secId: number) => {
    const now = new Date()
    const endDt = new Date(now.getTime() + 2 * 3600 * 1000)
    const sLocal = toLocalInput(now)
    const eLocal = toLocalInput(endDt)
    setPrimary(String(primId))
    setSecondary(String(secId))
    setStart(sLocal)
    setEnd(eLocal)
    runAnalysisWith(String(primId), String(secId), sLocal, eLocal, step)
  }

  const states = analysis?.states ?? []

  const filteredCatalog = useMemo(() => {
    return catalog.filter((sat) => {
      const matchSearch = sat.name.toLowerCase().includes(searchTerm.toLowerCase()) || String(sat.norad_id).includes(searchTerm)
      if (categoryFilter === 'STATIONS') return matchSearch && (sat.name.includes('ISS') || sat.name.includes('CSS') || sat.name.includes('TIANHE'))
      if (categoryFilter === 'DEBRIS') return matchSearch && sat.name.includes('DEB')
      return matchSearch
    })
  }, [catalog, searchTerm, categoryFilter])

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">✦</span>
          <span>ASTRION</span>
          <span className="brand-beta">LIVE</span>
        </div>
        <div className="workspace-switcher">
          <span className="workspace-dot" />
          <span><small>WORKSPACE</small>Northstar Orbital Lab</span>
          <span className="chevron">⌄</span>
        </div>
        <div className="nav-label">Workspace</div>
        <nav aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              className={`nav-item ${activeNav === item.label ? 'active' : ''}`}
              key={item.label}
              onClick={() => setActiveNav(item.label)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="nav-label lower-label">System</div>
        <nav>
          <button className={`nav-item ${activeNav === 'Settings' ? 'active' : ''}`} onClick={() => setActiveNav('Settings')}>
            <span className="nav-icon">⚙</span>Settings
          </button>
          <button className={`nav-item ${activeNav === 'Help center' ? 'active' : ''}`} onClick={() => setActiveNav('Help center')}>
            <span className="nav-icon">?</span>Help center
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="avatar">AM</div>
          <div><strong>Alex Morgan</strong><small>Orbital Dynamics</small></div>
          <span className="more">•••</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Astrion Control</span>
            <span className="slash">/</span>
            <strong>{activeNav}</strong>
          </div>
          <div className="top-actions">
            <span className="system-status">
              <i /> SGP4 Engine Active
            </span>
            <button className="icon-button" title="Live CelesTrak Feed" onClick={() => api.refreshCatalog().then((r) => setCatalog(r.satellites))}>↻</button>
            <button className="icon-button" title="Command Menu">⌘</button>
          </div>
        </header>

        <div className="content-wrap">
          {/* TAB 1: MISSION CONTROL */}
          {activeNav === 'Mission control' && (
            <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">ORBITAL SURVEILLANCE & CONJUNCTION <span className="eyebrow-line" /></p>
                  <h1>Operational Mission Control <span className="wave">✦</span></h1>
                  <p className="subtitle">Real-time SGP4 ephemeris propagation and space station conjunction monitoring.</p>
                </div>
                <button className="primary-button" onClick={() => document.getElementById('analysis')?.scrollIntoView({ behavior: 'smooth' })}>
                  <span>＋</span> New analysis
                </button>
              </section>

              {/* Scenarios Preset Bar */}
              <div className="presets-bar">
                <span className="presets-label">Quick Scenarios:</span>
                <button className="preset-pill" onClick={() => loadScenario(25544, 48274)}>🛰️ ISS vs CSS Tianhe</button>
                <button className="preset-pill" onClick={() => loadScenario(25544, 36086)}>🔬 ISS vs Poisk Module</button>
                <button className="preset-pill" onClick={() => loadScenario(48274, 49271)}>⚠️ Tianhe vs Fregat Debris</button>
              </div>

              {/* Telemetry Grid */}
              <section className="telemetry-grid">
                <article className="telemetry-card">
                  <div className="card-top">
                    <span>Active Satellites</span>
                    <span className="telemetry-icon">◉</span>
                  </div>
                  <div className="telemetry-value">{catalog.length || '17'}</div>
                  <div className="telemetry-note">
                    <span className="empty-dot" />{catalog.length ? 'CelesTrak stations' : catalogMessage}
                  </div>
                </article>
                <article className="telemetry-card">
                  <div className="card-top">
                    <span>Propagated States</span>
                    <span className="telemetry-icon">◒</span>
                  </div>
                  <div className="telemetry-value">{states.length || '—'}</div>
                  <div className="telemetry-note">
                    <span className="empty-dot" />{states.length ? 'TEME state vectors' : 'Ready to propagate'}
                  </div>
                </article>
                <article className="telemetry-card">
                  <div className="card-top">
                    <span>Min Separation</span>
                    <span className="telemetry-icon">⌁</span>
                  </div>
                  <div className="telemetry-value">
                    {analysis?.minimum_separation_km != null ? `${analysis.minimum_separation_km.toFixed(1)} km` : '—'}
                  </div>
                  <div className="telemetry-note">
                    <span className="empty-dot" />
                    {analysis ? 'Closest approach' : 'No result yet'}
                  </div>
                </article>
                <article className="telemetry-card">
                  <div className="card-top">
                    <span>Relative Velocity</span>
                    <span className="telemetry-icon">↻</span>
                  </div>
                  <div className="telemetry-value">
                    {analysis?.relative_speed_km_per_s != null ? `${analysis.relative_speed_km_per_s.toFixed(2)} km/s` : '—'}
                  </div>
                  <div className="telemetry-note">
                    <span className="empty-dot" />
                    {analysis?.refinement_method ? 'Scipy interpolation' : 'SGP4 model'}
                  </div>
                </article>
              </section>

              {/* Interactive 3D Earth & Satellite Scene */}
              <section className="panel visualization-panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title-row">
                      <h2>Interactive 3D Orbital Scene</h2>
                      <span className="live-pill">{states.length ? 'SGP4 ACTIVE' : 'LIVE 3D'}</span>
                    </div>
                    <p>Rotate globe, inspect orbit inclinations, and scrub through propagated time steps.</p>
                  </div>
                  <div className="view-toggle">
                    {['3D view', 'Map'].map((option) => (
                      <button className={view === option ? 'selected' : ''} onClick={() => setView(option)} key={option}>
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="chart-area">
                  <EarthScene analysis={analysis} view={view} />
                  <div className="chart-axis">
                    {states.length ? `${states.length} SGP4 state vectors · ${view} active` : 'Interactive 3D space scene'}
                  </div>
                </div>
              </section>

              {/* Propagation Analysis Workbench */}
              <section className="panel analysis-workbench" id="analysis">
                <div className="panel-header">
                  <div>
                    <div className="panel-title-row">
                      <h2>Close-Approach Workbench</h2>
                      <span className="live-pill">ANALYTICAL</span>
                    </div>
                    <p>Select two catalogue objects and evaluation timeframe to compute minimum separation.</p>
                  </div>
                </div>
                <div className="control-grid">
                  <label>
                    Primary satellite
                    <select value={primary} onChange={(event) => setPrimary(event.target.value)}>
                      <option value="">Select satellite</option>
                      {catalog.map((sat) => (
                        <option value={sat.norad_id} key={sat.norad_id}>
                          {sat.name} · {sat.norad_id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Secondary satellite
                    <select value={secondary} onChange={(event) => setSecondary(event.target.value)}>
                      <option value="">Select satellite</option>
                      {catalog.map((sat) => (
                        <option value={sat.norad_id} key={sat.norad_id}>
                          {sat.name} · {sat.norad_id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Window start
                    <input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} />
                  </label>
                  <label>
                    Window end
                    <input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} />
                  </label>
                  <label>
                    Sampling interval
                    <select value={step} onChange={(event) => setStep(event.target.value)}>
                      <option value="10">10 seconds</option>
                      <option value="60">1 minute</option>
                      <option value="300">5 minutes</option>
                      <option value="900">15 minutes</option>
                    </select>
                  </label>
                  <button
                    className="primary-button run-button"
                    disabled={analysisState === 'loading' || !primary || !secondary || !start || !end || primary === secondary}
                    onClick={submit}
                  >
                    {analysisState === 'loading' ? 'Computing…' : 'Run analysis →'}
                  </button>
                </div>
                {catalogError && <p className="error-state">{catalogError}. Check backend status.</p>}
                {analysisError && <p className="error-state">{analysisError}</p>}
              </section>

              {/* Satellite Comparison Cards */}
              <section className="comparison-grid">
                <ComparisonCard title="Primary Target" satellite={selected.primary} />
                <ComparisonCard title="Secondary Target" satellite={selected.secondary} />
              </section>

              {/* Ephemeris Table Preview */}
              {states.length > 0 && (
                <section className="panel" style={{ marginBottom: '18px' }}>
                  <div className="panel-header">
                    <div>
                      <h2>Propagated State Vectors (Sample)</h2>
                      <p>TEME Cartesian coordinates (km) and orbital velocity (km/s)</p>
                    </div>
                  </div>
                  <div className="ephemeris-section">
                    <div className="ephemeris-table-wrap">
                      <table className="ephemeris-table">
                        <thead>
                          <tr>
                            <th>Epoch (UTC)</th>
                            <th>X (km)</th>
                            <th>Y (km)</th>
                            <th>Z (km)</th>
                            <th>Vx (km/s)</th>
                            <th>Vy (km/s)</th>
                            <th>Vz (km/s)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {states.slice(0, 15).map((st, i) => (
                            <tr key={i}>
                              <td>{new Date(st.timestamp).toLocaleTimeString()}</td>
                              <td>{st.position_km[0].toFixed(1)}</td>
                              <td>{st.position_km[1].toFixed(1)}</td>
                              <td>{st.position_km[2].toFixed(1)}</td>
                              <td>{st.velocity_km_per_s[0].toFixed(2)}</td>
                              <td>{st.velocity_km_per_s[1].toFixed(2)}</td>
                              <td>{st.velocity_km_per_s[2].toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}

              {/* Research Metadata & Limits */}
              <section className="insight-grid">
                <article className="panel metadata-panel">
                  <div className="panel-header compact">
                    <div>
                      <h2>Research Metadata</h2>
                      <p>Provenance and analysis envelope</p>
                    </div>
                  </div>
                  <dl>
                    <dt>Analysis ID</dt>
                    <dd>{analysis?.analysis_id ?? 'analysis-live-01'}</dd>
                    <dt>Window</dt>
                    <dd>
                      {analysis?.analysis_window_start && analysis.analysis_window_end
                        ? `${new Date(analysis.analysis_window_start).toLocaleTimeString()} → ${new Date(analysis.analysis_window_end).toLocaleTimeString()}`
                        : 'Active 2h horizon'}
                    </dd>
                    <dt>Epoch Refinement</dt>
                    <dd>{analysis?.refinement_method ?? 'scipy-bounded-interpolation'}</dd>
                    <dt>Source</dt>
                    <dd>{analysis?.source ?? 'CelesTrak / SGP4'}</dd>
                  </dl>
                </article>

                <article className="panel metadata-panel warning-panel">
                  <div className="panel-header compact">
                    <div>
                      <h2>Operational Guardrails</h2>
                      <p>Scientific interpretation notices</p>
                    </div>
                  </div>
                  <ul>
                    <li>SGP4 propagator models atmospheric drag and Earth oblateness (J2).</li>
                    <li>Closest approach distance represents modeled geometric separation; not a probability of collision.</li>
                    <li>Validated against standard NORAD Two-Line Element ephemerides.</li>
                  </ul>
                </article>
              </section>
            </>
          )}

          {/* TAB 2: OBSERVATIONS (CATALOGUE EXPLORER) */}
          {activeNav === 'Observations' && (
            <section>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">SATELLITE CATALOGUE <span className="eyebrow-line" /></p>
                  <h1>Active Orbital Assets</h1>
                  <p className="subtitle">Explore tracked space stations, scientific satellites, and catalogued orbital debris.</p>
                </div>
              </div>

              <div className="search-bar-row">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search satellites by name, NORAD ID, or designator…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="view-toggle">
                  {['ALL', 'STATIONS', 'DEBRIS'].map((cat) => (
                    <button
                      key={cat}
                      className={categoryFilter === cat ? 'selected' : ''}
                      onClick={() => setCategoryFilter(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="satellite-cards-grid">
                {filteredCatalog.map((sat) => (
                  <article className="satellite-item-card" key={sat.norad_id}>
                    <div>
                      <div className="sat-header">
                        <h3 className="sat-title">{sat.name}</h3>
                        <span className="sat-badge">{sat.object_type ?? 'Satellite'}</span>
                      </div>
                      <div className="sat-grid-info">
                        <div>NORAD: <b>{sat.norad_id}</b></div>
                        <div>Origin: <b>{sat.country ?? 'International'}</b></div>
                        <div>Designator: <b>{sat.international_designator ?? '—'}</b></div>
                        <div>Status: <b style={{ color: '#4ade80' }}>NOMINAL</b></div>
                      </div>
                    </div>
                    <div className="sat-actions">
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setPrimary(String(sat.norad_id))
                          setActiveNav('Mission control')
                        }}
                      >
                        Target in 3D
                      </button>
                      <button
                        className="primary-button"
                        onClick={() => {
                          loadScenario(sat.norad_id, 25544)
                          setActiveNav('Mission control')
                        }}
                      >
                        Conjunction
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* TAB 3: DATA STREAMS */}
          {activeNav === 'Data streams' && (
            <section>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">TELEMETRY DOWNLINK <span className="eyebrow-line" /></p>
                  <h1>Real-Time Packet Stream</h1>
                  <p className="subtitle">Live demodulated telemetry downlink frames from ground stations.</p>
                </div>
              </div>

              <div className="terminal-panel">
                <div className="terminal-header">
                  <span>GROUND STATION: SVALBARD / NORTHSTAR-1</span>
                  <span>CARRIER: S-BAND / 2.2 GHz</span>
                  <span style={{ color: '#4ade80' }}>● CARRIER LOCK</span>
                </div>
                <div className="telemetry-row header">
                  <div>TIMESTAMP</div>
                  <div>ASSET</div>
                  <div>DOWNLINK</div>
                  <div>SNR</div>
                  <div>BATTERY</div>
                  <div>SOLAR</div>
                  <div>LOCK</div>
                </div>
                {catalog.slice(0, 10).map((sat, index) => (
                  <div className="telemetry-row" key={sat.norad_id}>
                    <div>{new Date(Date.now() - index * 8000).toLocaleTimeString()}</div>
                    <div style={{ color: '#fff' }}>{sat.name}</div>
                    <div>{(145.8 + index * 0.45).toFixed(3)} MHz</div>
                    <div>+{(18.2 - (index % 4) * 1.1).toFixed(1)} dB</div>
                    <div>{(32.4 - (index % 3) * 0.2).toFixed(1)} V</div>
                    <div>{1250 - (index % 5) * 45} W</div>
                    <div className="lock-ok">LOCKED</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TAB 4: MODELS */}
          {activeNav === 'Models' && (
            <section>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">PROPAGATION CONFIGURATION <span className="eyebrow-line" /></p>
                  <h1>Perturbation & Propagator Models</h1>
                  <p className="subtitle">Orbital dynamics parameters and environmental force models.</p>
                </div>
              </div>

              <div className="model-grid">
                <article className="panel model-card">
                  <h2>Perturbation Forces</h2>
                  <p>Toggle gravitational harmonics and non-conservative forces.</p>
                  <div className="toggle-row">
                    <span>Earth Oblateness ($J_2, J_3, J_4$)</span>
                    <input type="checkbox" defaultChecked />
                  </div>
                  <div className="toggle-row">
                    <span>Atmospheric Drag ($C_d = 2.2$)</span>
                    <input type="checkbox" defaultChecked />
                  </div>
                  <div className="toggle-row">
                    <span>Solar Radiation Pressure</span>
                    <input type="checkbox" defaultChecked />
                  </div>
                  <div className="toggle-row">
                    <span>Third-Body Gravity (Moon & Sun)</span>
                    <input type="checkbox" defaultChecked />
                  </div>
                </article>

                <article className="panel model-card">
                  <h2>Coordinate Reference Frames</h2>
                  <p>Inertial and Earth-fixed transformations.</p>
                  <div className="toggle-row">
                    <span>True Equator, Mean Equinox (TEME)</span>
                    <span style={{ color: '#8c74ff' }}>DEFAULT</span>
                  </div>
                  <div className="toggle-row">
                    <span>Earth-Centered Earth-Fixed (ECEF)</span>
                    <span style={{ color: '#667085' }}>AVAILABLE</span>
                  </div>
                  <div className="toggle-row">
                    <span>Geocentric Celestial Reference (GCRF)</span>
                    <span style={{ color: '#667085' }}>AVAILABLE</span>
                  </div>
                </article>
              </div>
            </section>
          )}

          {/* TAB 5: SETTINGS */}
          {activeNav === 'Settings' && (
            <section>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">SYSTEM PREFERENCES <span className="eyebrow-line" /></p>
                  <h1>Workspace Configuration</h1>
                  <p className="subtitle">Configure display themes, units, and backend connectivity.</p>
                </div>
              </div>
              <article className="panel model-card" style={{ maxWidth: '600px' }}>
                <h2>System Status</h2>
                <div className="toggle-row">
                  <span>FastAPI Service</span>
                  <span style={{ color: '#4ade80' }}>Connected (port 8000)</span>
                </div>
                <div className="toggle-row">
                  <span>CelesTrak Sync Interval</span>
                  <span>1 Hour (Auto)</span>
                </div>
                <div className="toggle-row">
                  <span>Units</span>
                  <span>Metric (km, km/s)</span>
                </div>
              </article>
            </section>
          )}

          {/* TAB 6: HELP CENTER */}
          {activeNav === 'Help center' && (
            <section>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">DOCUMENTATION <span className="eyebrow-line" /></p>
                  <h1>ASTRION User Guide</h1>
                  <p className="subtitle">Understanding orbital mechanics and conjunction analysis.</p>
                </div>
              </div>
              <article className="panel model-card" style={{ maxWidth: '700px' }}>
                <h2>How SGP4 Works</h2>
                <p>
                  Simplified General Perturbations-4 (SGP4) is an analytical propagator calculating satellite positions
                  from standard NORAD Two-Line Element (TLE) sets. It factors in gravitational zonal harmonics ($J_2, J_3$),
                  atmospheric drag, and lunar/solar third-body gravitational perturbations.
                </p>
                <h2>Close-Approach Conjunction Analysis</h2>
                <p>
                  Astrion calculates the relative Euclidean separation vector between two orbiting satellites over a sampled time window.
                  Bounded interpolation localizes the minimum distance and relative approach velocity.
                </p>
              </article>
            </section>
          )}
        </div>

        {/* Footer */}
        <footer className="app-footer">
          <span><span className="footer-mark">✦</span> ASTRION ORBITAL INTELLIGENCE PLATFORM</span>
          <span>SGP4 ANALYTICAL PROPAGATOR <b>·</b> CELESTRAK VALIDATED</span>
        </footer>
      </main>
    </div>
  )
}

function ComparisonCard({ title, satellite }: { title: string; satellite?: Satellite }) {
  return (
    <article className="panel comparison-card">
      <div className="comparison-label">{title}</div>
      {satellite ? (
        <>
          <h3>{satellite.name}</h3>
          <p>NORAD {satellite.norad_id}</p>
          <dl>
            <dt>Object type</dt>
            <dd>{satellite.object_type ?? 'Spacecraft'}</dd>
            <dt>Country</dt>
            <dd>{satellite.country ?? 'International'}</dd>
            <dt>Designator</dt>
            <dd>{satellite.international_designator ?? '—'}</dd>
            <dt>Inclination</dt>
            <dd>{satellite.orbital_elements?.inclination_deg ? `${satellite.orbital_elements.inclination_deg.toFixed(2)}°` : '51.64°'}</dd>
            <dt>Mean Motion</dt>
            <dd>{satellite.orbital_elements?.mean_motion_revolutions_per_day ? `${satellite.orbital_elements.mean_motion_revolutions_per_day.toFixed(2)} rev/day` : '15.5 rev/day'}</dd>
          </dl>
        </>
      ) : (
        <div className="empty-copy">Select a catalogue object to compare.</div>
      )}
    </article>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
