import { http } from '@/services/http'
import type { SendLocationPayload, UpdateProfilePayload } from '@/types/api'
import type { Driver } from '@/types/driver'

export const driverApi = {
  async updateProfile(payload: UpdateProfilePayload): Promise<Driver> {
    const { data } = await http.patch<Driver>('/driver/profile', payload)
    return data
  },

  async setOnline(online: boolean): Promise<void> {
    //await http.post('/driver/status', { online })

    const { data } = await http.post('/driver/status', { online })
    return data
  },

  async sendLocation(payload: SendLocationPayload): Promise<void> {
    console.log(payload)

    await http.post('/driver/location', payload)
  },
}
