# Standby — Residential Generator Takeoff Tool

A mobile-first PWA for a generator salesperson to run a fast guided site survey in
a customer's yard and walk away with a **two-trade material takeoff (electrical +
gas), a priced bill of materials, and a customer-ready quote** — in the fewest
taps possible.

> **Principles:** Apple-like and minimal · fastest path to a takeoff wins · never
> fabricate numbers. Seeded prices and uncertain code-table values are always
> flagged; nothing pretends to be confirmed Graybar pricing or a verified code
> value.

## Setup

```bash
npm install
cp .env.example .env.local      # then set ANTHROPIC_API_KEY
npm run dev                     # http://localhost:3000
```

Scripts: `npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint`
· `npm run test`.

### Environment

| Var | Where | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | **server only** | Used by `/api/takeoff` to call Anthropic (`claude-sonnet-4-6`). Never exposed to the client. |
| `RESEND_API_KEY` | **server only** | Used by `/api/send-email` to send branded reports with a PDF attachment via [Resend](https://resend.com). Optional — without it, the "Email …" buttons report that email isn't configured and you can still use "Open in mail app". |
| `EMAIL_FROM` | server only | Sender address, e.g. `"Acme Power <quotes@acme.com>"`. Requires a domain verified in Resend. Defaults to `onboarding@resend.dev` (testing — only delivers to your own verified address). |

### Sending reports by email
The Reports screen generates a PDF of the on-screen branded report in the
browser (html2canvas + jsPDF) and POSTs it to `/api/send-email`, which attaches
it and sends via Resend. **Email customer** sends the proposal; **Email PM**
sends the install packet. Set the PM address in **Settings → Company profile**.
If `RESEND_API_KEY` is unset, use **Open in mail app** (prefilled, no attachment).

## Flow (bottom nav)

1. **Survey** (home) — checklist-first. Three required captures (generator, gas
   meter, electric meter), add-as-needed items (panel, HVAC, hazard), optional
   auto-positioned site diagram, per-item photo capture.
2. **Setup** — customer + house/service basics; price-book management; new job.
3. **Gas** — appliance loads for the NG meter-capacity check.
4. **Quote** — pick the Generac unit; see cost → markup → price; adjust the
   cost-basis lever and markups.
5. **Takeoff** — deterministic engineering baseline → optional AI refinement →
   merged priced BOM with per-line confidence and cost source.
6. **Reports** — contractor (no pricing) · customer (sell only) · internal
   (full cost→sell→profit, DO NOT SEND). Print-optimized, one at a time.

## How it's built

- **Next.js 14 (App Router) + TypeScript (strict) + Tailwind.** Zustand for state.
- **Local-first storage:** Dexie/IndexedDB behind a `JobStore` interface
  (`LocalStore` now, `CloudStore` stub later). Photos persist as blobs and survive
  app close.
- **Deterministic estimating engine** (`src/lib/estimating/`, pure + unit-tested):
  ampacity (NEC 310.16), voltage drop, conduit fill, NFPA 54 gas sizing, NG meter
  check, and material→SKU mapping → priced BOM. Uncertain table values are tagged
  `needsVerification`; missing spec values (e.g. fuel CFH) become `missing_inputs`
  — never guessed.
- **Hybrid AI takeoff:** the engine owns the physics and SKU mapping; the AI
  (`/api/takeoff`) refines run distances, site complexity, and quantities from
  photos. It never invents amps, conductor sizes, or fuel values.

### Pricing math (acceptance check)

22 kW Generac, MSRP $6,309 × 0.75, 200 A smart ATS, all defaults →
cost **$7,981.75** → quote **$10,865** → profit **$2,884**, internal flags
**SHORT by $616** of the $3,500 target. Covered by
`src/lib/pricing/computeQuote.test.ts`.

## Importing real Graybar pricing

The seed price book is for **structure only** — every seeded price is labeled
"Estimate — replace with your Graybar pricing" with its date.

1. Go to **Setup → Manage price book** (`/pricebook`).
2. **Export CSV** or **Template** to see the format. Columns:
   `category, sku, description, unit, unitCost, spec_*`.
3. Fill in real Graybar SKUs/costs and **Import Graybar CSV**. Imported rows are
   stored with `costSource: 'graybar'` and a fresh `priceDate`, and lose the
   estimate flag. This is a data change only — no code change.

## Adding a brand (Kohler / Cummins later)

The equipment layer is data-driven. Add a catalog file shaped like
`src/lib/catalog/generac.ts` (`GeneratorModel[]`) and surface it in the Quote
picker. The estimating engine and pricing are brand-agnostic.

## Notes / limitations

- The Generac catalog here is **structurally representative** because the source
  xlsx was unavailable at build time — MSRPs are flagged provisional and
  `fuelCfh` is null (so gas sizing reports a missing input). See `BUILD_LOG.md`.
- PWA icon is an SVG (installable); add a PNG apple-touch-icon for best iOS polish.
