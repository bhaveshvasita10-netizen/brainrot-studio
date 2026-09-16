import crypto from 'node:crypto';

function keyBytes() {
  const raw = process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('YOUTUBE_TOKEN_ENCRYPTION_KEY is not configured.');
  const key = Buffer.from(raw, /^[0-9a-fA-F]{64}$/.test(raw) ? 'hex' : 'base64');
  if (key.length !== 32) throw new Error('YOUTUBE_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.');
  return key;
}

export function encryptSecret(value: string) {
  const key = keyBytes();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map(v => v.toString('base64url')).join('.');
}

export function decryptSecret(value: string) {
  const key = keyBytes();
  const [ivRaw, tagRaw, cipherRaw] = value.split('.');
  if (!ivRaw || !tagRaw || !cipherRaw) throw new Error('Invalid encrypted token.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(cipherRaw, 'base64url')), decipher.final()]).toString('utf8');
}
