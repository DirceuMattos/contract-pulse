## Plan: Add Year Projection Row to Transport Yearly Comparison Table

### What we're building
A projection row in the yearly comparison table on the Transport page that estimates the full-year total for the current year based on the monthly average so far, plus a comparison against the previous full year.

### Changes to `src/pages/TransportPage.tsx`

1. **Add `yearProjection` useMemo** after `yearlyTotals` (around line 260):
   - Calculate monthly average from current year elapsed months
   - Project total = actual + (monthly avg × remaining months)
   - Compute absolute and percentage delta vs previous full year
   - Return `null` if no current year data exists

2. **Insert projection row in the yearly comparison table** (around line 577, after the `yearlyTotals.map()` block ends but still inside `<TableBody>`):
   - Render only when `yearProjection` is non-null AND `year` filter is null (all years) or `year === currentYear`
   - Styled with `opacity-70 italic border-dashed border-t border-border/50`
   - Columns: year label with "Projeção" badge, projected total, delta absolute (vs previous year), delta percentage
   - Use red (`text-red-400`) for positive deltas, green (`text-green-400`) for negative deltas

3. **Add projection footnote** below the existing asterisk footnote (around line 583):
   - Display: "† Projeção baseada na média mensal de {currentYear} (R$ {fmtBRL(monthlyAvg)}/mês) aplicada aos {monthsRemaining} meses restantes."
   - Show only when `yearProjection` is non-null

### No other files modified.
- `useTransportData.ts` remains untouched — the data source is already correct.
- No changes to styling, layout, or other page sections.