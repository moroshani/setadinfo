import { createFileRoute } from '@tanstack/react-router'
import { SetadOverview } from '@/features/setad-workbench'

export const Route = createFileRoute('/_authenticated/')({
  component: SetadOverview,
})
