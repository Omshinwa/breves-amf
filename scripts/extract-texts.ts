// extraire le texte des PDF utiles à la sélection

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { extractText, getDocumentProxy } from "unpdf";
import {
  evaluatePublication,
  fetchPublications,
  type PublicationRow,
  type PublicationText,
} from "@/lib/publications";
import {
  assessDocument,
  isRoutineCode,
  WORTH_ARTICLE_SCORE,
} from "@/lib/selection";
import { isGenericTitle } from "@/lib/text";

const DOWNLOAD_TIMEOUT_MS = 30_000;
const PDF_SIGNATURE = "%PDF";

async function readDocument(bytes: Uint8Array): Promise<PublicationText> {
  const signature = new TextDecoder().decode(bytes.subarray(0, 4));
  if (signature !== PDF_SIGNATURE) {
    return { text: null, head: null, figure_count: 0, error: "pas un PDF" };
  }

  try {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    const clean = text.replaceAll("\0", ""); // Postgres refuse ce caractère
    const { head, figureCount, error } = assessDocument(clean);
    return { text: clean, head, figure_count: figureCount, error };
  } catch {
    return { text: null, head: null, figure_count: 0, error: "PDF illisible" };
  }
}

// Un échec de téléchargement n'est pas enregistré : le prochain lancement réessaie.
async function extract(
  supabase: SupabaseClient,
  row: PublicationRow,
): Promise<void> {
  const res = await fetch(row.pdf_url!, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const document = await readDocument(new Uint8Array(await res.arrayBuffer()));
  const { error } = await supabase
    .from("publication_texts")
    .upsert({ publication_id: row.id, ...document });
  if (error) throw new Error(`Supabase : ${error.message}`);

  row.publication_texts = document;
  if (document.error) console.log(`${row.company} : ${document.error}`);
}

async function extractAll(
  supabase: SupabaseClient,
  rows: PublicationRow[],
): Promise<void> {
  for (const row of rows.filter((r) => r.pdf_url && !r.publication_texts)) {
    try {
      await extract(supabase, row);
    } catch (error) {
      console.error(`${row.company} (${row.id}) :`, error);
    }
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY sont requis",
    );
  }
  const supabase = createClient(url, secretKey);

  const publications = await fetchPublications(supabase);
  const announcements = publications.filter((row) => row.id === row.group_id);

  // Les titres génériques d'abord : leur note dépend du début du document.
  await extractAll(
    supabase,
    announcements.filter(
      (row) => isGenericTitle(row.title) && !isRoutineCode(row.type_code),
    ),
  );
  await extractAll(
    supabase,
    announcements.filter(
      (row) => evaluatePublication(row).score >= WORTH_ARTICLE_SCORE,
    ),
  );

  const texts = announcements.filter((row) => row.publication_texts).length;
  console.log(`${texts} textes disponibles sur ${announcements.length} annonces`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
