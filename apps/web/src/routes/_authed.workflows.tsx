import { createFileRoute } from '@tanstack/react-router';
import { WorkflowList } from '@/features/workflow/workflow-list';

function WorkflowsRoute() {
  const params = new URLSearchParams(window.location.search);
  return <WorkflowList connectionId={params.get('c') ?? undefined} />;
}

export const Route = createFileRoute('/_authed/workflows')({
  component: WorkflowsRoute,
});
