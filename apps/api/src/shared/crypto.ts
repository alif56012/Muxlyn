const encoder = new TextEncoder();

export async function getCryptoKey(encryptionKey: string, userId?: string): Promise<CryptoKey> {
  const keyMaterial = userId ? `${encryptionKey}:${userId}` : encryptionKey;
  const keyData = encoder.encode(keyMaterial);
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
  return crypto.subtle.importKey('raw', hashBuffer, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptToken(plaintext: string, encryptionKey: string, userId?: string): Promise<string> {
  const key = await getCryptoKey(encryptionKey, userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
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

export { encoder };
