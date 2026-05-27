Create a single component file `src/components/hr/HRAvatar.tsx` with the exact logic and props specified by the user.

**Props interface:**
- nome: string
- email?: string
- fotoUrl?: string
- size?: 'sm' | 'md' | 'lg' (default 'md')
- className?: string

**Display logic (priority order):**
1. If `fotoUrl` is provided, render `<AvatarImage src={fotoUrl} />`
2. Else if `email` is provided, compute MD5 hash of trimmed lowercase email, build Gravatar URL `https://www.gravatar.com/avatar/{md5}?s=200&d=404`, render `<AvatarImage>` with `onError` to hide broken image and fall through to fallback.
3. Final fallback: render `<AvatarFallback>` with colored initials.

**Initials generation:**
- Extract first letter of first word and first letter of last word from `nome`, uppercase.

**Color picker:**
- Simple function that hashes the name string and picks one of 8 HSL colors from the project's design system.

**Size mapping:**
- sm: w-8 h-8, text-xs
- md: w-12 h-12, text-sm
- lg: w-20 h-20, text-lg

**MD5:**
- Include a minimal inline MD5 implementation (no new dependencies), since none exist in the project.

**No other files will be modified.**