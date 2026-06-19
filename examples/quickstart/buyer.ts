/**
 * The buyer (client) half of x402: hit a resource, get 402, pay on Sui, retry.
 * Returns the decoded terms, the served data, and the settlement digest.
 *
 * This is what an autonomous agent does to buy an API call: it reads the price
 * off the 402, signs the exact payment with its own key, and re-requests.
 */
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Requirements, buildPayment, encodeHeader, decodeHeader, short } from "./lib.js";

export type PayResult = {
  requirements: Requirements;
  data: unknown;
  digest: string;
  settle: any;
};

export async function payForResource(
  resourceUrl: string,
  client: SuiJsonRpcClient,
  payer: Ed25519Keypair,
  onStep: (msg: string) => void = () => {},
): Promise<PayResult> {
  // 1. unpaid request -> 402 + terms
  const first = await fetch(resourceUrl);
  if (first.status !== 402) throw new Error(`expected 402, got ${first.status}`);
  const header = first.headers.get("payment-required");
  const body: any = header ? decodeHeader(header) : await first.json();
  const requirements: Requirements = body.accepts[0];
  onStep(
    `402 Payment Required — ${requirements.amount} atomic of ${short(requirements.asset)} to ${short(requirements.payTo)}`,
  );

  // 2. build + sign the exact payment (the payer holds the keys, not the facilitator)
  const payload = await buildPayment(
    client,
    payer,
    requirements.payTo,
    BigInt(requirements.amount),
    requirements.asset,
  );
  onStep(`signed payment from ${short(payer.toSuiAddress())}`);

  // 3. retry with the signed payment in PAYMENT-SIGNATURE
  const paymentPayload = { x402Version: 2, resource: body.resource, accepted: requirements, payload };
  const paid = await fetch(resourceUrl, {
    headers: { "payment-signature": encodeHeader(paymentPayload) },
  });
  if (paid.status !== 200) throw new Error(`payment rejected (${paid.status}): ${await paid.text()}`);
  const respHeader = paid.headers.get("payment-response");
  const settle: any = respHeader ? decodeHeader(respHeader) : {};
  const data = await paid.json();
  onStep(`200 OK — settled on Sui, digest ${settle.transaction}`);

  return { requirements, data, digest: settle.transaction, settle };
}
