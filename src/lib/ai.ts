// ai.ts - integration d'une API OpenAI (ou compatible) pour générer un SVG.
// Nécessite variable OPENAI_API_KEY. Utilise un prompt pour produire un SVG minimal.
// Remarque: Ce code attend un modèle text->text capable de retourner du SVG (ex: gpt-4.1 / gpt-4o / future gpt-5).

export interface AIGenerateParams { name: string; sector: string; palette?: string[]; font?: string; }

const MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

function buildPrompt(p: AIGenerateParams) {
  const palette = p.palette && p.palette.length >=3 ? p.palette.join(', ') : 'creative vibrant triadic scheme';
  return `You are an expert brand logo designer. Generate ONLY a valid <svg> (no markdown) square 512x512, minimal, flat/modern, dark background #050505, gradients allowed, featuring brand initials for "${p.name}" (sector: ${p.sector}). Use a refined, balanced composition, center alignment. Color palette: ${palette}. Font preference: ${p.font || 'Inter or geometric sans'}. Avoid raster images. Return ONLY SVG.`;
}

export async function aiGenerateSVG(params: AIGenerateParams): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const prompt = buildPrompt(params);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You output only raw SVG markup.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 1800
      })
    });
    if (!res.ok) {
      console.error('AI response not ok', await res.text());
      return null;
    }
    const json = await res.json();
    const text: string | undefined = json.choices?.[0]?.message?.content;
    if (!text) return null;
    const svgMatch = text.match(/<svg[\s\S]*<\/svg>/i);
    if (!svgMatch) return null;
    return svgMatch[0];
  } catch (e) {
    console.error('AI generate error', e);
    return null;
  }
}
