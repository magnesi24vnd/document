/**
 * authLocal.ts — self-contained auth logic (replaces lib/auth.ts + Hasura calls)
 *
 * Flow:
 *   GET  /api/v1/authentication?address=&chainId=&userIdToken=
 *        → verifies JWT, upserts user record, returns a random nonce
 *
 *   POST /api/v1/authentication  { userIdToken, signature }
 *        → verifies JWT, recovers address from signature+nonce,
 *          checks VNKR token balance (or skips if not configured),
 *          returns { userOwnsTokens: true } on success
 */

import { utils } from "ethers";
import { randomBytes } from "crypto";
import {
  findByDiscordId,
  findByAddress,
  upsert,
  updateByDiscordId,
  removeByDiscordId,
} from "./store";

const generateNonce = (): string => randomBytes(16).toString("hex");

const recoverAddress = (nonce: string, signature: string): string =>
  utils.verifyMessage(nonce, signature);

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: GET — issue a nonce challenge
// ─────────────────────────────────────────────────────────────────────────────
export const getChallenge = (
  address: string,
  discordUserId: string,
  chainId: number
): string => {
  const existingByAddress = findByAddress(address);
  const existingByDiscord = findByDiscordId(discordUserId);

  if (existingByAddress) {
    // Address already registered
    if (
      existingByAddress.discordUserId &&
      existingByAddress.discordUserId !== discordUserId
    ) {
      throw new Error(
        "Another Discord user is already registered with this Ethereum address."
      );
    }
    // Same user re-authenticating (possibly new chainId) — update chainId, clear tokens
    upsert({
      address,
      discordUserId,
      chainId,
      nonce: generateNonce(),
      authStatus: "AUTH_PENDING",
      tokens: [],
    });
  } else {
    // New address
    if (existingByDiscord) {
      // Discord ID migrating to a new address — drop the old address record
      removeByDiscordId(discordUserId);
    }
    upsert({
      address,
      discordUserId,
      chainId,
      nonce: generateNonce(),
      authStatus: "AUTH_PENDING",
      tokens: [],
    });
  }

  const record = findByAddress(address)!;
  return record.nonce!;
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: POST — verify signature
// ─────────────────────────────────────────────────────────────────────────────
export const verifySignature = (
  discordUserId: string,
  signature: string
): { address: string; chainId: number } => {
  const record = findByDiscordId(discordUserId);
  if (!record) throw new Error("User not found.");
  if (!record.nonce) throw new Error("No pending nonce for this user.");

  const recovered = recoverAddress(record.nonce, signature);
  if (recovered.toLowerCase() !== record.address.toLowerCase()) {
    throw new Error("Bad signature.");
  }

  return { address: record.address, chainId: record.chainId };
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — called by the API handler after signature verification
// ─────────────────────────────────────────────────────────────────────────────
export const setAuthSuccess = (discordUserId: string, tokens: string[]): void => {
  updateByDiscordId(discordUserId, { authStatus: "AUTH_SUCCESS", tokens });
};

export const setAuthError = (discordUserId: string): void => {
  updateByDiscordId(discordUserId, { authStatus: "AUTH_ERROR" });
};
