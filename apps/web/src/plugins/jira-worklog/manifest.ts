import { CalendarIcon } from 'lucide-react';
import { lazy } from 'react';
import type { PluginManifest } from '@/shared/core/types';

export const jiraWorklogManifest: PluginManifest = {
  id: 'jira-worklog',
  name: 'plugin.jiraWorklog.name',
  icon: CalendarIcon,
  version: '1.0.0',
  enabled: true,

  routes: [
    {
      path: '/jira',
      label: 'nav.jiraManagement',
      component: lazy(() => import('./pages/calendar')),
    },
  ],

  navItems: [{ path: '/jira', label: 'nav.jiraManagement', icon: CalendarIcon, order: 10 }],

  dashboardCard: {
    component: lazy(() => import('./components/dashboard-card')),
    order: 10,
  },

  settings: [],

  requiredConnections: ['jira'],
};
