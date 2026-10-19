import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Text, Line } from '@react-three/drei'
import { useMemo, useRef, useState } from 'react'
import type { AnalysisResponse, PropagatedState } from './api'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

type Marker = { id: string; label: string; position: [number, number, number]; color: string; source: 'API' | 'DEMO' }

const demoMarkers: Marker[] = [
  { id: 'demo-a', label: 'DEMO / ALPHA', position: [2.35, 1.3, 1.45], color: '#b69cff', source: 'DEMO' },
  { id: 'demo-b', label: 'DEMO / BETA', position: [-2.1, -1.1, 1.8], color: '#62d7ff', source: 'DEMO' },
]

function latLonToPoint(lat: number, lon: number, radius = 2.05): [number, number, number] {
  const phi = (90 - lat) * Math.PI / 180
  const theta = (lon + 180) * Math.PI / 180
  return [-(radius * Math.sin(phi) * Math.cos(theta)), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta)]
}

function OrbitRing({ radius, tilt, color }: { radius: number; tilt: [number, number, number]; color: string }) {
  const points = useMemo(() => Array.from({ length: 129 }, (_, index) => {
    const angle = (index / 128) * Math.PI * 2
    return [radius * Math.cos(angle), radius * Math.sin(angle), 0] as [number, number, number]
  }), [radius])
  return <Line points={points} color={color} lineWidth={0.7} transparent opacity={0.62} rotation={tilt} />
}

function Earth({ onSelect }: { onSelect: (marker: Marker) => void }) {
  const earth = useRef<THREE.Group>(null)
  useFrame((_, delta) => { if (earth.current) earth.current.rotation.y += delta * 0.035 })
  const grid = useMemo(() => Array.from({ length: 7 }, (_, index) => index * Math.PI / 6), [])
  return <group ref={earth}>
    <mesh>
      <sphereGeometry args={[2, 64, 48]} />
      <meshStandardMaterial color="#183a73" roughness={0.72} metalness={0.08} />
    </mesh>
    <mesh scale={1.012}>
      <sphereGeometry args={[2, 32, 20]} />
      <meshBasicMaterial color="#4f8cf7" wireframe transparent opacity={0.22} />
    </mesh>
    <mesh scale={1.08}>
      <sphereGeometry args={[2, 48, 32]} />
      <meshBasicMaterial color="#5c8fff" transparent opacity={0.075} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
    </mesh>
    {grid.map((angle) => <mesh key={`lat-${angle}`} rotation={[angle, 0, 0]}>
      <torusGeometry args={[2.012, 0.006, 6, 96]} />
      <meshBasicMaterial color="#70bfff" transparent opacity={angle === Math.PI / 2 ? 0.9 : 0.28} />
    </mesh>)}
    <mesh rotation={[0, 0, 0]}><torusGeometry args={[2.018, 0.012, 8, 128]} /><meshBasicMaterial color="#8ad9ff" /></mesh>
    {demoMarkers.map((marker) => <MarkerMesh key={marker.id} marker={marker} onSelect={onSelect} />)}
  </group>
}

