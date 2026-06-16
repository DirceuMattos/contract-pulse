## Goal
Add client logo support: upload in client form, display on clients list and contract detail header.

## Steps

1. **Storage bucket** — create public `client-logos` bucket via `supabase--storage_create_bucket` (public=true), plus RLS policies on `storage.objects` allowing authenticated users to insert/update/delete under that bucket.

2. **Types** — `src/types/index.ts`: add `logoUrl?: string` to `Client` interface.

3. **DB mappers** — `src/lib/dbMappers.ts`:
   - `clientFromDb`: `logoUrl: (row.logo_url as string | null) ?? undefined`
   - `clientToDb`: `logo_url: client.logoUrl ?? null`
   
   Note: requires `logo_url` column on `clients` table — add via migration (text, nullable).

4. **ClientLogo component** — create `src/components/clients/ClientLogo.tsx` modeled after `HRAvatar`: shows image if `logoUrl` present, else initials of client name.

5. **Clients list** — `src/pages/ClientsPage.tsx`: render `<ClientLogo />` next to client name in the list/table.

6. **Client form** — `src/components/forms/ClientForm.tsx` (note: actual path; user said `src/components/clients/ClientForm.tsx`, which doesn't exist):
   - Add logo upload field after name
   - Upload to `client-logos/{client_id}/logo.{ext}` and store public URL in `logoUrl`
   - Show preview if exists; allow removal
   - For new clients (no id yet), defer upload until after save, or use a temp id

7. **Contract detail header** — `src/pages/ContractDetailPage.tsx`: render `<ClientLogo />` next to client name in header.

## Clarifying question
The user referenced `src/components/clients/ClientForm.tsx` but the actual file is `src/components/forms/ClientForm.tsx`. I'll edit the existing file at `src/components/forms/ClientForm.tsx`.

For new client creation (no client_id yet), I'll upload the logo after the client is saved (so we have an id for the path). Confirm if you prefer a different approach (e.g., upload to a temp UUID path immediately).