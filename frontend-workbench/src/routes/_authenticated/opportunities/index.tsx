import { createFileRoute } from '@tanstack/react-router'
import { SetadOpportunitiesPage } from '@/features/setad-workbench'

export const Route = createFileRoute('/_authenticated/opportunities/')({
  component: SetadOpportunitiesPage,
})
