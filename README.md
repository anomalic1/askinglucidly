# AskLucidly v1.1.0

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?logo=cloudflare)](https://pages.cloudflare.com/)
[![Naga API](https://img.shields.io/badge/LLM-Naga_API-blue)](https://naga.ac)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

AskLucidly is an open-source, premium, dark-mode AI search engine. It serves as a high-fidelity Perplexity clone built entirely on a **fully serverless edge architecture**.

*Note: The frontend UI components and design system were adapted from [rashadphz/farfalle](https://github.com/rashadphz/farfalle). However, the entire backend architecture, data flow, and LLM implementation are 100% custom and completely different from Farfalle.*

---

## ✨ What's New in v1.1.0

* **Real streaming** — answers and reasoning tokens now stream live from the edge proxy (NDJSON), replacing the old fake word-by-word typewriter. You watch the answer build as the model writes it.
* **Live thinking panel** — models that expose reasoning deltas (e.g. Nemotron Ultra, Lightning) stream their thinking into a collapsible "Thinking" panel with a blinking cursor, so waiting never feels dead.
* **Research & DeepSearch modes** — a new mode selector next to the model picker:
  * **Ask** — fast, single-round answers (default).
  * **Research** — multi-round agentic search: the model plans follow-up queries, runs a second Tavily round to fill information gaps, and synthesizes a fully-cited report.
  * **DeepSearch** — research turned up to 11: more sources (up to 15), raw page content injection, and higher generation limits.
* **Fixed system prompts on every model** — the curated prompts in [`/system_prompts`](./system_prompts) (`askinglucidly.md` for Ask mode, `deep-research.md` for Research/DeepSearch) are now compiled into the edge function and applied to **all** models, including Sonar.
* **Fixed Sonar RAG** — the Perplexity Sonar path previously used the legacy `/v1/responses` endpoint with no system prompt and no history. It now goes through the OpenAI-compatible chat endpoint with system prompt, conversation history, streaming, and citation extraction (with a URL-scraping fallback so citations always render).
* **Fixed history 404s** — chat history links now always resolve. A Cloudflare `_redirects` rule serves the `/search` app shell for every thread URL on the static export.
* **Conversation history** — follow-ups now send the last 10 messages to the model, so the LLM actually remembers your thread.

---

## 🏗️ Deep-Dive Architecture

Unlike traditional AI wrappers that rely on heavy Python/FastAPI backends, PostgreSQL databases, and complex Docker deployments, AskLucidly is designed to be **ephemeral, stateless, and incredibly cheap to host**.

### 1. The Frontend (Next.js)
The frontend is built with **Next.js 15 (App Router)**, Tailwind CSS, and Radix UI.
* The frontend makes a `POST` request to our local `/api/chat` route and consumes a **streaming NDJSON response** (newline-delimited JSON events: `status` → `sources` → `agent` → `thinking`/`text` → `done`).
* Citations render as interactive chips, the thinking panel streams reasoning live, and research modes show a step-by-step timeline of the agentic search.

### 2. The Edge Proxy (Cloudflare Pages Functions)
To protect our API keys from being exposed to the client, we utilize **Cloudflare Pages Functions**.
* The code inside `/functions/api/chat.ts` acts as a secure, serverless edge proxy.
* When the Next.js frontend calls `/api/chat`, Cloudflare intercepts this and runs the edge function.
* The function securely injects the `NAGA_API_KEY`, runs the search strategy for the selected mode, streams tokens from the upstream LLM straight through to the client, and handles transient network errors (with built-in retry loops).

### 3. The LLM Provider (Naga API) & Search Strategy
We use [Naga API (api.naga.ac)](https://naga.ac) as our backend LLM provider, giving us access to premium models at a fraction of the cost. Every request includes the curated system prompt from `/system_prompts`:

* **Ask + Sonar (`sonar:free`)** — Sonar's native web search handles retrieval; we stream the response and lift citations from the stream's annotations (falling back to scraping cited URLs from the answer text).
* **Ask + any other model** — the proxy queries the **Tavily API** for live search results and injects them into the user message as numbered search context, giving *any* open-source model high-quality web-search capabilities.
* **Research / DeepSearch** — multi-round agentic search, powered by the `deep-research.md` system prompt: round 1 runs the original query, then the model proposes follow-up queries that are searched in parallel, then everything is synthesized into one cited report shown with a live search timeline.

### 4. Prompt Management
The markdown files in `/system_prompts` are the **single source of truth** for all model behavior. A small sync script compiles them into `functions/api/prompts.gen.ts` at build time (Cloudflare Functions can't read files from disk at runtime):

```bash
npm run sync-prompts   # also runs automatically before dev/build
```

Edit `askinglucidly.md` (Ask mode) or `deep-research.md` (Research/DeepSearch modes), run the script, deploy — every model picks up the change.

---

## 🚀 Build & Deployment Guide

### Prerequisites
* Node.js (v18+)
* npm, yarn, or pnpm
* A Cloudflare account (for deployment)
* A [Naga API Key](https://naga.ac)

### Step 1: Local Setup & Installation

Clone the repository and install the required dependencies.
**Crucial:** You must use `--legacy-peer-deps` due to intentional React 18/19 peer dependency mismatches in the UI library components.

```bash
git clone https://github.com/anomalic1/askinglucidly.git
cd askinglucidly
npm install --legacy-peer-deps
```

### Step 2: Environment Configuration

Create a local environment file.
```bash
cp .env.example .env.local
```

Open `.env.local` and add your API keys:
```env
NAGA_API_KEY=your_naga_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
```
*Note: `NAGA_API_KEY` is required for all LLM generations. `TAVILY_API_KEY` is required for web search with non-Sonar models and for Research/DeepSearch modes on any model.*

### Step 3: Running the Development Server

Start the Next.js development server:
```bash
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000).
*How it works locally:* During `dev`, Next.js doesn't natively run Cloudflare Functions. To test the edge proxy locally, use Cloudflare's `wrangler pages dev`.

### Step 4: Deploying to Cloudflare Pages

Because we are using Cloudflare Pages Functions (`/functions` folder) instead of Next.js `/api` routes, this project is designed to be deployed instantly and for free on Cloudflare Pages.

1. Go to your Cloudflare Dashboard -> **Workers & Pages**.
2. Click **Create Application** -> **Pages** -> **Connect to Git**.
3. Select this repository.
4. **Configure Build Settings:**
   * **Framework preset:** Next.js
   * **Build command:** `npm run build` (this regenerates the system prompt bundle automatically)
   * **Build output directory:** `out`
5. **Configure Environment Variables:**
   * Add `NAGA_API_KEY` to the Cloudflare Pages environment variables in the dashboard.
   * Add `TAVILY_API_KEY` to the environment variables (required for non-Sonar web search and Research/DeepSearch modes).
6. Click **Save and Deploy**. Your app will be live globally in minutes.

The thread view is a real static page served at `/search?t=<threadId>`, so chat history links work on the static export with no server-side routing. The `public/_redirects` file 301-redirects legacy `/search/<id>` URLs to the new query-param format.

---

## 📂 Project Structure Breakdown

```text
├── /functions              # Cloudflare Pages Edge Functions
│   └── /api
│       ├── chat.ts         # Streaming proxy: search strategy, RAG, retries, NDJSON stream
│       └── prompts.gen.ts  # AUTO-GENERATED system prompts (from /system_prompts)
├── /scripts
│   └── sync-prompts.mjs    # Compiles /system_prompts/*.md into functions/api/prompts.gen.ts
├── /system_prompts         # Single source of truth for all model behavior
│   ├── askinglucidly.md    # Ask mode system prompt (all models)
│   └── deep-research.md    # Research / DeepSearch system prompt (all models)
├── /src
│   ├── /app                # Next.js App Router pages (Home, Search, History)
│   ├── /components         # UI Components (Adapted from Farfalle + custom)
│   │   ├── mode-selection.tsx    # Ask / Research / DeepSearch selector
│   │   └── thinking-stream.tsx   # Live reasoning panel
│   ├── /hooks              # Chat streaming hook, history, threads
│   └── /stores             # Zustand state management
├── /public
│   └── _redirects          # 301s legacy /search/<id> URLs to /search?t=<id>
└── tailwind.config.ts      # Theme and styling configuration
```

---

## 💾 Local Storage & Data Persistence

Chat histories, threads, model and mode preferences are persisted to browser Local Storage via Zustand — no external database required, and data stays on the user's device. History links resolve client-side from the store.

---

## 🤝 Open Source

AskLucidly is 100% open source — the site itself says so, and we mean it. Contributions are highly encouraged! Great places to start:

* Re-implementing the Firebase persistence layer
* User authentication improvements
* New search providers or deeper research strategies
* UI polish

Please submit a Pull Request.

## 📄 License
This project is licensed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/) License.
