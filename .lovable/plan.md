

## Plan: Vacant Resource Handling & Termination Allocation Warning

### Context
When an HR person is terminated (desligamento), their linked resources in contracts become orphaned — the person is inactive but the resource still references them. Currently there's no visual or functional treatment for this case. Two changes are needed:

1. **Contract-side**: Resources linked to inactive HR people must be flagged as "Vago" (vacant) in red, signaling that a replacement is needed.
2. **HR Termination flow**: Before confirming a termination, the system must show which contracts the person is allocated to and offer the user a chance to assign a replacement from the active HR roster. If no replacement is chosen, the resource stays as "Vago".

---

### Implementation Steps

#### 1. Extend `resolveResource` to detect inactive HR links

In `src/lib/resourceResolver.ts`, add an `isVacant` flag to `ResolvedResource`. When `hrPersonId` points to a person with `situacao === 'inativo'`, set `isVacant: true`.

#### 2. Display "Vago" badge in red on contract resource cards

In `src/pages/ContractResourcesPage.tsx`, when `resolved.isVacant === true`:
- Show a red "Vago" badge next to the resource name
- Apply `text-destructive` / red styling to the resource card border or name
- Tooltip: "Profissional desligado — designar substituto"

#### 3. Display "Vago" indicator in Squads page

In `src/pages/SquadsPage.tsx`, propagate the `isVacant` flag through the squad data and render a red indicator for vacant resources in both project and resource views.

#### 4. Enhance HR Termination dialog with allocation awareness

In `src/pages/HRPersonDetailPage.tsx`, modify the `handleDesligamento` flow:
- Before showing the termination form, query `resources` for all active allocations linked via `hrPersonId` to this person
- Display a warning card listing each contract where the person is allocated (contract name, dedication %)
- For each allocation, show a `Select` dropdown with active HR people (filtered by same team/role when possible) to pick a replacement
- "Nenhum (manter vago)" as default option
- On confirmation: for each allocation where a replacement was chosen, update the resource's `hrPersonId` + `nome` to the new person; for others, leave `hrPersonId` unchanged (the person becomes inactive, triggering the "Vago" display)

#### 5. Fix the legacy "Janaína" record

Run a data update to clear or handle the single remaining unlinked resource, marking it appropriately since the person is inactive.

---

### Technical Details

**ResolvedResource change:**
```typescript
export interface ResolvedResource {
  // ... existing fields
  isVacant: boolean; // true when hrPersonId -> inactive person
}
```

**resolveResource logic addition:**
```typescript
if (person && person.situacao === 'inativo') {
  return { ...result, isVacant: true };
}
```

**Termination dialog enhancement:**
- Uses existing `resources` from `useData()` filtered by `r.hrPersonId === person.id`
- Replacement select uses `hrPeople.filter(p => p.situacao === 'ativo')`
- On submit: batch `updateResource()` calls before the termination `updatePerson()` call

**Files to modify:**
- `src/lib/resourceResolver.ts` — add `isVacant` field
- `src/pages/ContractResourcesPage.tsx` — render red "Vago" badge
- `src/pages/SquadsPage.tsx` — propagate and render vacancy indicator
- `src/pages/HRPersonDetailPage.tsx` — allocation warning + replacement selection in termination dialog
- `src/hooks/useResolvedResources.ts` — optionally expose vacant count

