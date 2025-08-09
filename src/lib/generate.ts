// Simple pseudo-générateur de logo SVG basé sur le nom + secteur.
// Remplacer plus tard par un appel IA réel (génération vectorielle).

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return Math.abs(h);
}

export function generatePalette(seed: string) {
  const h = hash(seed);
  const h1 = h % 360;
  const h2 = (h1 + 40 + (h % 80)) % 360;
  const h3 = (h1 + 200 + (h % 50)) % 360;
  return [h1, h2, h3].map(x => `hsl(${x}deg 70% 55%)`);
}

export function generateShapePath(seed: string) {
  const h = hash(seed);
  const r = 40 + (h % 20);
  const r2 = 20 + (h % 10);
  return `<circle cx="50" cy="50" r="${r}" fill="url(#grad)" opacity="0.9" />\n<circle cx="70" cy="40" r="${r2}" fill="var(--accent)" opacity="0.75" />`;
}

export function generateLogo({ name, sector, palette, font }: { name: string; sector: string; palette?: string[]; font?: string; }) {
  const seed = `${name}|${sector}`.trim();
  const [c1, c2, c3] = palette && palette.length >=3 ? palette : generatePalette(seed);
  const shape = generateShapePath(seed);
  const initials = name.split(/\s+/).slice(0,2).map(s=>s[0] ? s[0].toUpperCase() : '').join('');
  const f = font || 'system-ui,Inter,sans-serif';

  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 100 100" role="img" aria-label="${name} logo">\n  <defs>\n    <linearGradient id="grad" x1="0" x2="1" y1="0" y2="1">\n      <stop offset="0%" stop-color="${c1}"/>\n      <stop offset="100%" stop-color="${c2}"/>\n    </linearGradient>\n    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">\n      <feGaussianBlur stdDeviation="4" result="b"/>\n      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>\n    </filter>\n  </defs>\n  <rect x="0" y="0" width="100" height="100" rx="18" fill="#050505"/>\n  <g style="--accent:${c3}" filter="url(#glow)">\n    ${shape}\n    <text x="50" y="57" font-family="${f}" font-size="36" font-weight="600" text-anchor="middle" fill="#fff" letter-spacing="1">${initials}</text>\n  </g>\n</svg>`;
  return svg;
}

export function generateLogoVariants(name: string, sector: string, count: number) {
  const variants: string[] = [];
  for (let i = 0; i < count; i++) {
    variants.push(generateLogo({ name: `${name}`, sector: `${sector}|v${i}` }));
  }
  return variants;
}
