import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Text extraction helpers ---

function extractTextFromPDF(buffer: Uint8Array): string {
  const text = new TextDecoder("latin1").decode(buffer);
  const matches: string[] = [];
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let m: RegExpExecArray | null;
  while ((m = btEtRegex.exec(text)) !== null) {
    const block = m[1];
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tj: RegExpExecArray | null;
    while ((tj = tjRegex.exec(block)) !== null) {
      matches.push(tj[1]);
    }
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
    let tja: RegExpExecArray | null;
    while ((tja = tjArrayRegex.exec(block)) !== null) {
      const inner = tja[1];
      const parts = inner.match(/\(([^)]*)\)/g);
      if (parts) {
        matches.push(parts.map((p) => p.slice(1, -1)).join(""));
      }
    }
  }
  if (matches.length === 0) {
    const readable = text.match(/[\x20-\x7E\xC0-\xFF]{10,}/g);
    if (readable) return readable.join(" ").slice(0, 100000);
    return "";
  }
  return matches.join(" ").slice(0, 500000);
}

async function extractTextFromDOCX(buffer: Uint8Array): Promise<string> {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const matches: string[] = [];
  const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    matches.push(m[1]);
  }
  return matches.join(" ").slice(0, 500000);
}

function extractTextFromXLSX(buffer: Uint8Array): string {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const matches: string[] = [];
  const regex = /<t[^>]*>([^<]*)<\/t>/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m[1].trim()) matches.push(m[1]);
  }
  return matches.join(" | ").slice(0, 500000);
}

// --- Chunking ---

function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

interface Chunk {
  text: string;
  index: number;
  page_start: number | null;
  page_end: number | null;
  hash: string;
}

function chunkText(
  fullText: string,
  chunkSize = 1000,
  overlapPercent = 0.1
): Chunk[] {
  const overlap = Math.round(chunkSize * overlapPercent);
  const chunks: Chunk[] = [];
  let start = 0;
  let idx = 0;
  const totalLen = fullText.length;

  while (start < totalLen) {
    const end = Math.min(start + chunkSize, totalLen);
    const chunkText = fullText.slice(start, end);
    const hash = hashText(chunkText);

    // Estimate page numbers (assuming ~3000 chars per page)
    const charsPerPage = 3000;
    const pageStart = Math.floor(start / charsPerPage) + 1;
    const pageEnd = Math.floor((end - 1) / charsPerPage) + 1;

    chunks.push({
      text: chunkText,
      index: idx,
      page_start: pageStart,
      page_end: pageEnd,
      hash,
    });

    idx++;
    start = end - overlap;
    if (start >= totalLen) break;
  }
  return chunks;
}

// --- Main handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_id } = await req.json();
    if (!document_id) {
      return new Response(
        JSON.stringify({ error: "document_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get document metadata
    const { data: doc, error: docErr } = await supabase
      .from("document_attachments")
      .select("*")
      .eq("id", document_id)
      .single();

    if (docErr || !doc) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already extracted
    const { data: existing } = await supabase
      .from("doc_text_extractions")
      .select("id, status")
      .eq("document_id", document_id)
      .eq("status", "done")
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ status: "already_extracted", extraction_id: existing.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create extraction record
    const { data: extraction, error: insertErr } = await supabase
      .from("doc_text_extractions")
      .insert({
        document_id,
        owner_type: "CONTRACT",
        owner_id: doc.contract_id,
        status: "processing",
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("Insert extraction error:", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to create extraction record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ext = doc.file_extension?.toLowerCase();
    const supportedText = ["pdf", "doc", "docx", "xls", "xlsx"];

    if (!supportedText.includes(ext)) {
      await supabase
        .from("doc_text_extractions")
        .update({
          status: "no_text",
          error_message: `Tipo ${ext} não suporta extração de texto`,
          extracted_at: new Date().toISOString(),
        })
        .eq("id", extraction.id);

      return new Response(
        JSON.stringify({ status: "no_text", message: `File type .${ext} does not support text extraction` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download file from storage
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("contract-documents")
      .download(doc.storage_key);

    if (dlErr || !fileData) {
      await supabase
        .from("doc_text_extractions")
        .update({ status: "failed", error_message: "Could not download file from storage" })
        .eq("id", extraction.id);

      return new Response(
        JSON.stringify({ error: "Failed to download file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const buffer = new Uint8Array(await fileData.arrayBuffer());
    let extractedText = "";

    try {
      if (ext === "pdf") {
        extractedText = extractTextFromPDF(buffer);
      } else if (ext === "doc" || ext === "docx") {
        extractedText = await extractTextFromDOCX(buffer);
      } else if (ext === "xls" || ext === "xlsx") {
        extractedText = extractTextFromXLSX(buffer);
      }
    } catch (e) {
      console.error("Extraction error:", e);
      extractedText = "";
    }

    if (!extractedText.trim()) {
      await supabase
        .from("doc_text_extractions")
        .update({
          status: "no_text",
          error_message: "Nenhum texto extraível encontrado",
          extracted_at: new Date().toISOString(),
        })
        .eq("id", extraction.id);

      return new Response(
        JSON.stringify({ status: "no_text", message: "No extractable text found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save extracted text
    await supabase
      .from("doc_text_extractions")
      .update({
        extracted_text: extractedText.slice(0, 500000),
        status: "done",
        extracted_at: new Date().toISOString(),
      })
      .eq("id", extraction.id);

    // Generate chunks with page estimates and deduplication
    const chunks = chunkText(extractedText, 1000, 0.1);

    if (chunks.length > 0) {
      // Delete old chunks for this document
      await supabase.from("doc_chunks").delete().eq("document_id", document_id);

      // Deduplicate by hash
      const seenHashes = new Set<string>();
      const uniqueChunks = chunks.filter((c) => {
        if (seenHashes.has(c.hash)) return false;
        seenHashes.add(c.hash);
        return true;
      });

      const chunkRows = uniqueChunks.map((c) => ({
        document_id,
        chunk_index: c.index,
        chunk_text: c.text,
        chunk_hash: c.hash,
        page_start: c.page_start,
        page_end: c.page_end,
        token_count_est: Math.ceil(c.text.length / 4),
      }));

      // Insert in batches of 50
      for (let i = 0; i < chunkRows.length; i += 50) {
        const batch = chunkRows.slice(i, i + 50);
        await supabase.from("doc_chunks").insert(batch);
      }
    }

    return new Response(
      JSON.stringify({
        status: "done",
        extraction_id: extraction.id,
        chunks_count: chunks.length,
        text_length: extractedText.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("doc-extract error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
