import { createFileRoute } from '@tanstack/react-router'
import { SetadUpdatesPage } from '@/features/setad-workbench'

export const Route = createFileRoute('/_authenticated/updates/')({
  component: SetadUpdatesPage,
})
