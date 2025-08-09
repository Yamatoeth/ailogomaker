# LogoMaker AI (Prototype)

Crée un logo vectoriel original en quelques secondes : entrez le nom de votre projet et un secteur, obtenez un SVG propre (sans watermark) que vous pouvez réitérer pour variantes.

## Stack
- Next.js 14 (app router)
- TypeScript
- Tailwind CSS (thème sombre)
- Génération SVG pseudo-algorithmique (remplaçable par un backend IA)

## Démarrage

```bash
npm install
npm run dev
```

Ouvrir http://localhost:3000

## Remplacer la génération par une IA
Implementez un appel dans `src/lib/generate.ts` vers votre service (ex: endpoint qui retourne un SVG) et gardez l'API stable.

## Intégration IA
Mettre dans `.env.local` :
```
OPENAI_API_KEY=sk-xxxx
ENABLE_GPT5_PREVIEW=true
AI_MODEL=gpt-4o-mini
```
Lancer avec:
```
npm run dev:ai
```
Activer le toggle GPT‑5 dans l'UI pour utiliser le modèle. Fallback local si échec.

## Déploiement Vercel
1. Fork / push le repo sur GitHub
2. Aller sur https://vercel.com/import et sélectionner le repo
3. Variables d'environnement (Project Settings > Environment Variables):
   - ENABLE_GPT5_PREVIEW=true
   - OPENAI_API_KEY=sk-xxxx (optionnel)
   - AI_MODEL=gpt-4o-mini (optionnel)
   - AI_API_URL / AI_API_KEY si backend custom
4. Build command: `npm run build` (défaut) – Output dir: `.next`
5. Déployer. L'URL fournie sert de base pour tests.

Astuce: utiliser le script local
```bash
vercel --prod
```
(si CLI installée) après `npm i -g vercel`.

## Prochaines idées
- Prompt vers modèle de génération vectorielle
- Galerie de variantes
- Export PNG / PDF
- Palette éditable + typographies
- Sauvegarde cloud + partage

MIT License.
