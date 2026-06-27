import { eventBus } from '@/shared/core/event-bus';
import { registry } from '@/shared/core/plugin-registry';

// ════════════════════════════════════════════════════════════════
// Plugin Registration — add new plugins here
// ════════════════════════════════════════════════════════════════

// Template plugin (disabled by default — remove when real plugins added)
import '@/plugins/_template';

// Jira Worklog plugin — Unit 16
import '@/plugins/jira-worklog';

// Reports plugin — future
// import '@/plugins/reports';

// ════════════════════════════════════════════════════════════════
// Plugin Lifecycle — call init() for each registered plugin
// ════════════════════════════════════════════════════════════════

for (const plugin of registry.getAll()) {
  if (plugin.enabled && plugin.init && !registry.isInitialized(plugin.id)) {
    registry.markInitialized(plugin.id);
    try {
      plugin.init({
        registry,
        events: eventBus,
        activeJiraConnection: null,
        activeGoogleConnection: null,
        locale: 'en',
        setLocale: () => {},
        t: (key: string) => key,
        session: null,
      });
    } catch (err) {
      console.error(`[Plugins] Failed to init "${plugin.id}":`, err);
    }
  }
}
