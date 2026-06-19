# x402-sui-stack — Sui Overflow 2026

**Track:** DeFi & Payments (core) — *Infrastructure & Tooling*
**One-liner:** The x402 builder stack for Sui — accept agent payments on Sui in one `npm run`.
**Live demo:** https://x402-sui-stack.netlify.app — live facilitator status + recompute the mainnet receipt in your browser.

## What it is

[x402](https://x402.org) is the HTTP-native payment standard for the agent
economy: a server answers `402 Payment Required` with machine-readable terms, a
client signs an exact payment, and a *facilitator* settles it on-chain. This is
everything a builder needs to use x402 **on Sui** — a live, non-custodial
settlement rail, the developer tooling around it, the standards work, and a
runnable demo that pays a real API call and verifies it on-chain.

## The problem

The agent economy is arriving on real ship dates — Coinbase's x402, Anthropic's
MCP, agent-wallet products from Skyfire/Crossmint/Privy. Agents need to *pay* for
things: APIs, data, compute, at `$0.001–$0.10` per call. That only works on a
chain with sub-cent fees and sub-second finality — Sui. But until now there was
**no x402 settlement rail on Sui**, and no resource-side example showing a builder
how to gate their own Sui API behind a payment. This stack is that missing layer.

## What we built

| Layer | What | Where |
|---|---|---|
| **Rail** | The **first x402 facilitator to settle on Sui mainnet** — non-custodial, zero-fee, with an optional Enoki gas station so payers need no SUI for gas | [sui-x402-facilitator](https://github.com/DrVelvetFog/sui-x402-facilitator) · [live](https://sui-facilitator.onrender.com/health) |
| **Tooling** | A Claude Code plugin + an MCP server that lints x402 flows and **recomputes any settlement** from on-chain truth | [x402-pilot](https://github.com/DrVelvetFog/x402-pilot) |
| **Standard** | A co-authored settlement-receipt binding extension to the x402 spec | [x402-foundation/x402#2666](https://github.com/x402-foundation/x402/pull/2666) |
| **Demo** | This repo — a self-contained buyer + an x402-gated seller (**the resource-side template the rail repo doesn't ship**) that settles a paid call on Sui and recomputes it | [`examples/quickstart`](examples/quickstart) |

## It's live on mainnet — verify it yourself

The rail has settled real USDC on `sui:mainnet` since 2026-06-12
([PROOF.md](https://github.com/DrVelvetFog/sui-x402-facilitator/blob/main/PROOF.md),
digest `HenUMqpD…`). This submission's golden-path demo settled a fresh `$0.01`
USDC payment on mainnet on 2026-06-19, and the independent on-chain recompute
matched the advertised amount:

- **Mainnet settlement:** [`EVGJpzy383YkrZntGgTm1SZBeXPqguKG9euypYptsKrm`](https://suivision.xyz/txblock/EVGJpzy383YkrZntGgTm1SZBeXPqguKG9euypYptsKrm)
- net on-chain credit to `payTo` = `10000` atomic USDC = the advertised `$0.01` ✓

No screenshot to trust — open the explorer link, or run the conformance recompute
yourself against that digest.

## Try it in 5 minutes

```sh
npm install
npm run demo
```

The demo stands up an x402-gated API, has a buyer pay for it through the **live**
facilitator on Sui, and recomputes the settlement on-chain:

```
  ①  GET /supported → advertises sui:testnet exact ✓
  ②  paid resource live (x402-gated)
  →  402 Payment Required — 10000 atomic USDC ($0.01)
  →  signed payment from the payer
  →  200 OK — settled on Sui, digest …
  ⑤  explorer: https://…suivision.xyz/txblock/…
  ⑥  on-chain net to payTo = 10000 (advertised 10000) ✓ verified
  ✅ agent paid · Sui settled · recompute matched
```

Defaults to SUI so it runs with no funding; `ASSET=USDC` matches a `$0.01` API;
`NETWORK=sui:mainnet … CONFIRM_MAINNET=1` runs it for real on mainnet.

## Why Sui

- **Sub-cent fees + sub-second finality** — the only economics under which an agent
  paying fractions of a cent per call actually works.
- **Sponsored transactions** (Enoki gas station) — agents pay in USDC without
  holding SUI for gas; the sponsor signs the *same* payer bytes and still cannot
  redirect funds.
- **Non-custodial by construction** — the payment payload carries the payer's
  complete signed transaction. The facilitator can only simulate (verify) or
  broadcast (settle) it verbatim. It holds no keys and never touches funds.

## How this maps to the track

The DeFi & Payments brief invites *Infrastructure & Tooling*: "SDKs for payments",
"tools for building or visualizing transaction flows", and "developer tools". This
stack is exactly that:

- **SDK / rail for payments** — the facilitator + the copyable `seller.ts` resource gate.
- **Tool for visualizing transaction flows** — `npm run demo` prints the full
  `402 → sign → settle → verify` arc with a live explorer link.
- **Verification / debugging** — the conformance MCP recomputes any settlement from
  on-chain truth ("don't trust the operator, recompute it").
- **Correct asset & ownership handling** — payments are exact, non-custodial, and
  the seller settles against *its own* terms, never the client's declared amount.
- **Real-world applicability** — it's mainnet-live with verifiable receipts, and the
  receipt-binding extension is in front of the x402 standards body.

## Built during the Overflow window (disclosure)

Window: **May 7 – June 20, 2026**. Everything in this stack was built within it:

- the **facilitator** went mainnet-live **2026-06-12**;
- the **x402-pilot plugin + conformance MCP**, **2026-06-18**;
- the co-authored **spec extension #2666**, **2026-06-19**;
- **this repo** (the buyer/seller/verify demo) and its fresh **mainnet receipt**,
  **2026-06-19**.

The only pre-existing material is the upstream **x402 specification**
([x402-foundation/x402](https://github.com/x402-foundation/x402)) — a third-party
standard the tooling references and conforms to, not work we authored. This repo
deliberately does **not** vendor or re-implement the facilitator or the plugin; it
links to them and adds the one missing piece (the runnable, resource-side demo).

## Links

- **Live demo / verify:** https://x402-sui-stack.netlify.app
- This repo: https://github.com/DrVelvetFog/x402-sui-stack
- Rail (facilitator): https://github.com/DrVelvetFog/sui-x402-facilitator · live https://sui-facilitator.onrender.com
- Tooling: https://github.com/DrVelvetFog/x402-pilot
- Spec extension: https://github.com/x402-foundation/x402/pull/2666

## License

Apache-2.0 © UIG Studios LLC.
