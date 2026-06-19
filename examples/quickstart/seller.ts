/**
 * A minimal x402-gated resource server for Sui.
 *
 * This is the half the public facilitator repo doesn't ship — the resource
 * (seller) side of the x402 handshake. Copy it to add per-call payment to your
 * own API:
 *
 *   - an unpaid request gets 402 + the payment terms (PAYMENT-REQUIRED header)
 *   - a request carrying a signed Sui payment (PAYMENT-SIGNATURE header) is
 *     settled through the facilitator, then served, with the settlement digest
 *     returned in PAYMENT-RESPONSE.
 *
 * The seller settles against ITS OWN terms — it never trusts the amount/payTo
 * the client declares, only the signed transaction bytes the client provides.
 */
import http from "node:http";
import { Requirements, SignedPayment, encodeHeader, decodeHeader } from "./lib.js";

export type SellerConfig = {
  facilitatorUrl: string;
  network: string;
  asset: string;
  amount: string; // atomic units
  payTo: string; // seller address
  resource: { url: string; description: string; mimeType: string };
  data: unknown; // what a paid caller receives
};

type PaymentPayload = {
  x402Version: 2;
  resource: SellerConfig["resource"];
  accepted: Requirements;
  payload: SignedPayment;
};

export async function startSeller(
  cfg: SellerConfig,
): Promise<{ url: string; close: () => Promise<void> }> {
  const requirements = (): Requirements => ({
    scheme: "exact",
    network: cfg.network,
    amount: cfg.amount,
    asset: cfg.asset,
    payTo: cfg.payTo,
    maxTimeoutSeconds: 60,
    extra: {},
  });

  const server = http.createServer(async (req, res) => {
    const send = (code: number, headers: Record<string, string>, body: unknown) => {
      res.writeHead(code, { "content-type": "application/json", ...headers });
      res.end(JSON.stringify(body));
    };

    const sig = req.headers["payment-signature"];

    // unpaid -> 402 with the terms, in both header (x402) and body (readable)
    if (typeof sig !== "string" || !sig.length) {
      const body = {
        x402Version: 2,
        error: "PAYMENT-SIGNATURE header is required",
        resource: cfg.resource,
        accepts: [requirements()],
      };
      return send(402, { "PAYMENT-REQUIRED": encodeHeader(body) }, body);
    }

    // paid attempt -> settle the client's signed tx against our own terms
    let client: PaymentPayload;
    try {
      client = decodeHeader<PaymentPayload>(sig);
    } catch {
      return send(400, {}, { error: "PAYMENT-SIGNATURE is not valid base64 JSON" });
    }
    const reqs = requirements();
    const settleBody = {
      x402Version: 2,
      paymentPayload: { x402Version: 2, resource: cfg.resource, accepted: reqs, payload: client.payload },
      paymentRequirements: reqs,
    };
    let settle: any;
    try {
      settle = await (
        await fetch(`${cfg.facilitatorUrl}/settle`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(settleBody),
        })
      ).json();
    } catch (e: any) {
      return send(502, {}, { error: `facilitator unreachable: ${e?.message ?? e}` });
    }
    if (!settle?.success) {
      const body = {
        x402Version: 2,
        error: settle?.errorReason ?? "settlement failed",
        resource: cfg.resource,
        accepts: [reqs],
      };
      return send(402, { "PAYMENT-REQUIRED": encodeHeader(body) }, body);
    }

    // settled -> serve the data, return the settlement proof in PAYMENT-RESPONSE
    return send(200, { "PAYMENT-RESPONSE": encodeHeader(settle) }, cfg.data);
  });

  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}
