import { lazy } from 'react';
import type { PluginManifest } from '@/hub/core/types';
import { CalendarIcon, ClockIcon, ListIcon } from 'lucide-react';

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
    {
      path: '/worklog',
      label: 'nav.worklog',
      component: lazy(() => import('./pages/search')),
    },
    {
      path: '/worklog/history',
      label: 'nav.worklogHistory',
      component: lazy(() => import('./pages/history')),
    },
  ],

  navItems: [
    { path: '/jira', label: 'nav.jiraManagement', icon: CalendarIcon, order: 10 },
    { path: '/worklog', label: 'nav.worklog', icon: ClockIcon, order: 20 },
  ],

  dashboardCard: {
    component: lazy(() => import('./components/dashboard-card')),
    order: 10,
  },

  settings: [],

  requiredConnections: ['jira'],
  init({ events }) {
    events.on('account:switched', () => {
      // handled by react-query cache invalidation
    });
  },
};
