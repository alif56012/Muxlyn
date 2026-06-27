import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '@/pages/settings/settings';

export const Route = createFileRoute('/_authed/settings')({
  component: SettingsPage,
});
