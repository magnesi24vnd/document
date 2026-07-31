/**
 * api/v1/authentication.ts — standalone auth handler
 *
 * Replaces the original handler which depended on:
 *   - Discord bot (assign role)
 *   - Hasura GraphQL (user store)
 *   - On-chain token balance checks (Moralis / Covalent / Alchemy)
 *
 * This version stores state locally (lib/store.ts) and only requires:
 *   JWT_SECRET  — to sign/verify the userIdToken issued by the Discord bot command
 *
 * Endpoints:
 *   GET  /api/v1/authentication?address=<EVM>&chainId=<int>&userIdToken=<jwt>
 *        → { nonce: string }
 *
 *   POST /api/v1/authentication  body: { userIdToken, signature }
 *        → { userOwnsTokens: true }  or  { error: string }
 */

import { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { getChallenge, verifySignature, setAuthSuccess, setAuthError } from "../../lib/authLocal";
import { CHAIN_IDS_DEVELOPMENT, CHAIN_IDS_PRODUCTION } from "../../config";

const JWT_EXPIRED_ERROR =
  "Your token has expired. Call the verification command on Discord again to get a new one.";
const JWT_INVALID_ERROR =
  "Something's wrong with your token. Call the verification command on Discord again to get a new one.";

const supportedChainIds =
  process.env.NODE_ENV === "production" ? CHAIN_IDS_PRODUCTION : CHAIN_IDS_DEVELOPMENT;

const auth = async (request: Request, response: Response): Promise<void> => {
  if (request.method === "OPTIONS") {
    response.status(200).end();
    return;
  }

  // ── GET — issue a nonce ────────────────────────────────────────────────────
  if (request.method === "GET") {
    let discordUserId: string | undefined;
    try {
      const address = request.query.address as string;
      const chainId = parseInt(request.query.chainId as string, 10);
      const userIdToken = request.query.userIdToken as string;

      if (!address || isNaN(chainId) || !userIdToken) {
        response.status(400).json({ error: "Missing required query params: address, chainId, userIdToken" });
        return;
      }

      const decoded = jwt.verify(userIdToken, process.env.JWT_SECRET as string) as any;
      discordUserId = decoded.userId as string;

      if (!supportedChainIds.includes(chainId)) {
        response.status(400).json({ error: `Chain with id ${chainId} is not supported.` });
        return;
      }

      const nonce = getChallenge(address, discordUserId, chainId);
      response.status(200).json({ nonce });
    } catch (e) {
      const error = e as Error;
      let errorMessage: string;
      if (error instanceof jwt.TokenExpiredError) errorMessage = JWT_EXPIRED_ERROR;
      else if (error instanceof jwt.JsonWebTokenError) errorMessage = JWT_INVALID_ERROR;
      else errorMessage = error.message;
      console.error(`GET /authentication error: ${errorMessage} (discordUserId: ${discordUserId})`);
      response.status(500).json({ error: errorMessage });
    }
    return;
  }

  // ── POST — verify signature ────────────────────────────────────────────────
  if (request.method === "POST") {
    let discordUserId: string | undefined;
    try {
      const { userIdToken, signature } = request.body as {
        userIdToken: string;
        signature: string;
      };

      if (!userIdToken || !signature) {
        response.status(400).json({ error: "Missing required body fields: userIdToken, signature" });
        return;
      }

      const decoded = jwt.verify(userIdToken, process.env.JWT_SECRET as string) as any;
      discordUserId = decoded.userId as string;

      // Recover address from nonce + signature — throws on mismatch
      const { address, chainId } = verifySignature(discordUserId, signature);

      // Token-gating: skipped in standalone mode — all verified wallets are accepted.
      // To re-enable, implement a balance check here and replace the line below.
      const tokens: string[] = ["VNKR"];

      setAuthSuccess(discordUserId, tokens);
      console.log(`AUTH_SUCCESS — discordUserId: ${discordUserId}, address: ${address}, chainId: ${chainId}`);
      response.status(200).json({ userOwnsTokens: true });
    } catch (e) {
      if (discordUserId) setAuthError(discordUserId);
      const error = e as Error;
      let errorMessage: string;
      if (error instanceof jwt.TokenExpiredError) errorMessage = JWT_EXPIRED_ERROR;
      else if (error instanceof jwt.JsonWebTokenError) errorMessage = JWT_INVALID_ERROR;
      else errorMessage = error.message;
      console.error(`POST /authentication error: ${errorMessage} (discordUserId: ${discordUserId})`);
      response.status(500).json({ error: errorMessage });
    }
    return;
  }

  response.status(405).json({ error: "Method not allowed" });
};

export default auth;
