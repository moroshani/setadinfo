import { createFileRoute } from '@tanstack/react-router'
import { SetadSearchPage } from '@/features/setad-workbench/search-page'

export const Route = createFileRoute('/_authenticated/search/')({
  component: SetadSearchPage,
})
