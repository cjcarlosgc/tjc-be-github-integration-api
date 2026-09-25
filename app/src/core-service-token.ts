import { timingSafeEqual } from 'node:crypto';

export function isValidCoreServiceBearer(authorization: string | string[] | undefined, expected: string | undefined): boolean {
  const match = typeof authorization === 'string' ? /^Bearer ([^\s]+)$/.exec(authorization) : null;
  const actualBuffer = match ? Buffer.from(match[1]) : Buffer.alloc(0);
  const expectedBuffer = expected ? Buffer.from(expected) : Buffer.alloc(0);
  return actualBuffer.length > 0 && actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
