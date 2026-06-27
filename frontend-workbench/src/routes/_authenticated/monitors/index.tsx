import { createFileRoute } from '@tanstack/react-router'
import { SetadMonitorsPage } from '@/features/setad-workbench'

export const Route = createFileRoute('/_authenticated/monitors/')({
  component: SetadMonitorsPage,
})
