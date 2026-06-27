import { createFileRoute } from '@tanstack/react-router'
import { SetadRecipientsPage } from '@/features/setad-workbench'

export const Route = createFileRoute('/_authenticated/recipients/')({
  component: SetadRecipientsPage,
})
