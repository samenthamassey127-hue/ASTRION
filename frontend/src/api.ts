export type Satellite = {
  norad_id: number
  name: string
  international_designator?: string | null
  object_type?: string | null
  country?: string | null
  orbital_elements?: {
    epoch: string
    inclination_deg: number
    raan_deg: number
    eccentricity: number
    argument_of_perigee_deg: number
    mean_anomaly_deg: number
    mean_motion_revolutions_per_day: number
  } | null
}

export type LiveSatellite = {
  norad_id: number
  name: string
  latitude: number
  longitude: number
  altitude_km: number
  speed_km_per_s: number
  country: string
  object_type: string
}

export type TelemetryPacket = {
  satellite_id: number
  name: string
  timestamp: string
  frequency_mhz: number
  snr_db: number
  battery_volts: number
  solar_watts: number
  doppler_khz: number
  lock_status: string
}

export type CatalogResponse = {
  status: 'placeholder' | 'available'
  satellites: Satellite[]
  source: string
  message: string
  fetched_at?: string | null
  stale?: boolean | null
}

export type PropagatedState = {
  timestamp: string
  frame?: 'TEME'
  position_km: [number, number, number]
  velocity_km_per_s: [number, number, number]
}

export type AnalysisResponse = {
  analysis_id?: string
  status: 'pending' | 'complete' | 'unavailable'
  primary_satellite_id?: number
  secondary_satellite_id?: number
  analysis_window_start?: string
  analysis_window_end?: string
  created_at?: string
  states?: PropagatedState[]
  separation_km?: number | null
  minimum_separation_km?: number | null
  closest_time?: string
  relative_speed_km_per_s?: number
  refinement_method?: string
  source?: string
  model?: string
  sampled?: boolean
  warnings?: string[]
  message?: string
}

export type AnalysisRequest = {
  primary_satellite_id: number
  secondary_satellite_id: number
  start_time: string
  end_time: string
  step_seconds: number
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!response.ok) throw new Error(`API request failed (${response.status})`)
  return response.json() as Promise<T>
}

export const api = {
  catalog: async (): Promise<CatalogResponse> => {
    let result = await request<CatalogResponse>('/api/catalog')
    if (!result.satellites || result.satellites.length === 0) {
      try {
        result = await request<CatalogResponse>('/api/catalog/refresh', { method: 'POST' })
      } catch (err) {
        console.warn('Could not auto-refresh catalog:', err)
      }
    }
    return result
  },
  refreshCatalog: () => request<CatalogResponse>('/api/catalog/refresh', { method: 'POST' }),
  liveSatellites: () => request<LiveSatellite[]>('/api/satellites/live'),
  telemetryFeed: () => request<TelemetryPacket[]>('/api/telemetry/feed'),
  submitAnalysis: (payload: AnalysisRequest) => request<AnalysisResponse>('/api/analysis', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
}
