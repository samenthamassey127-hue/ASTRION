import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Line } from '@react-three/drei'
import { useMemo, useRef, useState } from 'react'
import type { AnalysisResponse, PropagatedState } from './api'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

type Marker = { id: string; label: string; position: [number, number, number]; color: string; source: 'API' | 'DEMO' }

const demoMarkers: Marker[] = [
  { id: 'demo-iss', label: 'ISS (ZARYA)', position: [2.35, 1.1, 1.25], color: '#4ade80', source: 'DEMO' },
  { id: 'demo-css', label: 'CSS (TIANHE)', position: [-2.1, -0.9, 1.6], color: '#fbbf24', source: 'DEMO' },
  { id: 'demo-hubble', label: 'HST (HUBBLE)', position: [1.6, -1.8, 1.1], color: '#60a5fa', source: 'DEMO' },
]

function OrbitRing({ radius, tilt, color }: { radius: number; tilt: [number, number, number]; color: string }) {
  const points = useMemo(() => Array.from({ length: 129 }, (_, index) => {
    const angle = (index / 128) * Math.PI * 2
    return [radius * Math.cos(angle), radius * Math.sin(angle), 0] as [number, number, number]
  }), [radius])
  return <Line points={points} color={color} lineWidth={1} transparent opacity={0.5} rotation={tilt} />
}

function Earth({ onSelect }: { onSelect: (marker: Marker) => void }) {
  const earth = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (earth.current) earth.current.rotation.y += delta * 0.04
  })
  const grid = useMemo(() => Array.from({ length: 7 }, (_, index) => index * Math.PI / 6), [])

  return (
    <group ref={earth}>
      {/* Earth Surface Sphere */}
      <mesh>
        <sphereGeometry args={[2, 64, 48]} />
        <meshStandardMaterial color="#13274a" roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Atmosphere Glow */}
      <mesh scale={1.015}>
        <sphereGeometry args={[2, 32, 24]} />
        <meshBasicMaterial color="#3875d9" wireframe transparent opacity={0.25} />
      </mesh>
      <mesh scale={1.08}>
        <sphereGeometry args={[2, 48, 32]} />
        <meshBasicMaterial color="#4d88ff" transparent opacity={0.08} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Latitudinal Grids */}
      {grid.map((angle) => (
        <mesh key={`lat-${angle}`} rotation={[angle, 0, 0]}>
          <torusGeometry args={[2.012, 0.005, 6, 96]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={angle === Math.PI / 2 ? 0.8 : 0.22} />
        </mesh>
      ))}
      {/* Equator */}
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[2.018, 0.01, 8, 128]} />
        <meshBasicMaterial color="#93c5fd" />
      </mesh>
      {demoMarkers.map((marker) => (
        <MarkerMesh key={marker.id} marker={marker} onSelect={onSelect} />
      ))}
    </group>
  )
}

