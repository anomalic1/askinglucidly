# AskLucidly v1.0.0

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?logo=cloudflare)](https://pages.cloudflare.com/)
[![Naga API](https://img.shields.io/badge/LLM-Naga_API-blue)](https://naga.ac)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

AskLucidly is an open-source, premium, dark-mode AI search engine. It serves as a high-fidelity Perplexity clone built entirely on a **fully serverless edge architecture**. 

*Note: The frontend UI components and design system were adapted from [rashadphz/farfalle](https://github.com/rashadphz/farfalle). However, the entire backend architecture, data flow, and LLM implementation are 100% custom and completely different from Farfalle.*

---

## 🏗️ Deep-Dive Architecture

Unlike traditional AI wrappers that rely on heavy Python/FastAPI backends, PostgreSQL databases, and complex Docker deployments, AskLucidly is designed to be **ephemeral, stateless, and incredibly cheap to host**. 

### 1. The Frontend (Next.js)
The frontend is built with **Next.js 14 (App Router)**, Tailwind CSS, and Radix UI. 
* We have stripped out all of Farfalle's OpenAPI auto-generated clients, Server-Sent Events (SSE) streaming logic, and rigid backend dependencies.
* The frontend simply makes a standard `POST` request to our local `/api/chat` route and expects a standard JSON response containing the Markdown text and citations.
* The UI mimics streaming by instantly loading the full response and parsing the Perplexity-style citations `[1]`, `[2]` into interactive chips.

### 2. The Edge Proxy (Cloudflare Pages Functions)
To protect our API keys from being exposed to the client, we utilize **Cloudflare Pages Functions**. 
* The code inside `/functions/api/chat.ts` acts as a secure, serverless edge proxy. 
* When the Next.js frontend calls `/api/chat`, Cloudflare intercepts this and runs the edge function.
* The function securely injects the `NAGA_API_KEY`, makes the request to the upstream LLM provider, handles transient network errors (with built-in retry loops), and returns the sanitized JSON response to the frontend.

### 3. The LLM Provider (Naga API) & Dual Web-Search Strategy
We use [Naga API (api.naga.ac)](https://naga.ac) as our backend LLM provider, giving us access to premium models at a fraction of the cost. Because different models have different capabilities, our Cloudflare edge proxy implements a **dual web-search strategy**:

* **Native Search (`sonar:free`):** When the Perplexity Sonar model is selected, we use its native built-in web search tool. We don't need to run any external scrapers; Sonar handles the search and citation generation automatically.
* **Manual Search Context Injection (Llama & Nemotron):** When standard LLMs like `llama-3.3-70b-instruct:free` or `nemotron-3-ultra-550b` are selected, they lack native internet access. Our edge proxy intelligently detects this, halts the immediate LLM request, and manually queries the **Tavily API (`api.tavily.com`)** (via `@tavily/core`) to scrape live search results using advanced search depth. It then injects those results directly into the system prompt as context before querying the Naga LLM, effectively giving *any* open-source model high-quality web-search capabilities!

---

## 🚀 Extreme Build & Deployment Guide

### Prerequisites
* Node.js (v18+)
* npm, yarn, or pnpm
* A Cloudflare account (for deployment)
* A [Naga API Key](https://naga.ac)

### Step 1: Local Setup & Installation

Clone the repository and install the required dependencies. 
**Crucial:** You must use `--legacy-peer-deps` due to intentional React 18/19 peer dependency mismatches in the UI library components.

```bash
git clone https://github.com/90renrocraftcracksblogspotcom/askinglucidly.git
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
*Note: `NAGA_API_KEY` is required for all LLM generations. `TAVILY_API_KEY` is required for web search if you select a non-Sonar model (like Ling or Nemotron) from the dropdown.*

### Step 3: Running the Development Server

Start the Next.js development server:
```bash
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000). 
*How it works locally:* During `dev`, Next.js doesn't natively run Cloudflare Functions. However, our setup ensures that local `fetch` calls to `/api/chat` are seamlessly handled or rewritten so you can test the frontend UI. (For strict edge function testing, use Cloudflare's `wrangler pages dev`).

### Step 4: Deploying to Cloudflare Pages

Because we are using Cloudflare Pages Functions (`/functions` folder) instead of Next.js `/api` routes, this project is designed to be deployed instantly and for free on Cloudflare Pages.

1. Go to your Cloudflare Dashboard -> **Workers & Pages**.
2. Click **Create Application** -> **Pages** -> **Connect to Git**.
3. Select this repository.
4. **Configure Build Settings:**
   * **Framework preset:** Next.js
   * **Build command:** `npm run build`
   * **Build output directory:** `.next`
5. **Configure Environment Variables:**
   * Add `NAGA_API_KEY` to the Cloudflare Pages environment variables in the dashboard.
   * Add `TAVILY_API_KEY` to the environment variables (required if you intend to use non-Sonar models for web search).
6. Click **Save and Deploy**. Your app will be live globally in minutes.

---

## 📂 Project Structure Breakdown

```text
├── /functions          # Cloudflare Pages Edge Functions
│   └── /api/chat.ts    # Secure proxy to Naga API (handles retries & formatting)
├── /src
│   ├── /app            # Next.js App Router pages (Home, Search, History)
│   ├── /components     # UI Components (Adapted from Farfalle)
│   ├── /hooks          # React Query hooks (Customized for stateless JSON fetch)
│   └── /stores         # Zustand state management
├── /public             # Static assets and logos
└── tailwind.config.ts  # Theme and styling configuration
```

---

## 💾 Local Storage & Data Persistence

AskLucidly has been updated to use browser Local Storage to keep track of simple metrics (like guest message counts). For user chat histories, we will be pivoting towards robust browser-based Local Storage instead of relying on external databases like Yugabyte, ensuring a simplified deployment experience and keeping data securely on the user's device.

---

## 🤝 Open Source
Contributions are highly encouraged! If you want to build out the Firebase persistence layer, add user authentication, or re-implement Server-Sent Events (SSE) streaming for the Cloudflare proxy, please submit a Pull Request.

## 📄 License
This project is licensed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/) License.
