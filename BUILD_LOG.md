# Build Log — Standby Generator Takeoff Tool

Running record of decisions and assumptions.

## Environment / blockers

- **Reference files were absent.** `reference/HomeStandbySurvey.jsx` and
  `reference/Generac_Residential_Generator_Pricing.xlsx` were **not** in the repo
  (it was an empty git repo with no commits), and `ANTHROPIC_API_KEY` was not set.
  Per the guardrails I proceeded autonomously and reconstructed from the detailed
  spec, which restates the pricing math, defaults, domain model, JSON contract,
  and an exact acceptance check.
- **Consequence — Generac catalog.** Without the xlsx I seeded a structurally
  representative Generac Guardian (air) + Protector (liquid) lineup in
  `src/lib/catalog/generac.ts`. **Every MSRP is flagged `status:
  'needs-verification'`** and shown as provisional in the UI. The 22 kW MSRP
  ($6,309) is the spec's anchor value, used by the §6 acceptance test. Replacing
  this file with data extracted from the real xlsx is a data change, not a code
  change.
- **Consequence — fuel CFH.** `fuelCfh` is `null` for every catalog model on
  purpose. Full-load fuel consumption must come from the genset spec sheet, so
  the gas engine emits a `missing_input` and leaves the gas line unpriced rather
  than inventing a CFH figure (the non-negotiable rule). Verified end-to-end.

## Key decisions

- **Stack:** Next.js 14 App Router + TS (strict) + Tailwind 3. State: Zustand
  (`useJob` for the active job, `useEngineState` for the in-memory takeoff).
