import './globals.css';
import React from 'react';

export const metadata = {
  title: 'LogoMaker AI',
  description: 'Crée un logo remarquable en 2 clics.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-black text-neutral-100 antialiased min-h-screen font-sans selection:bg-brand-400/40 selection:text-white">
        {children}
      </body>
    </html>
  );
}
