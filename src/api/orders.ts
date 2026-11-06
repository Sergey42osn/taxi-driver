import { http } from '@/services/http'
import type { RideOrder } from '@/types/driver'

export const ordersApi = {
  async list(): Promise<RideOrder[]> {
    const { data } = await http.get<RideOrder[]>('/orders')
    return data
  },

  async accept(orderId: string): Promise<RideOrder> {
    const { data } = await http.post<RideOrder>(`/orders/${orderId}/accept`)
    return data
  },

  async decline(orderId: string): Promise<void> {
    await http.post(`/orders/${orderId}/decline`)
  },

  async updateStatus(
    orderId: string,
    status: 'enroute' | 'arrived' | 'in_ride' | 'finished',
  ): Promise<RideOrder> {
    const { data } = await http.patch<RideOrder>(`/orders/${orderId}/status`, { status })
    return data
  },
}
