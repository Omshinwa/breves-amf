// générer les brèves des annonces sélectionnées

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  BRIEF_SYSTEM_PROMPT,
  BriefSchema,
  briefPrompt,
  lengthFeedback,
  type Brief,
} from "@/lib/brief";
import { parisDay } from "@/lib/dates";
import {
  evaluatePublication,
  fetchPublications,
  type PublicationRow,
} from "@/lib/publications";
import { selectTop } from "@/lib/selection";

const MODEL = "claude-haiku-5-5";
const MAX_TOKENS = 16_000;
const MAX_ATTEMPTS = 3;
const FORCE = process.argv.includes("--force"); // Régénère aussi les brèves existantes

type GeneratedBrief = Brief & { model: string };

async function documentText(
  supabase: SupabaseClient,
  id: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("publication_texts")
    .select("text")
    .eq("publication_id", id)
    .single<{ text: string }>();
  if (error) throw new Error(`Supabase : ${error.message}`);
  return data.text;
}

async function generate(
  client: Anthropic,
  row: PublicationRow,
  text: string,
): Promise<GeneratedBrief> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: briefPrompt({
        company: row.company,
        title: row.title,
        day: parisDay(row.published_at),
        text,
      }),
    },
  ];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: BRIEF_SYSTEM_PROMPT,
      messages,
      output_config: {
        effort: "high",
        format: betaZodOutputFormat(BriefSchema),
      },
    });

    const brief = response.parsed_output;
    if (response.stop_reason !== "end_turn" || !brief) {
      throw new Error(`réponse inutilisable (${response.stop_reason})`);
    }

    const feedback = lengthFeedback(brief);
    if (!feedback) return { ...brief, model: response.model };

    messages.push(
      { role: "assistant", content: response.content },
      { role: "user", content: feedback },
    );
  }

  throw new Error(`longueur hors limites après ${MAX_ATTEMPTS} essais`);
}

async function saveBrief(
  supabase: SupabaseClient,
  id: string,
  brief: GeneratedBrief,
): Promise<void> {
  const { error } = await supabase.from("briefs").upsert({
    publication_id: id,
    ...brief,
    generated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Supabase : ${error.message}`);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey || !process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY et ANTHROPIC_API_KEY sont requis",
    );
  }
  const supabase = createClient(url, secretKey);
  const client = new Anthropic();

  // Sans texte, pas de brève : l'annonce laisse sa place à la suivante.
  const publications = await fetchPublications(supabase);
  const selected = selectTop(
    publications
      .filter((row) => row.id === row.group_id && row.publication_texts)
      .map((row) => ({
        row,
        company: row.company,
        evaluation: evaluatePublication(row),
        figureCount: row.publication_texts!.figure_count,
        textError: row.publication_texts!.error,
      })),
  );

  let generated = 0;
  for (const { row } of selected) {
    if (row.briefs && !FORCE) continue;
    try {
      const text = await documentText(supabase, row.id);
      await saveBrief(supabase, row.id, await generate(client, row, text));
      generated += 1;
      console.log(`${row.company} : brève générée`);
    } catch (error) {
      console.error(`${row.company} (${row.id}) :`, error);
    }
  }

  const ready = selected.filter(({ row }) => row.briefs).length;
  console.log(
    `${generated} brèves générées, ${ready} déjà présentes, ${selected.length} annonces sélectionnées`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
