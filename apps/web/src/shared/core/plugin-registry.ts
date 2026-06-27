import type {
  PluginDashboardCard,
  PluginManifest,
  PluginNavItem,
  PluginRegistry as PluginRegistryInterface,
  PluginRoute,
  PluginSettingsSection,
} from './types';

class PluginRegistry implements PluginRegistryInterface {
  private plugins = new Map<string, PluginManifest>();
  private initialized = new Set<string>();

  register(manifest: PluginManifest): void {
    if (this.plugins.has(manifest.id)) {
      return;
    }
    this.plugins.set(manifest.id, manifest);
    this.initialized.delete(manifest.id);
  }

  isInitialized(id: string): boolean {
    return this.initialized.has(id);
  }

  markInitialized(id: string): void {
    this.initialized.add(id);
  }

  getRoutes(): PluginRoute[] {
    const routes: PluginRoute[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled) {
        routes.push(...plugin.routes);
      }
    }
    return routes;
  }

  getNavItems(): PluginNavItem[] {
    const items: PluginNavItem[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled) {
        items.push(...plugin.navItems);
      }
    }
    return items.sort((a, b) => a.order - b.order);
  }

  getDashboardCards(): PluginDashboardCard[] {
    const cards: PluginDashboardCard[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled && plugin.dashboardCard) {
        cards.push(plugin.dashboardCard);
      }
    }
    return cards.sort((a, b) => a.order - b.order);
  }

  getSettings(): PluginSettingsSection[] {
    const sections: PluginSettingsSection[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled && plugin.settings) {
        sections.push(...plugin.settings);
      }
    }
    return sections.sort((a, b) => a.order - b.order);
  }

  getPlugin(id: string): PluginManifest | undefined {
    return this.plugins.get(id);
  }

  getAll(): PluginManifest[] {
    return Array.from(this.plugins.values()).filter((p) => p.enabled);
  }
}

export const registry = new PluginRegistry();
