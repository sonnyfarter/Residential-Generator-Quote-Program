// Seeded ATS cost by service amperage. Kept in sync with priceBook/seed.ts
// (ats-100 / ats-200 / ats-400). 200A = $850 anchors the §6 acceptance check.
export function atsCostFor(amps: 100 | 200 | 400): number {
  return amps === 100 ? 620 : amps === 400 ? 2150 : 850;
}
