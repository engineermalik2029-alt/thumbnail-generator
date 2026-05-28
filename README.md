# YouTube Thumbnail Generator

A Next.js 14 application that generates YouTube‑style thumbnails using AI.

## Features
- Choose between **DALL·E 3** and **Stable Diffusion XL**.
- Dark theme with glassmorphism UI.
- Copy‑able AI prompt and downloadable PNG thumbnail.
- Fully typed with TypeScript.

## Prerequisites
- Node.js 18+ (recommended)
- npm or yarn
- API keys for:
  - Anthropic (`ANTHROPIC_API_KEY`)
  - OpenAI (`OPENAI_API_KEY`)
  - Replicate (`REPLICATE_API_TOKEN`)

## Setup
```bash
# Clone the repo (if applicable)
# cd into the project directory
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

The app will be available at `http://localhost:3000`.

## Build
```bash
npm run build
npm start
```

## License
MIT