function MarkerMesh({ marker, onSelect }: { marker: Marker; onSelect: (marker: Marker) => void }) {
  const [hovered, setHovered] = useState(false)
  return <group position={marker.position} onClick={(event) => { event.stopPropagation(); onSelect(marker) }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
    <mesh scale={hovered ? 1.5 : 1}><sphereGeometry args={[0.075, 16, 16]} /><meshBasicMaterial color={marker.color} /></mesh>
    <mesh scale={hovered ? 2.4 : 1.8}><ringGeometry args={[0.08, 0.1, 24]} /><meshBasicMaterial color={marker.color} transparent opacity={0.55} side={THREE.DoubleSide} /></mesh>
    {hovered && <Text position={[0.15, 0.12, 0]} fontSize={0.12} color={marker.color} anchorX="left">{marker.label}</Text>}
  </group>
}

function ApiMarkers({ states, onSelect }: { states: PropagatedState[]; onSelect: (marker: Marker) => void }) {
  const markers = states.length ? states.filter((_, index) => index % Math.max(1, Math.floor(states.length / 10)) === 0).map((state, index) => {
    const magnitude = Math.max(...state.position_km.map(Math.abs), 1)
    const position: [number, number, number] = [state.position_km[0] / magnitude * 2.85, state.position_km[1] / magnitude * 2.85, state.position_km[2] / magnitude * 2.85]
    return { id: `api-${index}`, label: `API SAMPLE ${index + 1}`, position, color: '#ffd36b', source: 'API' as const }
  }) : []
  return <>{markers.map((marker) => <MarkerMesh key={marker.id} marker={marker} onSelect={onSelect} />)}</>
}

function CameraActions({ controls }: { controls: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree()
  return <div className="scene-controls"><button aria-label="Zoom in" onClick={() => { camera.position.multiplyScalar(0.8); controls.current?.update() }}>＋</button><button aria-label="Zoom out" onClick={() => { camera.position.multiplyScalar(1.25); controls.current?.update() }}>−</button><button aria-label="Reset camera" onClick={() => controls.current?.reset()}>↺</button></div>
}

export function EarthScene({ analysis, view }: { analysis: AnalysisResponse | null; view: string }) {
  const controls = useRef<OrbitControlsImpl | null>(null)
  const states = analysis?.states ?? []
  const [selected, setSelected] = useState<Marker | null>(null)
  const [timeIndex, setTimeIndex] = useState(0)
  const apiState = states[timeIndex]
  return <div className="earth-scene" aria-label="Interactive ASTRION 3D orbital visualization">
    <Canvas camera={{ position: [0, 1.2, 7.2], fov: 42 }} dpr={[1, 2]}>
      <color attach="background" args={['#070b17']} /><ambientLight intensity={0.32} /><directionalLight position={[4, 3, 5]} intensity={2.8} color="#b7d8ff" />
      <Stars radius={55} depth={35} count={1400} factor={2.2} saturation={0.1} fade speed={0.25} />
      <OrbitRing radius={2.75} tilt={[0.55, 0.2, 0]} color="#806cf0" /><OrbitRing radius={3.55} tilt={[-0.3, 0.7, 0.4]} color="#3b9dcb" />
      <Earth onSelect={setSelected} /><ApiMarkers states={states} onSelect={setSelected} />
      <OrbitControls ref={controls} enablePan={false} minDistance={4} maxDistance={13} autoRotate={!selected} autoRotateSpeed={0.18} />
    </Canvas>
    <CameraActions controls={controls} />
    <div className="scene-badge"><span className={states.length ? 'status-live' : 'status-demo'} />{states.length ? 'API PROPAGATED STATES' : 'DEMO VISUALIZATION · NOT SCIENTIFIC DATA'}</div>
    <div className="scene-legend"><span><i className="legend-earth" />EARTH / REFERENCE</span><span><i className="legend-orbit" />ORBIT PATH</span><span><i className="legend-marker" />{states.length ? 'API SAMPLE' : 'DEMO MARKER'}</span></div>
    {selected && <div className="marker-inspector"><button onClick={() => setSelected(null)} aria-label="Close marker details">×</button><strong>{selected.label}</strong><span>{selected.source === 'API' ? 'Returned propagated state' : 'Illustrative geometry only'}</span></div>}
    <div className="time-overlay"><div><span>TIME INDEX</span><strong>{states.length ? `${timeIndex + 1} / ${states.length}` : 'DEMO TIMELINE'}</strong></div><input type="range" min="0" max={Math.max(states.length - 1, 10)} value={states.length ? timeIndex : 0} disabled={!states.length} onChange={(event) => setTimeIndex(Number(event.target.value))} /><small>{apiState?.timestamp ?? 'No API timestamp available'}</small></div>
    <div className="scene-view-label">{view.toUpperCase()} · DRAG TO ORBIT · SCROLL TO ZOOM</div>
  </div>
}
