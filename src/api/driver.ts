import { http } from '@/services/http'
import type { UpdateProfilePayload } from '@/types/api'
import type { Driver } from '@/types/driver'

export const driverApi = {
  async updateProfile(payload: UpdateProfilePayload): Promise<Driver> {
    const { data } = await http.patch<Driver>('/driver/profile', payload)
    return data
  },

  async setOnline(online: boolean): Promise<void> {
    await http.post('/driver/status', { online })
  },
}
