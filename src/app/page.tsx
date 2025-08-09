'use client';
import React, { useState } from 'react';
import { useLogoStore } from '@/lib/store';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import * as UPNG from 'upng-js';

export default function HomePage() {
  const store = useLogoStore();
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [loading, setLoading] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);
  const [variants, setVariants] = useState<string[]>([]);
  const [font, setFont] = useState(store.font);
  const [paletteInput, setPaletteInput] = useState(store.palette.join(','));
  const [aiMode, setAiMode] = useState(false);

  async function onGenerate(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      const palette = parsePalette(paletteInput);
      if (palette.length < 3) {
        alert('Palette invalide (au moins 3 couleurs hex).');
        return;
      }
      const res = await fetch('/api/logo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, sector, variants: 4, palette, font, aiMode }) });
      const data = await res.json();
      if (data.variants) { setVariants(data.variants); setSvg(data.variants[0]); store.add({ svg: data.variants[0], name, sector, palette, font }); }
      else if (data.svg){ setSvg(data.svg); store.add({ svg: data.svg, name, sector, palette, font }); }
      // @ts-ignore
      (window as any).__provider = data.provider;
    } finally { setLoading(false); }
  }

  function download() {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g,'_')}_logo.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPNG(svgString?: string, size=1024, compress=true) {
    const content = svgString || svg;
    if (!content) return;
    const img = new Image();
    const blob = new Blob([content], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, size, size);
      const imageData = ctx.getImageData(0,0,size,size);
      if (compress) {
        const rgba = imageData.data.buffer;
        const png = UPNG.encode([rgba], size, size, 256);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([png], { type: 'image/png' }));
        a.download = `${name.replace(/\s+/g,'_')}_logo_${size}.png`;
        a.click();
      } else {
        canvas.toBlob(b => {
          if (!b) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(b);
            a.download = `${name.replace(/\s+/g,'_')}_logo_${size}.png`;
          a.click();
        }, 'image/png');
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function downloadPDF(svgString?: string) {
    const content = svgString || svg;
    if (!content) return;
    const doc = new jsPDF({ unit: 'pt', format: [512, 512] });
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 1024;
    const img = new Image();
    const blob = new Blob([content], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img,0,0,1024,1024);
      const pngData = canvas.toDataURL('image/png');
      doc.addImage(pngData, 'PNG', 0,0,512,512);
      doc.save(`${name.replace(/\s+/g,'_')}_logo.pdf`);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  async function downloadFavicons() {
    if (!svg) return;
    const sizes = [16,32,48,64,128,180,192,256,512];
    const zip = new JSZip();
    await Promise.all(sizes.map(size => new Promise<void>(resolve => {
      const img = new Image();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img,0,0,size,size);
          const data = canvas.toDataURL('image/png');
          const bstr = atob(data.split(',')[1]);
          const arr = new Uint8Array(bstr.length);
          for (let i=0;i<bstr.length;i++) arr[i] = bstr.charCodeAt(i);
          zip.file(`${size}x${size}.png`, arr);
        }
        URL.revokeObjectURL(url);
        resolve();
      };
      img.src = url;
    })));
    const content = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = `${name.replace(/\s+/g,'_')}_favicons.zip`;
    a.click();
  }

  function parsePalette(raw: string) {
    const parts = raw.split(',').map(s=>s.trim()).filter(Boolean);
    const hexRe = /^#([0-9a-fA-F]{3,8})$/;
    const valid = parts.filter(p=>hexRe.test(p));
    return valid;
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-16 fade-in">
      <header className="mb-16 text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-semibold bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent">LogoMaker <span className="text-brand-400">AI</span></h1>
        <p className="text-neutral-400 text-lg">Nom + Domaine → Logo unique instantané (0 watermark).</p>
      </header>
      <form onSubmit={onGenerate} className="grid gap-4 md:grid-cols-5 items-end mb-10">
        {/* name */}
        <div>
          <label className="block text-sm mb-1 text-neutral-400">Nom</label>
          <input value={name} onChange={e=>setName(e.target.value)} className="w-full bg-neutral-900/70 border border-neutral-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Ex: NovaFlow" />
        </div>
        {/* sector */}
        <div>
          <label className="block text-sm mb-1 text-neutral-400">Secteur</label>
          <input value={sector} onChange={e=>setSector(e.target.value)} className="w-full bg-neutral-900/70 border border-neutral-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Ex: SaaS Fintech" />
        </div>
        {/* palette */}
        <div>
          <label className="block text-sm mb-1 text-neutral-400">Palette (3+ couleurs)</label>
          <input value={paletteInput} onChange={e=>setPaletteInput(e.target.value)} className="w-full bg-neutral-900/70 border border-neutral-700 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="#ff0000,#00ff00,#0000ff" />
        </div>
        {/* font */}
        <div>
          <label className="block text-sm mb-1 text-neutral-400">Font</label>
          <input value={font} onChange={e=>setFont(e.target.value)} className="w-full bg-neutral-900/70 border border-neutral-700 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Inter" />
        </div>
        {/* AI */}
        <div className="flex items-center gap-2 pt-6">
          <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer"><input type="checkbox" checked={aiMode} onChange={e=>setAiMode(e.target.checked)} className="accent-brand-500" />GPT‑5</label>
          <button type="submit" disabled={loading || !name} className="flex-1 h-[38px] rounded-md bg-brand-500 hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors text-sm">{loading ? '...' : 'Générer'}</button>
        </div>
      </form>
      {svg && (
        <section className="grid md:grid-cols-2 gap-10 items-start">
          <div className="bg-neutral-900/60 p-8 rounded-xl border border-neutral-800 relative">
            <div className="absolute top-2 right-2 text-[10px] uppercase tracking-wider text-neutral-600">Preview</div>
            <div className="aspect-square flex items-center justify-center" dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Votre logo</h2>
            <p className="text-neutral-400 text-sm">Téléchargez le SVG pour l'utiliser où vous voulez. Relancez pour variantes.</p>
            <p className="text-neutral-400 text-xs">Provider: {(window as any).__provider}</p>
            <div className="flex gap-3">
              <button onClick={download} className="px-4 py-2 rounded-md bg-white text-black font-medium hover:bg-neutral-200 transition">Télécharger SVG</button>
              <button onClick={()=>onGenerate()} className="px-4 py-2 rounded-md border border-neutral-700 hover:bg-neutral-800 transition">Variante</button>
              <button onClick={()=>downloadPNG(undefined,1024,true)} className="px-4 py-2 rounded-md bg-brand-500 text-white font-medium hover:bg-brand-400 transition">PNG 1024</button>
              <button onClick={()=>downloadPDF()} className="px-4 py-2 rounded-md bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 transition">PDF</button>
              <button onClick={()=>downloadFavicons()} className="px-4 py-2 rounded-md bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 transition">Favicons ZIP</button>
            </div>
          </div>
        </section>
      )}
      {variants.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {variants.map((v,i) => (
            <button key={i} onClick={()=>setSvg(v)} className={`group relative border rounded-lg overflow-hidden aspect-square flex items-center justify-center ${svg===v?'border-brand-500':'border-neutral-800 hover:border-neutral-600'}`}>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 opacity-0 group-hover:opacity-100 transition" />
              <div className="w-full h-full p-2" dangerouslySetInnerHTML={{ __html: v }} />
              <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 border border-neutral-700 text-neutral-400">V{i+1}</span>
            </button>
          ))}
        </div>
      )}
      {store.history.length > 0 && (
        <section className="mt-24">
          <h3 className="text-lg font-medium mb-4">Historique</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {store.history.map(h => (
              <button key={h.id} onClick={()=>setSvg(h.svg)} className="group border border-neutral-800 hover:border-neutral-600 rounded-lg overflow-hidden aspect-square relative">
                <div className="w-full h-full p-1" dangerouslySetInnerHTML={{ __html: h.svg }} />
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] px-1 py-0.5 text-neutral-400 truncate">{h.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
