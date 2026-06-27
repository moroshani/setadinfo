import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { getCurrentUser } from '@/lib/setad-api'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    try {
      const me = await getCurrentUser()
      useAuthStore.getState().auth.setUser({
        id: me.id,
        username: me.username,
        role: me.role,
      })
    } catch {
      useAuthStore.getState().auth.reset()
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }
  },
  component: AuthenticatedLayout,
})
