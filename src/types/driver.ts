export interface Driver {
  id: string
  name: string
  email: string
  phone?: string
  car?: {
    brand: string
    model: string
    plate: string
    color: string
  }
  rating?: number // 4.98
  trips?: number // 1240
  balance?: number // 3250.50
}

export type DriverStatus = 'offline' | 'online' | 'enroute' | 'arrived' | 'in_ride'

export interface RideOrder {
  id: string
  from: { lat: number; lng: number; address: string }
  to: { lat: number; lng: number; address: string }
  price: number
  distanceKm: number
  durationMin: number
  passenger: { name: string; rating?: number; phone?: string }
  createdAt: number
}

export type RideState =
  | { kind: 'idle' }
  | { kind: 'offered'; order: RideOrder }
  | { kind: 'accepted'; order: RideOrder; status: 'enroute' | 'arrived' | 'in_ride' }