- **Persistence:** Dexie/IndexedDB behind a `JobStore` interface. `LocalStore`
  now; `CloudStore` is a real stub for later. **Photos are stored as their own
  blob records** keyed by jobId, so they survive app close (the prototype's bug).
- **PWA:** manifest + hand-written `public/sw.js` (cache-first shell, never caches
  `/api/*`) + client registration. Chose a manual SW over `next-pwa` to keep the
  build simple. Icon is an SVG (installable); a PNG apple-touch-icon can be added
  later — noted, not blocking.
- **Pricing engine** (`computeQuote`): COST → per-category MARKUP → SELL.
  Reproduces the §6 acceptance check exactly (cost $7,981.75 → price $10,865 →
  profit $2,884 → SHORT $616). The 200 A service-rated ATS seed cost ($850) was
  reverse-engineered from the acceptance numbers and seeded in the price book.
- **Hybrid takeoff:** deterministic engine owns physics + SKU mapping; AI refines
  context/quantities only. `/api/takeoff` uses server-side `ANTHROPIC_API_KEY`
  with model `claude-sonnet-4-6`, defensive JSON parsing (strip fences, normalize
  smart quotes, isolate first `{`…last `}`), and robust error surfacing.
- **Estimating tables:** NEC 310.16 ampacity + Ch. 9 cmil are marked
  `verified:true`; the **reduced** conduit-fill and NFPA 54 gas-sizing subsets are
  marked `verified:false`, so any result derived from them is tagged
  `needsVerification` in the BOM rather than presented as confirmed.

## Assumptions flagged

- Feeder modeled as 2 hots + neutral + EGC (≈4 conductors) with 10% waste; conduit
  +5%. ATS amperage tracks service size. Grounding = 2 rods + GEC. These are
  reasonable residential defaults; adjust in the price book / engine as needed.
- `existingGasBtu` is derived from the Gas screen appliance list at takeoff time.
- Hazard remediation cost is taken from the hazard item's `estCost` field and
  flows into the quote's hazards bucket (markup 1.40).

## Status

- `tsc --noEmit`, `next lint`, `vitest` (10 tests incl. acceptance), and
  `next build` all pass. Sample job runs end-to-end through the engine.

## Field-feedback revision (round 2)

Based on first hands-on review:
- **Gas screen rebuilt.** Appliance picker with per-type typical nameplate BTU
  presets (`lib/survey/gasAppliances.ts`), a per-appliance **gas/electric toggle**
  (electric units drop out of the gas load), manual BTU override, and a
  **worst-case** auto-populate. Preset values are labeled "confirm against the
  nameplate" — typical figures, not presented as verified.
- **Explicit run distances.** `HouseInfo` now carries three captured runs —
  generator→panel, generator→gas meter, generator→electric meter. The feeder is
  sized to the worst case of panel/meter runs; the gas line uses the gas-meter
  run. They auto-fill from the survey captures and are editable in Setup.
- **Required-photo gating.** Items can require a photo to count complete.
  **HVAC requires an LRA/data-tag photo**; generator, both meters, and the panel
  require a photo too.
- **Panel promoted to a required capture** with a distance-to-generator field.
- **Interactive site diagram.** Drag the home footprint (move + resize) and each
  marker; links from the generator show the captured distances. Layout persists
  (`item.pin` + `job.diagram`), committed on release to avoid IndexedDB thrash.
- **Customer report stays takeoff-free** (sell price + high-level inclusions
  only); the full BOM/takeoff remains on the internal report exclusively.

## Field-feedback revision (round 3)

- **Photo upload from library** — every capture spot now offers Take (camera) and
  Upload (library/files); removed the forced `capture` on the upload path.
- **Manual takeoff line items** — add custom priced lines (scope/desc/qty/unit/$)
  on the Takeoff screen; persisted as `job.customLines`, flow into materials cost
  and the internal report.
- **Editable engine quantities** — the generated BOM persists to `job.engineBom`
  and its qty/unit-cost are editable inline (editing the cost marks the line
  `manual`). Quote + reports read the persisted, possibly-edited BOM.
- **Company profile + logo (Settings)** — stored in IndexedDB; logo + contact +
  PM email render as a letterhead on all three reports.
- **Real email send** — `/api/send-email` (Resend) attaches a browser-rendered
  PDF of the branded report; Email customer / Email PM. Degrades to "Open in mail
  app" when `RESEND_API_KEY` is unset.
- **Real Generac data (the honest way)** — per-job **spec-sheet CFH input** feeds
  gas sizing (never invented), and a **catalog CSV import** (`/catalog`,
  IndexedDB-backed via `useCatalog`) loads real model/MSRP/ATS/fuel-CFH data;
  blank CFH still flags a missing input. Round-trip + validation unit-tested.
- **App icon** — real PNG icons (192/512/180) generated dependency-free
  (`scripts/gen-icons.mjs`), wired into the manifest + apple-touch-icon. Customer
  proposal got an accent price banner + signature/acceptance block.

## Pre-initial-testing audit (multi-agent, adversarially verified)

Ran a 6-dimension audit (correctness, estimating math, security, persistence,
PWA/print, UX) with every finding independently verified. 39 confirmed; fixed:

- **Critical — stale PWA cache.** Service worker was cache-first for navigations
  with a never-bumped cache name → testers pinned to the first deploy forever.
  Now **network-first for navigations** (offline cache fallback), cache-first for
  hashed assets, cache bumped to `standby-v2`.
- **$0 unpriced BOM lines.** Engine returned conductor/conduit/pipe sizes that had
  no price-book entry (≥2/0 feeders, 1.5"/2" conduit, 0.5" gas). Added seed items
  + map entries; tests assert no `none`-source feeder/conduit/gas lines for 22/26/48 kW
  even on long runs.
- **Report data-loss on reload.** Contractor scope + engineering summary were read
  from in-memory state; now persisted as `job.engineMeta` and used by reports.
- **NaN inputs.** Added `num()` coercion across all numeric inputs and guarded the
  money formatters (no more "$NaN").
- **AI labor ignored.** `computeQuote` now adds the AI `labor_hours_delta`.
- **Gas over-table.** No longer extrapolates past the longest tabulated run —
  leaves the size unresolved and flagged.
- **Gas double-count.** Takeoff now excludes electric appliances from the gas load.
- **Photo data-loss / orphans.** Removal is list-only (Cancel no longer loses a
  saved photo); unreferenced blobs are garbage-collected on load (`gcPhotos`).
- **Can't delete items.** Added remove for HVAC/hazard survey items; added a
  **Jobs list** (`/jobs`) so previous customers stay reachable; init() is now
  idempotent/concurrency-guarded.
- **Open public endpoints.** `/api/takeoff` and `/api/send-email` now enforce
  same-origin + per-IP rate limits + payload caps; upstream error bodies no longer
  leak to the client; image media types whitelisted; AI quantities clamped.
- **Misc:** print color-adjust (banners print), pinch-zoom re-enabled, Dexie
  versionchange handling, diagram robust to items added after mount.

Known/accepted limitations (not blocking single-user testing): multi-tab
concurrent edits are last-writer-wins; price-book has no per-line edit (CSV only);
the electrical engine models 1φ 240V (large 3φ liquid-cooled units are flagged).

## Later phases (architected, not built)

- Cloud sync (`CloudStore`), Expo/native shell, real Graybar CSV load (mechanism
  built — `/pricebook` import), additional brands (Kohler/Cummins) as catalog data.
