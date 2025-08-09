'use client';
import './globals.css';
import React, { useEffect } from 'react';
import Lenis from 'lenis';

// metadata moved to separate file (layout.metadata.tsx) if needed

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    function raf(time: number) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    return () => { /* @ts-ignore */ lenis.destroy?.(); };
  }, []);
  return (
    <html lang="fr" className="dark">
      <body className="bg-black text-neutral-100 antialiased min-h-screen font-sans selection:bg-brand-400/40 selection:text-white overflow-x-hidden">
        <div id="bg-root" className="fixed inset-0 -z-10 pointer-events-none" />
        {children}
      </body>
    </html>
  );
}
