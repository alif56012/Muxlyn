import { createFileRoute } from '@tanstack/react-router';
import CalendarPage from '@/plugins/jira-worklog/pages/calendar';

export const Route = createFileRoute('/_authed/jira')({
  component: CalendarPage,
});