function MarkerMesh({ marker, onSelect }: { marker: Marker; onSelect: (marker: Marker) => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <group
      position={marker.position}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(marker)
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh scale={hovered ? 1.6 : 1}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color={marker.color} />
      </mesh>
      <mesh scale={hovered ? 2.5 : 1.8}>
        <ringGeometry args={[0.09, 0.11, 24]} />
        <meshBasicMaterial color={marker.color} transparent opacity={0.65} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function ApiMarkers({ states, onSelect }: { states: PropagatedState[]; onSelect: (marker: Marker) => void }) {
  const markers = useMemo(() => {
    if (!states.length) return []
    return states
      .filter((_, index) => index % Math.max(1, Math.floor(states.length / 12)) === 0)
      .map((state, index) => {
        const magnitude = Math.max(...state.position_km.map(Math.abs), 1)
        const position: [number, number, number] = [
          (state.position_km[0] / magnitude) * 2.85,
          (state.position_km[1] / magnitude) * 2.85,
          (state.position_km[2] / magnitude) * 2.85,
        ]
        return {
          id: `api-${index}`,
          label: `STATE ${index + 1} (${new Date(state.timestamp).toLocaleTimeString()})`,
          position,
          color: '#fbbf24',
          source: 'API' as const,
        }
      })
  }, [states])

  return (
    <>
      {markers.map((marker) => (
        <MarkerMesh key={marker.id} marker={marker} onSelect={onSelect} />
      ))}
    </>
  )
}

function CameraActions({ controls }: { controls: React.RefObject<OrbitControlsImpl | null> }) {
  const handleZoomIn = () => {
    if (!controls.current) return
    controls.current.object.position.multiplyScalar(0.8)
    controls.current.update()
  }
  const handleZoomOut = () => {
    if (!controls.current) return
    controls.current.object.position.multiplyScalar(1.25)
    controls.current.update()
  }
  const handleReset = () => {
    controls.current?.reset()
  }

  return (
    <div className="scene-controls">
      <button aria-label="Zoom in" onClick={handleZoomIn}>＋</button>
      <button aria-label="Zoom out" onClick={handleZoomOut}>−</button>
      <button aria-label="Reset camera" onClick={handleReset}>↺</button>
    </div>
  )
}

export function EarthScene({ analysis, view }: { analysis: AnalysisResponse | null; view: string }) {
  const controls = useRef<OrbitControlsImpl | null>(null)
  const states = analysis?.states ?? []
  const [selected, setSelected] = useState<Marker | null>(null)
  const [timeIndex, setTimeIndex] = useState(0)
  const apiState = states[timeIndex]

  return (
    <div className="earth-scene" aria-label="Interactive ASTRION 3D orbital visualization">
      <Canvas camera={{ position: [0, 1.2, 7.2], fov: 42 }} dpr={[1, 2]}>
        <color attach="background" args={['#070b17']} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[4, 3, 5]} intensity={2.8} color="#b7d8ff" />
        <Stars radius={55} depth={35} count={1200} factor={2} saturation={0.1} fade speed={0.25} />
        <OrbitRing radius={2.75} tilt={[0.55, 0.2, 0]} color="#4ade80" />
        <OrbitRing radius={3.55} tilt={[-0.3, 0.7, 0.4]} color="#fbbf24" />
        <Earth onSelect={setSelected} />
        <ApiMarkers states={states} onSelect={setSelected} />
        <OrbitControls
          ref={controls}
          enablePan={false}
          minDistance={3.5}
          maxDistance={14}
          autoRotate={!selected}
          autoRotateSpeed={0.25}
        />
      </Canvas>
      <CameraActions controls={controls} />
      <div className="scene-badge">
        <span className={states.length ? 'status-live' : 'status-demo'} />
        {states.length ? 'API SGP4 EPHEMERIDES' : 'REAL-TIME 3D ORBIT TRACKER'}
      </div>
      <div className="scene-legend">
        <span><i className="legend-earth" />EARTH</span>
        <span><i className="legend-orbit" />ORBIT PLANE</span>
        <span><i className="legend-marker" />{states.length ? 'SGP4 SAMPLE' : 'TARGET'}</span>
      </div>
      {selected && (
        <div className="marker-inspector">
          <button onClick={() => setSelected(null)} aria-label="Close details">×</button>
          <strong>{selected.label}</strong>
          <span>{selected.source === 'API' ? 'Propagated orbital coordinate' : 'Live tracked orbital object'}</span>
        </div>
      )}
      <div className="time-overlay">
        <div>
          <span>SAMPLE STEP</span>
          <strong>{states.length ? `${timeIndex + 1} / ${states.length}` : 'REAL-TIME'}</strong>
        </div>
        <input
          type="range"
          min="0"
          max={Math.max(states.length - 1, 10)}
          value={states.length ? timeIndex : 0}
          disabled={!states.length}
          onChange={(event) => setTimeIndex(Number(event.target.value))}
        />
        <small>{apiState?.timestamp ? new Date(apiState.timestamp).toUTCString() : 'Active SGP4 propagation window'}</small>
      </div>
      <div className="scene-view-label">{view.toUpperCase()} · DRAG TO ROTATE · SCROLL TO ZOOM</div>
    </div>
  )
}
