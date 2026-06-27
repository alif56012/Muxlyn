import { encryptToken as _encryptToken } from '../../shared/crypto';

export { encryptToken as encryptToken } from '../../shared/crypto';

export { getCryptoKey } from '../../shared/crypto';

export function validateServiceType(serviceType: string): void {
  const valid = [
    'jira',
    'google',
    'custom',
    'monitor',
    'database',
    'cicd',
    'docs',
    'chat',
    'api',
    'storage',
  ];
  if (!valid.includes(serviceType)) {
    throw new Error(`Invalid service type: ${serviceType}. Must be one of: ${valid.join(', ')}`);
  }
}
