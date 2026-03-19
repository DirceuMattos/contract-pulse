

## Diagnosis

Two issues prevent auto-linking and dashboard data:

### 1. Bulk auto-link condition too restrictive
The current logic at line 117 requires `contractGroup.length === 1 && activeSubs.length === 1`. If a CNPJ has 2+ contracts (common), **none** get linked. With 42 contracts across fewer unique CNPJs, most groups have multiple contracts.

### 2. Edge function uses `max` instead of `sum` for amounts
Line 147: `if (amount > groups[subId].amount)` takes the max value instead of summing service items within a subscription.

---

## Plan

### Step 1 — Fix edge function aggregation (`superlogica-search-subscriptions`)

Change line 147 from `max` to `sum`:
```typescript
// Before: if (amount > groups[subId].amount) groups[subId].amount = amount;
// After:
groups[subId].amount += amount;
```

### Step 2 — Fix bulk auto-link logic (`ReceivablesReconcilePage.tsx`)

Replace the restrictive condition with:
- If there are active subscriptions for a CNPJ, link **each contract** in that group to the highest-value subscription
- Only skip if zero active subscriptions are found

```
// Before: if (contractGroup.length === 1 && activeSubs.length === 1)
// After:  always link all contracts to activeSubs[0] (already sorted by value desc)
```

This means: for each CNPJ group, every contract gets linked to the top subscription. Multiple subscriptions per CNPJ are fine — the highest value one is chosen automatically.

### Step 3 — Redeploy edge function

Deploy the updated `superlogica-search-subscriptions` function.

### Result

After auto-link completes, contracts will have `superlogica_subscription_id` set, enabling the `superlogica-sync` function to fetch invoices and populate the dashboard.

