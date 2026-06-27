async function getCryptoKey(encryptionKey: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(encryptionKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
  return crypto.subtle.importKey('raw', hashBuffer, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptToken(plaintext: string, encryptionKey: string): Promise<string> {
  const key = await getCryptoKey(encryptionKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext),
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export function validateServiceType(serviceType: string): void {
  const valid = ['jira', 'google'];
  if (!valid.includes(serviceType)) {
    throw new Error(`Invalid service type: ${serviceType}. Must be one of: ${valid.join(', ')}`);
  }
}
