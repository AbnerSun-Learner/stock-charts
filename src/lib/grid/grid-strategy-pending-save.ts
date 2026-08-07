import type { GridStrategySavePayload } from '@/types/grid-strategy-storage';
import {
  assertSuccessfulGridSnapshot,
  parseSavedGridStrategy,
} from '@/lib/grid/grid-strategy-storage';

export const PENDING_GRID_STRATEGY_SAVE_KEY = 'grid:pending-save:v1';
export const PENDING_GRID_STRATEGY_LIBRARY_KEY = 'grid:pending-library:v1';

const PENDING_TTL_MS = 30 * 60 * 1000;

interface PendingGridStrategySaveV1 {
  version: 1;
  savedAt: string;
  payload: GridStrategySavePayload;
}

interface PendingGridStrategyLibraryV1 {
  version: 1;
  requestedAt: string;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readJson(storage: StorageLike, key: string): unknown {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

function isExpired(iso: string, nowMs: number): boolean {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return true;
  return nowMs - ts > PENDING_TTL_MS;
}

/**
 * 写入待保存快照；会清理 pending-library。
 */
export function writePendingGridStrategySave(
  payload: GridStrategySavePayload,
  storage: StorageLike,
  now: Date = new Date()
): void {
  // 写入前校验，避免存入失败快照
  assertSuccessfulGridSnapshot(payload.resultSnapshot);
  storage.removeItem(PENDING_GRID_STRATEGY_LIBRARY_KEY);
  const wrapper: PendingGridStrategySaveV1 = {
    version: 1,
    savedAt: now.toISOString(),
    payload,
  };
  storage.setItem(PENDING_GRID_STRATEGY_SAVE_KEY, JSON.stringify(wrapper));
}

/**
 * 读取待保存快照；成功不自动删除。过期/损坏返回 null 并清理键。
 */
export function readPendingGridStrategySave(
  storage: StorageLike,
  now: Date = new Date()
): GridStrategySavePayload | null {
  const parsed = readJson(storage, PENDING_GRID_STRATEGY_SAVE_KEY);
  if (!isRecord(parsed) || parsed.version !== 1) {
    storage.removeItem(PENDING_GRID_STRATEGY_SAVE_KEY);
    return null;
  }
  if (typeof parsed.savedAt !== 'string' || isExpired(parsed.savedAt, now.getTime())) {
    storage.removeItem(PENDING_GRID_STRATEGY_SAVE_KEY);
    return null;
  }
  try {
    // 借 parseSavedGridStrategy 校验 config + snapshot 结构
    const fakeRow = {
      id: 'pending',
      name: 'pending',
      schema_version: 1,
      config: (parsed.payload as GridStrategySavePayload).config,
      result_snapshot: (parsed.payload as GridStrategySavePayload).resultSnapshot,
      created_at: parsed.savedAt,
      updated_at: parsed.savedAt,
    };
    const saved = parseSavedGridStrategy(fakeRow);
    return {
      config: saved.config,
      resultSnapshot: saved.resultSnapshot,
    };
  } catch {
    storage.removeItem(PENDING_GRID_STRATEGY_SAVE_KEY);
    return null;
  }
}

/** 清理待保存键 */
export function clearPendingGridStrategySave(storage: StorageLike): void {
  storage.removeItem(PENDING_GRID_STRATEGY_SAVE_KEY);
}

/**
 * 写入待打开策略库意图；会清理 pending-save。
 */
export function writePendingGridStrategyLibrary(
  storage: StorageLike,
  now: Date = new Date()
): void {
  storage.removeItem(PENDING_GRID_STRATEGY_SAVE_KEY);
  const wrapper: PendingGridStrategyLibraryV1 = {
    version: 1,
    requestedAt: now.toISOString(),
  };
  storage.setItem(PENDING_GRID_STRATEGY_LIBRARY_KEY, JSON.stringify(wrapper));
}

/**
 * 读取待打开策略库意图；过期/损坏返回 false 并清理。
 */
export function readPendingGridStrategyLibrary(
  storage: StorageLike,
  now: Date = new Date()
): boolean {
  const parsed = readJson(storage, PENDING_GRID_STRATEGY_LIBRARY_KEY);
  if (!isRecord(parsed) || parsed.version !== 1) {
    storage.removeItem(PENDING_GRID_STRATEGY_LIBRARY_KEY);
    return false;
  }
  if (
    typeof parsed.requestedAt !== 'string' ||
    isExpired(parsed.requestedAt, now.getTime())
  ) {
    storage.removeItem(PENDING_GRID_STRATEGY_LIBRARY_KEY);
    return false;
  }
  return true;
}

/** 清理待打开策略库键 */
export function clearPendingGridStrategyLibrary(storage: StorageLike): void {
  storage.removeItem(PENDING_GRID_STRATEGY_LIBRARY_KEY);
}

/** 清理全部 pending 意图 */
export function clearAllGridStrategyPendingIntents(storage: StorageLike): void {
  clearPendingGridStrategySave(storage);
  clearPendingGridStrategyLibrary(storage);
}
