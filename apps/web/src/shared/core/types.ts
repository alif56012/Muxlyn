import type { LucideIcon } from 'lucide-react';
import type { ComponentType } from 'react';
import type { eventBus } from './event-bus';

export type ServiceType = 'jira' | 'google' | (string & {});

export interface PluginRoute {
  path: string;
  component: ComponentType;
  label: string;
  exact?: boolean;
  children?: PluginRoute[];
}

export interface PluginNavItem {
  path: string;
  label: string;
  icon?: LucideIcon;
  order: number;
}

export interface PluginDashboardCard {
  component: ComponentType<DashboardCardProps>;
  order: number;
}

export interface PluginSettingsSection {
  id: string;
  label: string;
  icon?: LucideIcon;
  component: ComponentType;
  order: number;
}

export interface PluginManifest {
  id: string;
  name: string;
  icon?: LucideIcon;
  version: string;
  enabled: boolean;
  routes: PluginRoute[];
  navItems: PluginNavItem[];
  dashboardCard?: PluginDashboardCard;
  settings?: PluginSettingsSection[];
  requiredConnections: ServiceType[];
  init?: (ctx: HubContextValue) => void | Promise<void>;
}

export interface ServiceConnection {
  id: string;
  serviceType: ServiceType;
  displayName: string;
  url?: string;
  status: 'active' | 'expired' | 'revoked';
  tags: string[];
  description?: string;
  pinned: boolean;
  sortOrder: number;
  groupId?: string;
  healthEnabled: boolean;
  healthInterval: number;
  healthStatus?: 'alive' | 'slow' | 'down' | 'unknown';
  healthLastChecked?: string;
  metadata: Record<string, unknown>;
  isActive: boolean;
}

export interface ServiceGroup {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  sortOrder: number;
  collapsed: boolean;
}

export interface ServiceCredential {
  id: string;
  keyName: string;
  createdAt: string;
}

export interface DashboardCardProps {
  connection?: ServiceConnection | null;
  summary?: DashboardSummary;
}

export interface DashboardSummary {
  status: 'connected' | 'not_connected';
  stats?: string;
}

export interface HubContextValue {
  registry: PluginRegistry;
  events: typeof eventBus;
  activeJiraConnection: ServiceConnection | null;
  activeGoogleConnection: ServiceConnection | null;
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  session: Record<string, unknown> | null;
}

export interface PluginRegistry {
  register(manifest: PluginManifest): void;
  isInitialized(id: string): boolean;
  markInitialized(id: string): void;
  getRoutes(): PluginRoute[];
  getNavItems(): PluginNavItem[];
  getDashboardCards(): PluginDashboardCard[];
  getSettings(): PluginSettingsSection[];
  getPlugin(id: string): PluginManifest | undefined;
  getAll(): PluginManifest[];
}
