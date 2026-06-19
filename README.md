<p align="center"><img src="brand/png/banner-1040x280.png" alt="x402-sui-stack" width="520"></p>

# x402-sui-stack

**The x402 builder stack for Sui — accept agent payments on Sui in one `npm run`.**

**Live:** [x402-sui-stack.netlify.app](https://x402-sui-stack.netlify.app) — live facilitator status + verify the mainnet receipt in your browser.
**▶ Demo:** [2-minute walkthrough on YouTube](https://youtu.be/g6Axa1DzXro)

[x402](https://x402.org) is the HTTP-native payment standard for the agent
economy: a server answers `402 Payment Required` with machine-readable terms, the
client signs an exact payment, and a *facilitator* settles it on-chain. This repo
is everything a builder needs to use x402 **on Sui** — a live settlement rail,
developer tooling, the standard work, and a runnable demo that pays a real API
call and verifies it on-chain.

| Layer | What | Where |
|---|---|---|
| **Rail** | The first x402 facilitator to settle on **Sui mainnet** — non-custodial, zero-fee, with an optional Enoki gas station so payers need no SUI for gas | [sui-x402-facilitator](https://github.com/DrVelvetFog/sui-x402-facilitator) ([live](https://sui-facilitator.onrender.com/health)) |
| **Tooling** | A Claude Code plugin + an MCP server that lints x402 flows and **recomputes any settlement** from on-chain truth | [x402-pilot](https://github.com/DrVelvetFog/x402-pilot) |
| **Standard** | Co-authored settlement-receipt binding extension to the x402 spec | [x402-foundation/x402#2666](https://github.com/x402-foundation/x402/pull/2666) |
| **Demo** | This repo — a paid resource, settled on Sui, independently verified | [`examples/quickstart`](examples/quickstart) |

## Quickstart (5 minutes)

```sh
npm install
npm run demo
```

The demo stands up an x402-gated API, has a buyer pay for it through the **live**
facilitator on Sui testnet, and recomputes the settlement on-chain:

```
  x402-on-Sui · golden path
  facilitator https://sui-facilitator.onrender.com

  payer  0x614a…3916
  ①      GET /supported → advertises sui:testnet exact ✓
  ②      paid resource live (x402-gated) at http://127.0.0.1:49788
  →      402 Payment Required — 1000000 atomic of 0x2::sui::SUI to 0x31aa…0234
  →      signed payment from 0x614a…3916
  →      200 OK — settled on Sui, digest 6mBE4o93WVGPkGD4W1KwWSBrsmcWrLammKbsLv6DZrpm
  ⑤      explorer: https://testnet.suivision.xyz/txblock/6mBE4o93…
  ⑥      on-chain net to payTo = 1000000 (advertised 1000000) ✓ verified

  ✅ agent paid · Sui settled · recompute matched
```

Defaults to **SUI** so it runs with no funding (it best-effort faucets gas). For
the USDC path that matches a `$0.01` API, fund the printed payer address with
[Circle testnet USDC](https://faucet.circle.com) and run `ASSET=USDC npm run demo`.

| env | default |
|---|---|
| `FACILITATOR_URL` | `https://sui-facilitator.onrender.com` |
| `NETWORK` | `sui:testnet` (or `sui:mainnet`) |
| `ASSET` | `SUI` (or `USDC`) |
| `AMOUNT` | `1000000` (0.001 SUI) / `10000` ($0.01 USDC) |
| `SUI_RPC` | testnet/mainnet fullnode by network |

### Mainnet

The same code path runs on mainnet — it's the same rail. The facilitator has
settled real USDC on `sui:mainnet` since 2026-06-12
([PROOF.md](https://github.com/DrVelvetFog/sui-x402-facilitator/blob/main/PROOF.md)).
To run a live mainnet settlement (**real funds, no faucet**), fund the payer with
mainnet USDC + a little SUI for gas, then:

```sh
NETWORK=sui:mainnet ASSET=USDC CONFIRM_MAINNET=1 npm run demo
```

`CONFIRM_MAINNET=1` is required so a mainnet run is never accidental.

## What the demo shows builders

The facilitator handles `verify`/`settle`; what most teams have to write
themselves is the **resource (seller) side** of the handshake.
[`examples/quickstart/seller.ts`](examples/quickstart/seller.ts) is that piece in
~80 lines — copy it to gate any Sui API behind a per-call payment:

- an unpaid request gets `402` + the terms (`PAYMENT-REQUIRED` header),
- a request carrying a signed Sui payment (`PAYMENT-SIGNATURE`) is settled through
  the facilitator against the **seller's own terms** (never the client's), then served,
- the settlement digest comes back in `PAYMENT-RESPONSE`.

[`buyer.ts`](examples/quickstart/buyer.ts) is the agent side: read the price off
the 402, sign the exact payment, retry. Step ⑥ recomputes the on-chain net credit
to `payTo` — the same "don't trust the operator, recompute it" check the
conformance MCP exposes as a tool.

## Why Sui

- **Sub-cent fees + sub-second finality** — the only economics under which an agent
  paying `$0.001–$0.10` per call actually works.
- **Sponsored transactions** (Enoki gas station) — agents pay in USDC without
  holding SUI for gas; the sponsor signs the *same* payer bytes and still cannot
  redirect funds.
- **Non-custodial by construction** — the payment payload carries the payer's
  complete signed transaction; the facilitator can only simulate or broadcast it
  verbatim. It holds no keys and never touches funds.

## Built for Sui Overflow 2026

DeFi & Payments track — *Infrastructure & Tooling*: an SDK/rail for payments and a
tool for building and verifying transaction flows on Sui.

## License

Apache-2.0 © UIG Studios LLC. Pairs with the rail, tooling, and spec work linked above.
