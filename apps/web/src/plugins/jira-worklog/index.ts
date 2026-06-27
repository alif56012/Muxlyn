import { registry } from '@/hub/core/plugin-registry';
import { jiraWorklogManifest } from './manifest';

registry.register(jiraWorklogManifest);
