import { Injectable } from '@nestjs/common';
import { checkCoordinationUnavailable, checkCreateRejected, checkIdentityAmbiguous } from './errors.js';

export type CheckState = 'RESERVED' | 'CREATE_UNKNOWN' | 'CREATE_REJECTED' | 'ACTIVE' | 'UPDATE_UNKNOWN' | 'RECONCILIATION_REQUIRED' | 'AMBIGUOUS' | 'ABANDONED';
export interface CheckIdentity { repositoryId: string; appId: string; headSha: string; name: string }
export interface CheckReservation { state: CheckState; checkId: string | null; requestHash: string | null; leaseToken: string }

interface Entry {
  state: CheckState;
  checkId: string | null;
  requestHash: string | null;
  token: number;
  locked: boolean;
  waiters: Array<() => void>;
}

@Injectable()
export class CheckCoordinationStore {
  private readonly entries = new Map<string, Entry>();
  private tokenSequence = 0;

  async claim(identity: CheckIdentity, requestHash: string): Promise<CheckReservation> {
    const key = identityKey(identity);
    let entry = this.entries.get(key);
    if (!entry) {
      entry = { state: 'RESERVED', checkId: null, requestHash, token: 0, locked: false, waiters: [] };
      this.entries.set(key, entry);
    }

    await acquire(entry);
    try {
      if (entry.state === 'AMBIGUOUS') throw checkIdentityAmbiguous();
      if (entry.state === 'ABANDONED') throw checkCoordinationUnavailable(false);

      if (entry.state === 'CREATE_REJECTED') {
        if (entry.requestHash === requestHash) throw checkCreateRejected();
        entry.state = 'RESERVED';
        entry.requestHash = requestHash;
        entry.checkId = null;
      }
      if (['CREATE_UNKNOWN', 'UPDATE_UNKNOWN', 'RECONCILIATION_REQUIRED'].includes(entry.state) && entry.requestHash !== requestHash) {
        throw checkCoordinationUnavailable();
      }

      entry.token = ++this.tokenSequence;
      return {
        state: entry.state,
        checkId: entry.checkId,
        requestHash: entry.requestHash,
        leaseToken: String(entry.token),
      };
    } catch (error) {
      release(entry);
      throw error;
    }
  }

  async transition(identity: CheckIdentity, token: string, state: CheckState, requestHash: string, checkId: string | null, release = true): Promise<void> {
    const entry = this.entries.get(identityKey(identity));
    if (!entry || !entry.locked || String(entry.token) !== token) throw checkCoordinationUnavailable();
    entry.state = state;
    entry.requestHash = requestHash;
    entry.checkId = checkId;
    if (release) unlock(entry);
  }
}

async function acquire(entry: Entry): Promise<void> {
  if (!entry.locked) {
    entry.locked = true;
    return;
  }
  await new Promise<void>((resolve) => entry.waiters.push(resolve));
}

function release(entry: Entry): void {
  unlock(entry);
}

function unlock(entry: Entry): void {
  const next = entry.waiters.shift();
  if (next) next();
  else entry.locked = false;
}

function identityKey(identity: CheckIdentity): string {
  return JSON.stringify([identity.repositoryId, identity.appId, identity.headSha, identity.name]);
}
