import { registry } from '@/hub/core/plugin-registry';
import { templateManifest } from './manifest';

if (templateManifest.enabled) {
  registry.register(templateManifest);
}
