import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import idl from "../idl/academic_verifier.json";

const DEFAULT_PROGRAM_ID = "11111111111111111111111111111111";

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID && process.env.NEXT_PUBLIC_PROGRAM_ID.length >= 32
    ? process.env.NEXT_PUBLIC_PROGRAM_ID
    : DEFAULT_PROGRAM_ID
);

export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet");

export function getProvider(wallet) {
  if (!wallet) return null;
  const connection = new Connection(RPC_ENDPOINT, "confirmed");
  return new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });
}

export function getProgram(provider) {
  if (!provider) return null;
  return new Program(idl, PROGRAM_ID, provider);
}

export { BN };