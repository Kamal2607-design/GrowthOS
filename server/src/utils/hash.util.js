import crypto from 'node:crypto';

export function createSha256Hash(
  value
) {
  return crypto
    .createHash('sha256')
    .update(value, 'utf8')
    .digest('hex');
}