import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Simple text extraction: PDF plain text via regex, DOCX via XML, XLSX via XML */
function extractTextFromPDF(buffer: Uint8Array): string {
  // Attempt to extract text streams from PDF binary
  const text = new TextDecoder("latin1").decode(buffer);
  const matches: string[] = [];
  // Match text between BT and ET operators
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let m: RegExpExecArray | null;
  while ((m = btEtRegex.exec(text)) !== null) {
    const block = m[1];
    // Extract text in parentheses (Tj operator)
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tj: RegExpExecArray | null;
    while ((tj = tjRegex.exec(block)) !== null) {
      matches.push(tj[1]);
    }
    // TJ arrays
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
    // Fallback: try to find readable text sequences
    const readable = text.match(/[\x20-\x7E\xC0-\xFF]{10,}/g);
    if (readable) return readable.join(" ").slice(0, 100000);
    return "";
  }

  return matches.join(" ").slice(0, 500000);
}

async function extractTextFromDOCX(buffer: Uint8Array): Promise<string> {
  // DOCX is a ZIP with word/document.xml
  // Use simple approach: find XML text content
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  // Look for <w:t> tags
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
  // Look for shared strings <t> tags
  const matches: string[] = [];
  const regex = /<t[^>]*>([^<]*)<\/t>/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m[1].trim()) matches.push(m[1]);
  }
  return matches.join(" | ").slice(0, 500000);
}

/** Chunk text into overlapping segments */
function chunkText(
  text: string,
  chunkSize = 1000,
  overlap = 100
): { text: string; index: number }[] {
  const chunks: { text: string; index: number }[] = [];
  let start = 0;
  let idx = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push({ text: text.slice(start, end), index: idx });
    idx++;
    start = end - overlap;
    if (start >= text.length) break;
  }
  return chunks;
}

function hashText(text: string): string {
  // Simple hash for dedup
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

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
      // Mark as no-text (images, zip, etc.)
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
      // If basic extraction failed, try using Lovable AI to extract
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY && ext === "pdf") {
        try {
          // Use AI to summarize/describe — but we can't send binary to chat
          // Mark as failed extraction for now
          await supabase
            .from("doc_text_extractions")
            .update({
              status: "no_text",
              error_message: "Não foi possível extrair texto deste documento. O arquivo pode ser digitalizado (imagem).",
              extracted_at: new Date().toISOString(),
            })
            .eq("id", extraction.id);

          return new Response(
            JSON.stringify({ status: "no_text", message: "Could not extract text - file may be image-based" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch {
          // continue
        }
      }

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

    // Generate chunks
    const chunks = chunkText(extractedText, 1000, 100);

    if (chunks.length > 0) {
      // Delete old chunks for this document
      await supabase.from("doc_chunks").delete().eq("document_id", document_id);

      const chunkRows = chunks.map((c) => ({
        document_id,
        chunk_index: c.index,
        chunk_text: c.text,
        chunk_hash: hashText(c.text),
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
