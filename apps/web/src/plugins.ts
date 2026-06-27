import { eventBus } from '@/hub/core/event-bus';
import { registry } from '@/hub/core/plugin-registry';

// ════════════════════════════════════════════════════════════════
// Plugin Registration — add new plugins here
// ════════════════════════════════════════════════════════════════

// Template plugin (disabled by default — remove when real plugins added)
import '@/plugins/_template';

// Jira Worklog plugin — Unit 16
import '@/plugins/jira-worklog';

// Smart Worklog plugin — Unit 17
// import '@/plugins/smart-worklog';

// Reports plugin — future
// import '@/plugins/reports';

// ════════════════════════════════════════════════════════════════
// Plugin Lifecycle — call init() for each registered plugin
// ════════════════════════════════════════════════════════════════

for (const plugin of registry.getAll()) {
  if (plugin.enabled && plugin.init) {
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
  }
}
