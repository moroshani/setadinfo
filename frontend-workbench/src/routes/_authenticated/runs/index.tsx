import { createFileRoute } from '@tanstack/react-router'
import { SetadRunsPage } from '@/features/setad-workbench'

export const Route = createFileRoute('/_authenticated/runs/')({
  component: SetadRunsPage,
})
