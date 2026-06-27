import { createFileRoute } from '@tanstack/react-router'
import { SetadMonitorDetailPage } from '@/features/setad-workbench'

export const Route = createFileRoute('/_authenticated/monitors/$taskId')({
  component: RouteComponent,
})

// eslint-disable-next-line react-refresh/only-export-components
function RouteComponent() {
  const { taskId } = Route.useParams()
  return <SetadMonitorDetailPage taskId={taskId} />
}
