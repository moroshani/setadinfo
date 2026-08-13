import { useRouterState } from '@tanstack/react-router'

export function NavigationProgress() {
  const state = useRouterState()
  const isLoading = state.status === 'pending'

  if (!isLoading) return null

  return (
    <div
      aria-hidden='true'
      className='fixed inset-x-0 top-0 z-100 h-0.5 overflow-hidden bg-transparent'
    >
      <div className='h-full w-1/3 animate-pulse rounded-e-full bg-muted-foreground' />
    </div>
  )
}
