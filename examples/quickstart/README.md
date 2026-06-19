# quickstart — a paid API call, settled on Sui

```sh
npm install
npm run demo
```

One command runs the full x402 handshake on Sui testnet: a buyer hits an
x402-gated resource, gets `402`, signs an exact payment, retries, and the seller
settles it through the live facilitator — then the result is recomputed on-chain.

## Files

| File | Role |
|---|---|
| [`seller.ts`](seller.ts) | An x402-gated resource server. **This is the template** — copy it to add per-call payment to your own Sui API. |
| [`buyer.ts`](buyer.ts) | The client/agent: reads the 402 terms, signs the payment, retries. |
| [`demo.ts`](demo.ts) | Orchestrates seller + buyer and prints the `402 → sign → settle → verify` flow. |
| [`lib.ts`](lib.ts) | Shared helpers: keypair/faucet, `buildPayment` (adapted from the facilitator's e2e), header base64 codec, and the on-chain recompute. |

## Configuration

| env | default | notes |
|---|---|---|
| `FACILITATOR_URL` | `https://sui-facilitator.onrender.com` | point at a local facilitator with `http://localhost:4402` |
| `NETWORK` | `sui:testnet` | `sui:mainnet` settles **real funds** and needs `CONFIRM_MAINNET=1` (no faucet) |
| `ASSET` | `SUI` | `USDC` needs USDC at the printed payer ([Circle testnet faucet](https://faucet.circle.com)) |
| `AMOUNT` | `1000000` / `10000` | atomic units (0.001 SUI / $0.01 USDC) |
| `SUI_RPC` | testnet/mainnet fullnode by network | |

Keys persist in `../../.secrets/` (gitignored). The default SUI path best-effort
faucets gas; if the public faucet rate-limits you, fund the printed payer address
manually and re-run.

## The handshake (x402 v2, `exact` scheme on Sui)

1. `GET resource` → `402` + `PAYMENT-REQUIRED` header (base64 of the terms).
2. Buyer builds + signs an exact Sui payment to `payTo`.
3. `GET resource` again with `PAYMENT-SIGNATURE` (base64 of the signed payload).
4. Seller calls the facilitator's `/settle` against **its own** terms; on success
   returns the data + `PAYMENT-RESPONSE` (base64 of the settlement, incl. the digest).
5. Independent check: net on-chain credit to `payTo` must equal the advertised amount.
