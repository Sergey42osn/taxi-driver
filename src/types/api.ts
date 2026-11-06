export interface LoginPayload {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  refreshToken?: string
  driver: {
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
    rating?: number
    trips?: number
    balance?: number
  }
}

export interface RegisterPayload extends LoginPayload {
  name: string
  phone?: string
}

export interface UpdateProfilePayload {
  name?: string
  phone?: string
  car?: {
    brand?: string
    model?: string
    plate?: string
    color?: string
  }
}
