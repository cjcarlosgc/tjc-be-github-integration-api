import { describe, expect, it } from 'vitest';
import { CheckCoordinationStore, type CheckIdentity } from './check-coordination.store.js';

const identity: CheckIdentity = { repositoryId: 'repo', appId: 'app', headSha: 'a'.repeat(40), name: 'Build' };
const requestHash = 'b'.repeat(64);

describe('CheckCoordinationStore process-local mutex', () => {
  it('allows only one concurrent claim for an exact identity', async () => {
    const store = new CheckCoordinationStore();
    const first = await store.claim(identity, requestHash);
    const secondClaim = store.claim(identity, requestHash);

    await store.transition(identity, first.leaseToken, 'ACTIVE', requestHash, '42');
    await expect(secondClaim).resolves.toMatchObject({ state: 'ACTIVE', checkId: '42' });
  });

  it('uses case-sensitive names as distinct mutex identities', async () => {
    const store = new CheckCoordinationStore();
    const reservation = await store.claim(identity, requestHash);
    const distinct = await store.claim({ ...identity, name: 'build' }, requestHash);

    expect(distinct.state).toBe('RESERVED');
    expect(distinct.leaseToken).not.toBe(reservation.leaseToken);
  });

  it.each([
    ['AMBIGUOUS', 'GITHUB_CHECK_IDENTITY_AMBIGUOUS', 409, false],
    ['CREATE_REJECTED', 'GITHUB_CHECK_CREATE_REJECTED', 422, false],
    ['ABANDONED', 'GITHUB_CHECK_COORDINATION_UNAVAILABLE', 503, false],
  ] as const)('replays terminal %s responses while this process lives', async (state, code, status, retryable) => {
    const store = new CheckCoordinationStore();
    const reservation = await store.claim(identity, requestHash);
    await store.transition(identity, reservation.leaseToken, state, requestHash, null);

    await expect(store.claim(identity, requestHash)).rejects.toMatchObject({ code, status, retryable });
    await expect(store.claim(identity, requestHash)).rejects.toMatchObject({ code, status, retryable });
  });

  it('forgets uncertain creation after a new process starts', async () => {
    const runningProcess = new CheckCoordinationStore();
    const reservation = await runningProcess.claim(identity, requestHash);
    await runningProcess.transition(identity, reservation.leaseToken, 'CREATE_UNKNOWN', requestHash, null);

    await expect(runningProcess.claim(identity, requestHash)).resolves.toMatchObject({ state: 'CREATE_UNKNOWN' });

    await expect(new CheckCoordinationStore().claim(identity, requestHash)).resolves.toMatchObject({ state: 'RESERVED', checkId: null });
  });

  it('rejects stale transitions and releases the lock only for the current claim', async () => {
    const store = new CheckCoordinationStore();
    const reservation = await store.claim(identity, requestHash);
    await store.transition(identity, reservation.leaseToken, 'ACTIVE', requestHash, '42');
    const current = await store.claim(identity, requestHash);

    await expect(store.transition(identity, reservation.leaseToken, 'CREATE_UNKNOWN', requestHash, null))
      .rejects.toMatchObject({ code: 'GITHUB_CHECK_COORDINATION_UNAVAILABLE', status: 503 });
    await store.transition(identity, current.leaseToken, 'ACTIVE', requestHash, '42');
  });
});

describe('CheckCoordinationStore: expulsión de entradas ociosas', () => {
  const DAY = 24 * 60 * 60 * 1000;

  it('descarta una entrada ACTIVE ociosa pasado el TTL y conserva la reciente', async () => {
    const store = new CheckCoordinationStore();
    let clock = 1_000_000;
    store.now = () => clock;
    const old = await store.claim(identity, requestHash);
    await store.transition(identity, old.leaseToken, 'ACTIVE', requestHash, '1');
    clock += DAY + 1;
    const recentIdentity = { ...identity, headSha: 'c'.repeat(40) };
    const recent = await store.claim(recentIdentity, requestHash);
    await store.transition(recentIdentity, recent.leaseToken, 'ACTIVE', requestHash, '2');

    expect(store.evictIdleActive()).toBe(1);
    expect(store.size).toBe(1);
  });

  it('nunca descarta estados de incertidumbre: protegen contra duplicados', async () => {
    const store = new CheckCoordinationStore();
    let clock = 1_000_000;
    store.now = () => clock;
    const reservation = await store.claim(identity, requestHash);
    await store.transition(identity, reservation.leaseToken, 'CREATE_UNKNOWN', requestHash, null);
    clock += 10 * DAY;

    expect(store.evictIdleActive()).toBe(0);
    expect(store.size).toBe(1);
  });

  it('no descarta una entrada bloqueada aunque sea vieja', async () => {
    const store = new CheckCoordinationStore();
    let clock = 1_000_000;
    store.now = () => clock;
    const held = await store.claim(identity, requestHash);
    await store.transition(identity, held.leaseToken, 'ACTIVE', requestHash, '1', false);
    clock += 10 * DAY;

    expect(store.evictIdleActive()).toBe(0);
  });
});
