import { createFileRoute } from '@tanstack/react-router';
import SearchPage from '@/plugins/jira-worklog/pages/search';

export const Route = createFileRoute('/_authed/worklog')({
  component: SearchPage,
});
