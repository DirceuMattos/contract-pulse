Three isolated changes to add photo display + upload UI for HR people.

## 1. Migration: create `hr-avatars` public bucket

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('hr-avatars', 'hr-avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "hr-avatars public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'hr-avatars');

CREATE POLICY "hr-avatars authenticated write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'hr-avatars');

CREATE POLICY "hr-avatars authenticated update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'hr-avatars');
```

(Public read so the URL works; auth write so logged-in users can upload.)

## 2. `src/pages/HRPersonDetailPage.tsx`

- Add imports: `HRAvatar` from `@/components/hr/HRAvatar`, `Camera` from `lucide-react`, `supabase` from `@/integrations/supabase/client`, `toast` from `sonner`, `useRef` from React.
- Add a `fileInputRef = useRef<HTMLInputElement>(null)`.
- Add a `handlePhotoUpload(e)` function that: reads file, derives extension, uploads to `hr-avatars` at path `{person.id}/avatar.{ext}` with `upsert: true`, gets the public URL, appends `?t=${Date.now()}` to bust cache, calls `updatePerson(person.id, { fotoUrl: publicUrl })`, shows toast.
- Insert a new flex row between `<PageHeader />` and `<Tabs>` containing:
  - `<HRAvatar nome={person.nome} email={person.email} fotoUrl={person.fotoUrl} size="lg" />`
  - When `canEdit`: an icon-only `Button` (`variant="outline"`, `size="icon"`) with `<Camera />` that triggers `fileInputRef.current?.click()`, plus a hidden `<input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />`.

Nothing else in the page is touched.

## 3. `src/pages/HRPeoplePage.tsx`

- Add import for `HRAvatar`.
- Add an empty `<TableHead className="text-xs w-[40px]" />` at the start of the header row.
- Add a new `<TableCell className="py-2 px-1 w-[40px]"><HRAvatar nome={p.nome} email={p.email} fotoUrl={p.fotoUrl} size="sm" /></TableCell>` as the first cell of each `TableRow` in the body.

No other listing logic is touched.

## Out of scope

- No changes to `HRPersonForm`, mappers, types (already done previously), or any other page.
- No changes to existing buttons, tabs, or business logic.