import { generateLogo, generateLogoVariants } from '@/lib/generate';
import { aiGenerateSVG } from '@/lib/ai';

const ENABLE_GPT5 = process.env.ENABLE_GPT5_PREVIEW === 'true';

async function generateViaAI(name: string, sector: string) {
  // Stub: call external AI if enabled
  const url = process.env.AI_API_URL;
  const key = process.env.AI_API_KEY;
  if (!url || !key) return null;
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }, body: JSON.stringify({ name, sector, mode: 'logo_vector_v1' }) });
    if (!r.ok) return null;
    const j = await r.json();
    if (j.svg && typeof j.svg === 'string') return j.svg as string;
  } catch (e) {
    console.error('AI generation failed', e);
  }
  return null;
}

export async function POST(req: Request) {
  const { name, sector = '', variants = 1, palette, font, aiMode } = await req.json();
  if (!name || typeof name !== 'string') {
    return new Response(JSON.stringify({ error: 'Nom requis' }), { status: 400 });
  }
  let svg: string | null = null;
  if (ENABLE_GPT5) {
    svg = await generateViaAI(name.slice(0,60), sector.slice(0,80));
  }
  if (variants > 1) {
    // Si aiMode demandé et IA activée, générer d'abord un master IA puis décliner localement
    if (aiMode && ENABLE_GPT5) {
      const base = await aiGenerateSVG({ name: name.slice(0,60), sector: sector.slice(0,80), palette, font });
      if (base) {
        return new Response(JSON.stringify({ variants: [base], provider: 'ai' }), { headers: { 'Content-Type': 'application/json' } });
      }
    }
    const list = generateLogoVariants(name.slice(0,60), (sector||'').slice(0,80), Math.min(variants, 8));
    return new Response(JSON.stringify({ variants: list, provider: 'local' }), { headers: { 'Content-Type': 'application/json' } });
  }
  if (aiMode && ENABLE_GPT5) {
    svg = await aiGenerateSVG({ name: name.slice(0,60), sector: sector.slice(0,80), palette, font });
  }
  if (!svg) {
    svg = generateLogo({ name: name.slice(0,60), sector: (sector||'').slice(0,80), palette, font });
  }
  return new Response(JSON.stringify({ svg, provider: (aiMode && ENABLE_GPT5 && svg) ? 'ai' : (ENABLE_GPT5 && svg ? 'gpt5' : 'local') }), { headers: { 'Content-Type': 'application/json' } });
}
