import axios from 'axios'

const API_BASE = '/api/v1'

const api = axios.create({
  baseURL: API_BASE,
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
}

export interface AuthResponse {
  user: User
  token: string
}

export interface Movie {
  id: number
  title: string
  description: string
  releaseDate: string
  duration: number
  rating: number
  genre: string
}

export interface ShowTime {
  hallId: number
  movieId: number
  startTime: string
  endTime: string
}

export interface Hall {
  id: number
  name: string
  totalSeats: number
}

export interface Reservation {
  id: number
  userId: number
  hallId: number
  movieId: number
  status: 'pending' | 'confirmed' | 'cancelled'
  totalPrice: number
  seats: Array<{
    id: number
    seatNumber: string
    category: string
  }>
}

// Auth
export const authAPI = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<AuthResponse>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),
}

// Movies
export const moviesAPI = {
  getAll: () => api.get<Movie[]>('/movies'),
  getById: (id: number) => api.get<Movie>(`/movies/${id}`),
  getShowtimes: (movieId: number) =>
    api.get<ShowTime[]>(`/movies/${movieId}/showtimes`),
}

// Halls
export const hallsAPI = {
  getAll: () => api.get<Hall[]>('/halls'),
  getById: (id: number) => api.get<Hall>(`/halls/${id}`),
  getLayout: (hallId: number) =>
    api.get(`/halls/${hallId}/layout`),
  getSeatChart: (hallId: number) =>
    api.get(`/halls/${hallId}/seat-chart`),
}

// Reservations
export const reservationsAPI = {
  getAll: () => api.get<Reservation[]>('/reservations'),
  getById: (id: number) => api.get<Reservation>(`/reservations/${id}`),
  create: (hallId: number, data: {
    movieId: number
    startTime: string
    seatIds: number[]
  }) =>
    api.post<Reservation>(`/reservations/${hallId}`, data),
  confirm: (id: number) =>
    api.patch<Reservation>(`/reservations/${id}/confirm`),
  cancel: (id: number) =>
    api.patch<Reservation>(`/reservations/${id}/cancel`),
}

export default api
