import type {
  PluginManifest,
  PluginRoute,
  PluginNavItem,
  PluginDashboardCard,
  PluginSettingsSection,
  PluginRegistry as PluginRegistryInterface,
} from "./types";

class PluginRegistry implements PluginRegistryInterface {
  private plugins = new Map<string, PluginManifest>();

  register(manifest: PluginManifest): void {
    if (this.plugins.has(manifest.id)) {
      throw new Error(`Plugin "${manifest.id}" already registered`);
    }
    this.plugins.set(manifest.id, manifest);
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
