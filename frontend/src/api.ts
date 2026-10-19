export type Satellite = {
  norad_id: number
  name: string
  international_designator?: string | null
  object_type?: string | null
  country?: string | null
  orbital_elements?: Record<string, unknown> | null
}

export type CatalogResponse = {
  status: 'placeholder' | 'available'
  satellites: Satellite[]
  source: string
  message: string
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
  catalog: () => request<CatalogResponse>('/api/catalog'),
  submitAnalysis: (payload: AnalysisRequest) => request<AnalysisResponse>('/api/analysis', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
}
