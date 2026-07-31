/**
 * store.ts — file-backed in-process user store (replaces Hasura)
 *
 * Schema per entry:
 *   address        (lowercase EVM address)   — unique
 *   discordUserId  (string)                  — unique
 *   chainId        (number)
 *   nonce          (hex string, 32 chars)
 *   authStatus     "AUTH_PENDING" | "AUTH_SUCCESS" | "AUTH_ERROR"
 *   tokens         string[]
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

export interface UserRecord {
  address: string;
  discordUserId: string;
  chainId: number;
  nonce: string | null;
  authStatus: "AUTH_PENDING" | "AUTH_SUCCESS" | "AUTH_ERROR";
  tokens: string[];
}

const DATA_DIR = join(__dirname, "..", "data");
const DATA_FILE = join(DATA_DIR, "users.json");

const load = (): UserRecord[] => {
  if (!existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf8")) as UserRecord[];
  } catch {
    return [];
  }
};

const save = (records: UserRecord[]): void => {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), "utf8");
};

export const findByAddress = (address: string): UserRecord | undefined =>
  load().find((u) => u.address.toLowerCase() === address.toLowerCase());

export const findByDiscordId = (discordUserId: string): UserRecord | undefined =>
  load().find((u) => u.discordUserId === discordUserId);

export const upsert = (patch: Partial<UserRecord> & { address: string }): UserRecord => {
  const records = load();
  const idx = records.findIndex(
    (u) => u.address.toLowerCase() === patch.address.toLowerCase()
  );
  if (idx === -1) {
    const entry: UserRecord = {
      address: patch.address.toLowerCase(),
      discordUserId: patch.discordUserId ?? "",
      chainId: patch.chainId ?? 1,
      nonce: patch.nonce ?? null,
      authStatus: patch.authStatus ?? "AUTH_PENDING",
      tokens: patch.tokens ?? [],
    };
    records.push(entry);
    save(records);
    return entry;
  }
  records[idx] = { ...records[idx], ...patch, address: patch.address.toLowerCase() };
  save(records);
  return records[idx];
};

export const updateByDiscordId = (
  discordUserId: string,
  patch: Partial<UserRecord>
): UserRecord | null => {
  const records = load();
  const idx = records.findIndex((u) => u.discordUserId === discordUserId);
  if (idx === -1) return null;
  records[idx] = { ...records[idx], ...patch };
  save(records);
  return records[idx];
};

export const removeByDiscordId = (discordUserId: string): void => {
  const records = load().filter((u) => u.discordUserId !== discordUserId);
  save(records);
};
