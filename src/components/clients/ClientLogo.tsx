import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ClientLogoProps {
  nome: string;
  logoUrl?: string;
  fallbackLogoUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<ClientLogoProps["size"]>, { box: string; text: string }> = {
  sm: { box: "w-8 h-8", text: "text-xs" },
  md: { box: "w-10 h-10", text: "text-sm" },
  lg: { box: "w-16 h-16", text: "text-lg" },
};

const COLORS = [
  "bg-blue-500 text-white",
  "bg-emerald-500 text-white",
  "bg-violet-500 text-white",
  "bg-amber-500 text-white",
  "bg-pink-500 text-white",
  "bg-cyan-500 text-white",
  "bg-indigo-500 text-white",
  "bg-teal-500 text-white",
];

function pickColor(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return COLORS[sum % COLORS.length];
}

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  return (first + last).toUpperCase();
}

// In-memory cache of signed URLs (key = storage path)
const signedUrlCache = new Map<string, { url: string; expires: number }>();

async function resolveSrc(logoUrl: string): Promise<string | undefined> {
  // Already a fully-qualified URL
  if (/^https?:\/\//i.test(logoUrl)) return logoUrl;

  // Treat as storage path inside the client-logos bucket
  const path = logoUrl.replace(/^client-logos\//, "");
  const cached = signedUrlCache.get(path);
  if (cached && cached.expires > Date.now()) return cached.url;

  const { data, error } = await supabase.storage
    .from("client-logos")
    .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days
  if (error || !data?.signedUrl) return undefined;

  signedUrlCache.set(path, { url: data.signedUrl, expires: Date.now() + 1000 * 60 * 60 * 24 * 6 });
  return data.signedUrl;
}

export function ClientLogo({ nome, logoUrl, fallbackLogoUrl, size = "md", className }: ClientLogoProps) {
  const sz = SIZE_CLASSES[size];
  const initials = getInitials(nome);
  const colorClass = pickColor(nome);
  const [src, setSrc] = useState<string | undefined>(undefined);

  const effective = logoUrl || fallbackLogoUrl;

  useEffect(() => {
    let cancelled = false;
    if (!effective) {
      setSrc(undefined);
      return;
    }
    resolveSrc(effective).then((resolved) => {
      if (!cancelled) setSrc(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [effective]);

  return (
    <Avatar className={cn(sz.box, "rounded-lg", className)}>
      {src && (
        <AvatarImage
          src={src}
          alt={nome}
          className="object-contain bg-white"
          onError={() => setSrc(undefined)}
        />
      )}
      <AvatarFallback className={cn(colorClass, sz.text, "font-medium rounded-lg")}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

export default ClientLogo;
