/**
 * Golden-path demo: an agent buys a paid API call, settled on Sui through the
 * live x402 facilitator. One command prints the whole
 *   402 -> sign -> settle -> verify
 * arc as it happens — the "visualize the transaction flow" the track asks for.
 *
 *   npm run demo                # SUI asset, auto-faucets gas — fully turnkey
 *   ASSET=USDC npm run demo     # needs testnet USDC at the printed payer addr
 *   FACILITATOR_URL=...         # default https://sui-facilitator.onrender.com
 *   AMOUNT=...                  # atomic units (default 0.001 SUI / $0.01 USDC)
 */
import { startSeller } from "./seller.js";
import { payForResource } from "./buyer.js";
import {
  SUI,
  getClient,
  loadKeypair,
  ensureGas,
  onchainNetToPayTo,
  explorerUrl,
  rpcFor,
  usdcFor,
} from "./lib.js";

const FACILITATOR = process.env.FACILITATOR_URL ?? "https://sui-facilitator.onrender.com";
const NETWORK = process.env.NETWORK ?? "sui:testnet";
const RPC = process.env.SUI_RPC ?? rpcFor(NETWORK);
const USE_USDC = (process.env.ASSET ?? "SUI") === "USDC";
const ASSET = USE_USDC ? usdcFor(NETWORK) : SUI;
const AMOUNT = process.env.AMOUNT ?? (USE_USDC ? "10000" : "1000000"); // $0.01 USDC | 0.001 SUI

// mainnet settles with REAL funds — require an explicit opt-in
if (NETWORK === "sui:mainnet" && process.env.CONFIRM_MAINNET !== "1") {
  console.error(
    "\n  ⚠️  NETWORK=sui:mainnet settles with REAL funds (no faucet).\n  Re-run with CONFIRM_MAINNET=1 to proceed.\n",
  );
  process.exit(1);
}

const line = (tag: string, s: string) => console.log(`  ${tag.padEnd(6)} ${s}`);

async function main() {
  console.log(`\n  x402-on-Sui · golden path\n  network ${NETWORK}\n  facilitator ${FACILITATOR}\n`);

  const client = getClient(NETWORK);
  const payer = loadKeypair("payer");
  const seller = loadKeypair("seller");

  line("payer", payer.toSuiAddress());
  await ensureGas(client, payer.toSuiAddress(), NETWORK);

  // capability discovery
  const sup: any = await (await fetch(`${FACILITATOR}/supported`)).json();
  const ok = sup.kinds?.some(
    (k: any) => k.network === NETWORK && k.scheme === "exact" && k.x402Version === 2,
  );
  line("①", `GET /supported → advertises ${NETWORK} exact ${ok ? "✓" : "✗"}`);
  if (!ok) throw new Error("facilitator does not advertise sui:testnet exact");

  // stand up a paid resource (this server is the template a builder copies)
  const srv = await startSeller({
    facilitatorUrl: FACILITATOR,
    network: NETWORK,
    asset: ASSET,
    amount: AMOUNT,
    payTo: seller.toSuiAddress(),
    resource: {
      url: "x402-sui-stack://whale-signal",
      description: "demo: recent large Sui transfers",
      mimeType: "application/json",
    },
    data: { signal: "3 transfers > 100k SUI in the last hour", asOf: new Date().toISOString() },
  });
  line("②", `paid resource live (x402-gated) at ${srv.url}`);

  try {
    const r = await payForResource(srv.url, client, payer, (m) => line("→", m));
    line("⑤", `explorer: ${explorerUrl(NETWORK, r.digest)}`);

    // independent on-chain recompute (same check as the conformance MCP)
    await client.waitForTransaction({ digest: r.digest });
    const net = await onchainNetToPayTo(RPC, r.digest, seller.toSuiAddress(), ASSET);
    const match = net === BigInt(r.requirements.amount);
    line("⑥", `on-chain net to payTo = ${net} (advertised ${r.requirements.amount}) ${match ? "✓ verified" : "✗ MISMATCH"}`);

    console.log(`\n  data received: ${JSON.stringify(r.data)}`);
    console.log(`\n  ${match ? "✅ agent paid · Sui settled · recompute matched" : "❌ verification failed"}\n`);
    if (!match) process.exit(1);
  } finally {
    await srv.close();
  }
}

main().catch((e) => {
  console.error("\n  demo failed:", e?.message ?? e, "\n");
  process.exit(1);
});
