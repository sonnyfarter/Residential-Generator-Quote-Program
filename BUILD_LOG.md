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

## Later phases (architected, not built)

- Cloud sync (`CloudStore`), Expo/native shell, real Graybar CSV load (mechanism
  built — `/pricebook` import), additional brands (Kohler/Cummins) as catalog data.
