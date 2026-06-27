import { createFileRoute } from '@tanstack/react-router';
import HistoryPage from '@/plugins/jira-worklog/pages/history';

export const Route = createFileRoute('/_authed/worklog/history')({
  component: HistoryPage,
});
