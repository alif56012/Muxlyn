import { createFileRoute } from '@tanstack/react-router';
import { WorkflowEditor } from '@/features/workflow/workflow-editor';

export const Route = createFileRoute('/_authed/workflows_/editor')({
  component: WorkflowEditor,
});
