// ----- Phase O: Pluggable storage layer (IStore) -----
//
// The whole TieEdu document (companies/modules/orders/users/audit...) is treated as
// ONE JSON document. Two stores implement the IStore contract:
//   - JsonStore : the real-time file ledger (backend/data/db.json) — SOURCE OF TRUTH.
//   - PgStore   : optional CockroachDB replica (app_state table) — off-box backup that
//                 receives every saved document async. A mirror, not a read path, so it
//                 can never diverge from the file ledger; its health is reported honestly.
//
// Mirroring is gated on ENABLE_PG_REPLICA=1 (+ DATABASE_URL). When disabled or
// unreachable the platform still works fully on JsonStore and says so in /api/health.

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { isDbReachable } from '../db/client';
import { ensureAppStateTable } from '../db/migrate';

export interface IStore {
  readonly name: string;
  save(data: any): Promise<void>;
  load(): Promise<any | null>;
}

// ---------------- JsonStore (file ledger) ----------------

const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export class JsonStore implements IStore {
  readonly name = 'local-json-repository';

  async load(): Promise<any | null> {
    if (!fs.existsSync(DB_FILE)) return null;
    try {
      let raw = fs.readFileSync(DB_FILE, 'utf-8');
      if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async save(_data: any): Promise<void> {
    // JsonStore is the source of truth — file writes happen synchronously in
    // data/db.ts so every route keeps its sync API. Nothing to do here.
  }
}

export const jsonStore = new JsonStore();

// ---------------- PgStore (CockroachDB whole-doc replica) ----------------

let mirrorEnabled = false;
let mirrorHealthy = false;
let mirrorLastSync: string | null = null;
let mirrorSyncError: string | null = null;
let mirrorWriteQueue: Promise<void> = Promise.resolve();

export class PgStore implements IStore {
  readonly name = 'cockroachdb-replica';
  private pool: Pool | null = null;

  get lastSync() { return mirrorLastSync; }
  get syncError() { return mirrorSyncError; }
  get isEnabled() { return mirrorEnabled; }
  get isHealthy() { return mirrorHealthy; }

  bindPool(poolInstance: Pool) { this.pool = poolInstance; }

  async save(data: any): Promise<void> {
    if (!mirrorEnabled || !this.pool) return;
    if (!data || typeof data !== 'object' || !Array.isArray(data.companies)) {
      throw new Error('Refusing to mirror a corrupt database state');
    }
    // Serialize writes so upserts never interleave.
    mirrorWriteQueue = mirrorWriteQueue.then(async () => {
      try {
        await this.pool!.query(
          `INSERT INTO app_state (id, doc, updated_at)
           VALUES ('main', $1::jsonb, NOW())
           ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc, updated_at = NOW()`,
          [JSON.stringify(data)]
        );
        mirrorLastSync = new Date().toISOString();
        mirrorSyncError = null;
      } catch (e: any) {
        mirrorSyncError = e?.message || 'mirror write failed';
        mirrorHealthy = false; // honest degradation — the file ledger is still safe
      }
    });
    return mirrorWriteQueue;
  }

  async load(): Promise<any | null> {
    if (!this.pool || !mirrorEnabled) return null;
    try {
      const res = await this.pool.query('SELECT doc FROM app_state WHERE id = $1', ['main']);
      if (res.rows.length === 0) return null;
      return res.rows[0].doc;
    } catch {
      return null;
    }
  }
}

export const pgStore = new PgStore();

// ---------------- Storage facade ----------------

export type PgReplicaStatus = 'disabled' | 'healthy' | 'degraded';

export const storage = {
  /**
   * Boot wiring. If enabled && reachable: ensure app_state table, then cold-import
   * the file ledger once (so the replica starts with the real data — never fake rows).
   */
  async init(opts: { enabled: boolean; seedDoc: any }): Promise<void> {
    mirrorEnabled = opts.enabled;
    if (!mirrorEnabled) {
      mirrorHealthy = false;
      return;
    }
    const { pool } = await import('../db/client');
    pgStore.bindPool(pool);
    if (!(await isDbReachable(5000))) {
      mirrorHealthy = false;
      return;
    }
    try {
      await ensureAppStateTable();
      mirrorHealthy = true;
      const existing = await pgStore.load();
      if (!existing && opts.seedDoc) {
        await pgStore.save(opts.seedDoc);
      }
    } catch (e: any) {
      mirrorHealthy = false;
      mirrorSyncError = e?.message || 'init failed';
    }
  },

  async mirror(data: any): Promise<void> {
    if (!mirrorEnabled) return Promise.resolve();
    return pgStore.save(data);
  },

  status() {
    const pgReplica: PgReplicaStatus = !mirrorEnabled ? 'disabled' : mirrorHealthy ? 'healthy' : 'degraded';
    const storage_label =
      pgReplica === 'disabled'
        ? 'local-json-repository'
        : pgReplica === 'healthy'
          ? 'local-json-repository + cockroachdb-replica (synced)'
          : 'local-json-repository + cockroachdb-replica (degraded)';
    return {
      storage_kind: 'local-json-repository',
      pg_replica: pgReplica,
      last_sync_at: mirrorLastSync,
      sync_error: mirrorSyncError,
      storage_label,
    };
  },
};

export type StorageStatus = ReturnType<typeof storage.status>;