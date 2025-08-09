'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLogoStore } from '@/lib/store';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import * as UPNG from 'upng-js';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { Particles } from '@tsparticles/react';
import { generateLogo, generateLogoVariants } from '@/lib/generate';

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

  // UI animation refs
  const titleRef = useRef<HTMLHeadingElement|null>(null);
  const navRef = useRef<HTMLElement|null>(null);

  useEffect(()=>{
    if (titleRef.current){
      gsap.fromTo(titleRef.current.children, { y: 40, opacity:0 }, { y:0, opacity:1, stagger:0.05, duration:0.6, ease:'power3.out'});
    }
  },[]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (!navRef.current) return;
      navRef.current.classList.toggle('nav-solid', y > 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  // Showcase sample logos (client-side only)
  const showcase = useMemo(() => {
    const samples = [
      { name: 'NovaFlow', sector: 'SaaS' },
      { name: 'QuantumPeak', sector: 'AI' },
      { name: 'EchoForge', sector: 'Media' },
      { name: 'LumaCore', sector: 'Cloud' },
      { name: 'AstraPay', sector: 'Fintech' },
      { name: 'PixelMint', sector: 'Design' },
      { name: 'NeuroWave', sector: 'HealthTech' },
      { name: 'Skyline OS', sector: 'DevTools' }
    ];
    return samples.map(s => ({ ...s, svg: generateLogo({ name: s.name, sector: s.sector }) }));
  }, []);

  const features = [
    { title: 'Génération instantanée', desc: 'Obtenez un logo unique en quelques secondes.', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 12h7l-2 9L21 3h-7l2-9L3 12z" fill="#00A6E6"/></svg>
    ) },
    { title: 'Vectoriel pur', desc: 'SVG net, sans watermark, parfait pour le branding.', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 4h16v16H4z" stroke="#00A6E6"/><circle cx="8" cy="8" r="2" fill="#00A6E6"/></svg>
    ) },
    { title: 'Exports pro', desc: 'Téléchargez en PNG, PDF et pack de favicons.', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke="#00A6E6" strokeWidth="2"/></svg>
    ) },
    { title: 'Animations subtiles', desc: 'Une UX moderne et fluide en thème sombre.', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#00A6E6"/><path d="M3 12h18" stroke="#00A6E6"/></svg>
    ) },
    { title: 'Prévisualisation IA', desc: 'Activez GPT‑5 preview pour un style encore plus créatif.', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L6.5 20l2-7L3 9h7l2-7z" fill="#00A6E6"/></svg>
    ) },
    { title: 'Historique & variantes', desc: 'Revenez sur vos essais et créez des variantes à la volée.', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 5v6l4 2" stroke="#00A6E6" strokeWidth="2"/></svg>
    ) },
  ];

  const testimonials = [
    { name: 'Camille D.', role: 'Fondatrice, Fintech', quote: 'En 2 minutes j’avais un logo propre. Le PDF et les favicons ont fait gagner des heures à l’équipe.' },
    { name: 'Marc L.', role: 'Designer', quote: 'Le SVG est clean, modifiable, et les variantes sont inspirantes. Un vrai boost en phase d’idéation.' },
    { name: 'Sarah K.', role: 'CTO, HealthTech', quote: 'Super rapide pour prototyper une identité. Le thème sombre et les animations rendent l’expérience premium.' },
  ];

  const faqs = [
    { q: 'Puis-je utiliser le logo commercialement ?', a: 'Oui, les SVG générés sont libres d’utilisation. Vérifiez toutefois la singularité avant enregistrement légal.' },
    { q: 'Comment activer le mode IA ?', a: 'Activez le toggle GPT‑5 dans le formulaire. Si une clé est configurée côté serveur, une version IA sera essayée.' },
    { q: 'Le logo est-il vraiment vectoriel ?', a: 'Oui, nous produisons un SVG propre que vous pouvez éditer dans vos outils préférés.' },
  ];

  return (
    <main className="max-w-6xl mx-auto px-6 pb-24">
      {/* Top Navigation */}
      <nav ref={navRef} className="fixed top-0 left-0 right-0 z-20 transition-colors">
        <div className="mx-auto max-w-7xl px-6">
          <div className="h-14 flex items-center justify-between rounded-b-xl border-b border-neutral-900/70 bg-black/30 backdrop-blur-md">
            <a href="#top" className="font-semibold tracking-tight text-white">LogoMaker <span className="text-brand-400">AI</span></a>
            <div className="hidden md:flex items-center gap-6 text-sm text-neutral-300">
              <a href="#features" className="hover:text-white transition">Fonctionnalités</a>
              <a href="#showcase" className="hover:text-white transition">Showcase</a>
              <a href="#pricing" className="hover:text-white transition">Tarifs</a>
              <a href="#faq" className="hover:text-white transition">FAQ</a>
            </div>
            <a href="#try" className="inline-flex items-center justify-center h-9 px-3 rounded-md bg-brand-500 hover:bg-brand-400 text-sm font-medium">Commencer</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section id="top" className="relative pt-28 md:pt-32 mb-10">
        <Particles id="tsparticles" className="absolute inset-0 -z-10" options={{ fullScreen: { enable:false }, background: { color: { value:'transparent'} }, fpsLimit: 60, particles: { number: { value: 40 }, color: { value: '#00a6e6' }, links: { enable: true, color:'#0d3b4d' }, move: { enable: true, speed: 1 }, opacity: { value: { min:0.1, max:0.4 } }, size: { value: { min:1, max:3 } } } }} />
        <header className="text-center space-y-4 relative">
          <div className="absolute -inset-x-10 -top-20 h-80 bg-[radial-gradient(ellipse_at_top,rgba(0,166,230,0.15),transparent_60%)] blur-3xl -z-10" />
          <h1 ref={titleRef} className="text-4xl md:text-6xl font-semibold tracking-tight flex justify-center gap-1 bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent">
            {Array.from('LogoMaker AI').map((c,i)=>(<span key={i} className="inline-block">{c===' ' ? '\u00A0': c}</span>))}
          </h1>
          <p className="text-neutral-400 text-lg">Nom + Domaine → Logo unique instantané (0 watermark).</p>
        </header>

        {/* Live demo form */}
        <form id="try" onSubmit={onGenerate} className="grid gap-4 md:grid-cols-5 items-end mt-10">
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

        {/* Preview + actions */}
        {svg && (
          <motion.section initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }} className="grid md:grid-cols-2 gap-10 items-start mt-10">
            <div className="bg-neutral-900/60 p-8 rounded-xl border border-neutral-800 relative">
              <div className="absolute top-2 right-2 text-[10px] uppercase tracking-wider text-neutral-600">Preview</div>
              <div className="aspect-square flex items-center justify-center" dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Votre logo</h2>
              <p className="text-neutral-400 text-sm">Téléchargez le SVG pour l'utiliser où vous voulez. Relancez pour variantes.</p>
              <p className="text-neutral-400 text-xs">Provider: {(window as any).__provider}</p>
              <div className="flex flex-wrap gap-3">
                <button onClick={download} className="px-4 py-2 rounded-md bg-white text-black font-medium hover:bg-neutral-200 transition">Télécharger SVG</button>
                <button onClick={()=>onGenerate()} className="px-4 py-2 rounded-md border border-neutral-700 hover:bg-neutral-800 transition">Variante</button>
                <button onClick={()=>downloadPNG(undefined,1024,true)} className="px-4 py-2 rounded-md bg-brand-500 text-white font-medium hover:bg-brand-400 transition">PNG 1024</button>
                <button onClick={()=>downloadPDF()} className="px-4 py-2 rounded-md bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 transition">PDF</button>
                <button onClick={()=>downloadFavicons()} className="px-4 py-2 rounded-md bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 transition">Favicons ZIP</button>
              </div>
            </div>
          </motion.section>
        )}

        {/* Variants */}
        <AnimatePresence>
          {variants.length > 0 && (
            <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {variants.map((v,i) => (
                <button key={i} onClick={()=>setSvg(v)} className={`group relative border rounded-lg overflow-hidden aspect-square flex items-center justify-center ${svg===v?'border-brand-500':'border-neutral-800 hover:border-neutral-600'}`}>
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 opacity-0 group-hover:opacity-100 transition" />
                  <div className="w-full h-full p-2" dangerouslySetInnerHTML={{ __html: v }} />
                  <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 border border-neutral-700 text-neutral-400">V{i+1}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Features */}
      <section id="features" className="mt-24">
        <motion.h2 initial={{opacity:0, y:10}} whileInView={{opacity:1, y:0}} viewport={{ once: true }} transition={{ duration:0.4 }} className="text-2xl md:text-3xl font-semibold mb-6">Pensé pour un rendu pro</motion.h2>
        <div className="grid md:grid-cols-3 gap-4">
          {features.map((f, idx) => (
            <motion.div key={idx} initial={{opacity:0, y:8}} whileInView={{opacity:1, y:0}} viewport={{ once: true }} transition={{ duration:0.35, delay: idx*0.03 }} className="p-5 rounded-xl border border-neutral-800 bg-neutral-950/60 hover:border-neutral-700 transition group">
              <div className="flex items-start gap-3">
                <div className="mt-1">{f.icon}</div>
                <div>
                  <h3 className="font-medium text-neutral-100 group-hover:text-white">{f.title}</h3>
                  <p className="text-sm text-neutral-400 mt-1">{f.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Showcase */}
      <section id="showcase" className="mt-24">
        <motion.h2 initial={{opacity:0, y:10}} whileInView={{opacity:1, y:0}} viewport={{ once: true }} transition={{ duration:0.4 }} className="text-2xl md:text-3xl font-semibold mb-6">Exemples de rendus</motion.h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {showcase.map((s, i) => (
            <motion.div key={i} initial={{opacity:0, y:8}} whileInView={{opacity:1, y:0}} viewport={{ once: true }} transition={{ duration:0.35, delay: i*0.02 }} className="relative border border-neutral-800 rounded-xl bg-neutral-950/60 aspect-square overflow-hidden">
              <div className="w-full h-full p-2" dangerouslySetInnerHTML={{ __html: s.svg }} />
              <div className="absolute bottom-0 left-0 right-0 text-[11px] text-neutral-300 bg-black/40 px-2 py-1 flex items-center justify-between">
                <span className="truncate">{s.name}</span>
                <span className="text-neutral-500">{s.sector}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mt-24">
        <motion.h2 initial={{opacity:0, y:10}} whileInView={{opacity:1, y:0}} viewport={{ once: true }} transition={{ duration:0.4 }} className="text-2xl md:text-3xl font-semibold mb-6">Ils en parlent</motion.h2>
        <div className="grid md:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <motion.blockquote key={i} initial={{opacity:0, y:8}} whileInView={{opacity:1, y:0}} viewport={{ once: true }} transition={{ duration:0.35, delay: i*0.03 }} className="p-5 rounded-xl border border-neutral-800 bg-neutral-950/60">
              <p className="text-neutral-200">“{t.quote}”</p>
              <footer className="mt-3 text-sm text-neutral-400">— {t.name}, {t.role}</footer>
            </motion.blockquote>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mt-24">
        <motion.h2 initial={{opacity:0, y:10}} whileInView={{opacity:1, y:0}} viewport={{ once: true }} transition={{ duration:0.4 }} className="text-2xl md:text-3xl font-semibold mb-6">Tarification simple</motion.h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[{name:'Gratuit', price:'0€', features:['Génération illimitée','Exports SVG/PNG','Thème sombre premium'], cta:'Essayer'}, {name:'Pro', price:'9€', features:['Tout du gratuit','PDF + Favicons','Variantes avancées'], cta:'Passer en Pro'}, {name:'Teams', price:'29€', features:['Tout du Pro','Dossiers partagés','Support prioritaire'], cta:'Contacter ventes'}].map((p, i) => (
            <motion.div key={i} initial={{opacity:0, y:8}} whileInView={{opacity:1, y:0}} viewport={{ once: true }} transition={{ duration:0.35, delay: i*0.04 }} className={`p-6 rounded-xl border ${i===1?'border-brand-500/40 bg-neutral-950/80 shadow-[0_0_0_1px_rgba(0,166,230,0.2)]':'border-neutral-800 bg-neutral-950/60'}`}>
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <div className="text-2xl font-bold">{p.price}<span className="text-sm text-neutral-500">/mo</span></div>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-neutral-300">
                {p.features.map((f, fi) => (
                  <li key={fi} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-brand-500" />{f}</li>
                ))}
              </ul>
              <a href="#try" className={`mt-6 inline-flex items-center justify-center h-10 w-full rounded-md text-sm font-medium ${i===1?'bg-brand-500 hover:bg-brand-400 text-white':'bg-neutral-800 hover:bg-neutral-700'}`}>{p.cta}</a>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mt-24">
        <motion.h2 initial={{opacity:0, y:10}} whileInView={{opacity:1, y:0}} viewport={{ once: true }} transition={{ duration:0.4 }} className="text-2xl md:text-3xl font-semibold mb-6">FAQ</motion.h2>
        <div className="grid md:grid-cols-2 gap-4">
          {faqs.map((f, i) => (
            <details key={i} className="group rounded-xl border border-neutral-800 bg-neutral-950/60 p-5 open:bg-neutral-950/80">
              <summary className="cursor-pointer list-none flex items-center justify-between text-neutral-200">
                <span className="font-medium">{f.q}</span>
                <span className="ml-4 text-neutral-500 group-open:rotate-45 transition">+</span>
              </summary>
              <p className="mt-3 text-sm text-neutral-400">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-24">
        <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-950 to-neutral-900 p-8 md:p-12">
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-[radial-gradient(circle,rgba(0,166,230,0.15),transparent_60%)] blur-2xl" />
          <h3 className="text-2xl md:text-3xl font-semibold">Prêt à créer votre logo ?</h3>
          <p className="text-neutral-400 mt-2">Commencez gratuitement avec LogoMaker AI et obtenez un rendu pro en quelques secondes.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#try" className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-brand-500 hover:bg-brand-400 text-sm font-medium">Essayer maintenant</a>
            <a href="#features" className="inline-flex items-center justify-center h-10 px-4 rounded-md border border-neutral-700 hover:bg-neutral-800 text-sm font-medium">Voir les fonctionnalités</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-24 pt-8 border-t border-neutral-900/70 text-sm text-neutral-500 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>© {new Date().getFullYear()} LogoMaker AI. Tous droits réservés.</div>
        <div className="flex items-center gap-4">
          <a className="hover:text-neutral-300" href="#faq">Aide</a>
          <a className="hover:text-neutral-300" href="#pricing">Tarifs</a>
          <a className="hover:text-neutral-300" href="#top">Haut de page</a>
        </div>
      </footer>
    </main>
  );
}