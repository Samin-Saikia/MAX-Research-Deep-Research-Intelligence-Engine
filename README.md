# ⚡ MAX Research — Deep Research Intelligence Engine

<div align="center">

![Python](https://img.shields.io/badge/Python-3.7+-blue?style=flat-square&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-2.x-black?style=flat-square&logo=flask)
![Groq](https://img.shields.io/badge/Groq-LLaMA%203.3%2070B-orange?style=flat-square)
![Serper](https://img.shields.io/badge/Serper-Web%20Search-green?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-purple?style=flat-square)

**A locally-hosted AI research agent that autonomously searches the web, synthesizes results, and streams comprehensive reports in real time.**

</div>

---

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Features](#features)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the App](#running-the-app)
- [Analysis Modes](#analysis-modes)
- [File Support](#file-support)
- [Export Formats](#export-formats)
- [API Reference](#api-reference)
- [Architecture](#architecture)
- [UI Features](#ui-features)
- [Troubleshooting](#troubleshooting)
- [Author](#author)

---

## Overview

MAX Research is not a chatbot. It is a structured research engine. You give it a topic or a document, it searches the web, synthesizes the results, and produces a comprehensive, well-organized report — streamed to your screen in real time as it is generated.

The core pipeline is built around web search and **Groq** for fast language model inference. The app supports two search providers — **Serper** and **Tavily** — which can be used individually or together. A search dispatcher selects the active provider based on available API keys or the `SEARCH_PROVIDER` env var. The search layer fetches current, accurate information from the web. Groq's `llama-3.3-70b-versatile` model synthesizes that information into a structured report. This separation is what makes the system stable and predictable — there are no internal tool calls mid-generation, no mystery freezes, no unreliable compound model behavior.

Every report is structured. Every mode produces output with defined sections, not walls of unorganized prose. Reports can be exported immediately as Markdown, plain text, PDF, or Word — without copy-pasting.

---
## Interface Preview

<p align="center">

  <img src="assets\Screenshot_34.png" alt="MAXUS 
  Interface" width="900"/>
  <br>
  <br>
 
  <img src="assets\Screenshot_35.png" alt="MAXUS 
  Interface" width="900"/>

</p>

---
## How It Works

```
User submits topic
        │
        ▼
Search dispatcher fires 2–4 targeted queries via Serper and/or Tavily
        │
        ▼
Results collected, deduplicated, formatted as context block
        │
        ▼
Context + topic injected into Groq prompt
        │
        ▼
llama-3.3-70b-versatile streams the report via SSE
        │
        ▼
Frontend renders markdown in real time with live word count
        │
        ▼
User exports as MD / TXT / PDF / DOCX
```

Web search happens **before** generation starts. The language model receives complete search context upfront and generates without interruption. This is fundamentally different from compound/agentic models that trigger tool calls mid-stream, which causes generation to stall or freeze.

---

## Features

- **Real-time streaming** — report tokens appear as they are generated, with a live blinking cursor
- **Live web search** — Serper fetches current results before generation; the model always has up-to-date context
- **Four analysis modes** — Deep Research, Paper Crux, Docs Simplifier, Custom Analysis
- **File upload** — upload PDF, DOCX, TXT, or Markdown files as input context
- **Four export formats** — Markdown, plain text, PDF (zero-dependency custom writer), Word
- **Search status indicator** — header badge shows whether Serper is active
- **Search progress display** — live pills show each query running and completing with result counts
- **Session history** — last 20 reports saved to localStorage, click any to reload
- **Rendered and raw tabs** — toggle between formatted HTML view and raw markdown
- **Syntax-highlighted code blocks** — powered by Highlight.js (atom-one-dark theme)
- **Stats bar** — live word count, section count, generation time, source count
- **Keyboard shortcut** — `Ctrl+Enter` / `Cmd+Enter` submits from the topic field
- **Drag-and-drop file upload**
- **Copy to clipboard**
- **Works on Python 3.7 32-bit Windows** — no walrus operator, no emoji in code, compatible dependency set

---

## Project Structure

```
max-research/
│
├── app.py                  # Flask backend — all server logic
│   ├── Serper search pipeline
│   ├── Groq SSE streaming
│   ├── File extraction (PDF, DOCX, TXT, MD)
│   ├── MinimalPDF — zero-dependency PDF writer
│   ├── DOCX generation via python-docx
│   └── Export endpoints
│
├── .env                    # API keys — never commit this file
├── .gitignore
├── requirements.txt
│
├── static/
│   └── script.js           # All frontend JavaScript
│
└── templates/
    └── index.html          # Flask Jinja2 template — injects window.MODES
```

### Why this structure

Flask requires HTML templates to be in `templates/` for `render_template()` to find them. Static assets (JS, CSS) must be in `static/` so Flask can serve them at `/static/`. Jinja2 template variables like `{{ modes | tojson | safe }}` only work inside `templates/` — they are not processed in `static/` files. This is why `window.MODES` is injected via an inline `<script>` block in `index.html` and then read as `const MODES = window.MODES` at the top of `script.js`.

---

## Requirements

- Python 3.7 or higher (tested on 32-bit and 64-bit Windows, Linux, macOS)
- A Groq API key — free at [console.groq.com](https://console.groq.com)
- A Serper API key — free tier at [serper.dev](https://serper.dev) (2,500 searches/month)

---

## Installation

**1. Clone the repository**

```bash
git clone https://github.com/Samin-Saikia/MAX-Research-Deep-Research-Intelligence-Engine.git
cd MAX-Research-Deep-Research-Intelligence-Engine
```

**2. Install dependencies**

```bash
pip install flask groq python-dotenv python-docx PyPDF2 markdown beautifulsoup4 requests
```

Or using the requirements file:

```bash
pip install -r requirements.txt
```

> If you are on Python 3.7 32-bit Windows and encounter errors, install inside a virtual environment or add `--break-system-packages` if applicable.

**3. Set up your API keys** — see [Configuration](#configuration)

**4. Run** — see [Running the App](#running-the-app)

---

## Configuration

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key_here
SERPER_API_KEY=your_serper_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
SEARCH_PROVIDER=auto
FLASK_SECRET_KEY=any_random_string_for_sessions
```

| Variable | Required | Where to get it |
|---|---|---|
| `GROQ_API_KEY` | Yes | [console.groq.com](https://console.groq.com) — free |
| `SERPER_API_KEY` | No | [serper.dev](https://serper.dev) — free tier: 2,500/month |
| `TAVILY_API_KEY` | No | [app.tavily.com](https://app.tavily.com) — free tier: 1,000 credits/month |
| `SEARCH_PROVIDER` | No | `serper`, `tavily`, `both`, or blank for auto-detect based on which keys are present |
| `FLASK_SECRET_KEY` | No | Any random string; defaults to `dev-secret-key` |

> **Note on search:** The app supports two search providers — Serper and Tavily. If neither key is set, web search is skipped and the model uses its training knowledge only. The header badge will show **No Web Search** in red. If at least one key is set, search is active and the badge shows which provider(s) are in use. Set `SEARCH_PROVIDER` to force a specific provider, or leave it blank to auto-detect.

> **Never commit `.env` to Git.** It is already listed in `.gitignore`.

### Changing the model

The model is set near the top of `app.py`:

```python
MODEL = "llama-3.3-70b-versatile"
```

Other fast Groq models you can swap in:

| Model | Notes |
|---|---|
| `llama-3.3-70b-versatile` | Default. Best quality, still very fast |
| `llama-3.1-8b-instant` | Fastest, lower quality |
| `mixtral-8x7b-32768` | Good for long context |

---

## Running the App

```bash
python app.py
```

Open your browser at:

```
http://localhost:5000
```

To run on a different port, edit the last line of `app.py`:

```python
app.run(debug=True, port=5001)
```

To make it accessible on your local network:

```python
app.run(debug=True, host='0.0.0.0', port=5000)
```

---

## Analysis Modes

### 📡 Deep Research

The primary mode. Fires 4 search queries targeting the topic from different angles — general, recent developments, statistics, and future trends. Produces a full structured report across 9 sections:

1. Executive Summary
2. Historical Context & Background
3. Current State & Key Developments
4. Core Concepts & Mechanisms
5. Multiple Perspectives & Debates
6. Real-World Applications & Case Studies
7. Challenges & Limitations
8. Future Outlook & Emerging Trends
9. Conclusions & Key Takeaways

Best for: any topic you want to understand deeply — technical subjects, industries, concepts, events, people, policies.

---

### 🧬 Paper Crux

Upload a research paper (PDF or paste an abstract) and get back a plain-English breakdown. Fires 2 supporting search queries to provide additional context around the paper's topic.

Output sections:

1. The Core Question
2. Why It Matters
3. Methodology in Plain English
4. Key Findings
5. The Breakthrough (if any)
6. Limitations & Caveats
7. Practical Implications
8. Verdict
9. 5-Sentence Summary

Best for: literature reviews, quickly evaluating whether a paper is worth reading in full, explaining academic work to non-specialists.

---

### ⚡ Docs Simplifier

Paste or upload any documentation — a README, API reference, man page, or technical guide — and get back a structured cheat sheet. Works best with a file upload but also accepts pasted text.

Output sections:

1. What This Is (one line)
2. Quick Start
3. Core Concepts Only
4. Key Commands / Functions / Methods
5. The 20% You Will Use 80% of the Time
6. Gotchas & Pitfalls
7. Practical Examples
8. Ultra-condensed Cheat Sheet

Best for: onboarding to a new library or tool, creating internal documentation summaries, reducing a 50-page reference to something usable.

---

### 🎯 Custom Analysis

You write the instruction. The model follows it. The custom instruction field sets the analytical lens applied to the topic. Fires 3 search queries.

Example combinations:

| Topic | Custom Instruction |
|---|---|
| A startup's pitch deck (uploaded PDF) | Analyze as a skeptical Series A investor |
| A country's economic policy | Compare against IMF recommendations |
| A codebase README | Identify security concerns and technical debt |
| A news article | Identify logical fallacies and unsupported claims |

---

## File Support

### Input formats

| Format | How it is processed |
|---|---|
| `.pdf` | Text extracted page-by-page via PyPDF2 |
| `.docx` / `.doc` | Paragraphs extracted via python-docx |
| `.txt` | Read and decoded as UTF-8 |
| `.md` | Read directly, passed as-is to the model |

Files can be dragged and dropped onto the upload area or selected via the file picker. The first 12,000 characters of extracted text are sent to the model — enough for most papers and documentation files.

---

## Export Formats

| Format | Notes |
|---|---|
| `.md` | Raw markdown — works in Obsidian, Notion, Typora, GitHub |
| `.txt` | Plain text with all markdown formatting stripped |
| `.pdf` | Generated by the built-in `MinimalPDF` writer — no external library needed |
| `.docx` | Fully formatted Word document with heading styles, bold/italic, monospace code, and bullet lists |

### MinimalPDF

MAX Research ships with a custom zero-dependency PDF writer called `MinimalPDF`, built entirely from Python's standard library. It generates valid PDF 1.4 using the 14 standard Type1 fonts — no fpdf2, no reportlab, no compatibility issues on Python 3.7 32-bit Windows. It supports title blocks, heading levels 1–4, word-wrapped paragraphs, bullet points, code blocks with grey background, horizontal rules, and automatic page breaks.

---

## API Reference

### `GET /`
Serves the main UI.

---

### `GET /api/modes`
Returns all mode definitions.

**Response:**
```json
{
  "deep_research": {
    "name": "Deep Research",
    "description": "...",
    "system": "..."
  }
}
```

---

### `GET /api/search-status`
Returns which search providers are configured.

**Response:**
```json
{ "serper_enabled": true, "tavily_enabled": false, "search_provider": "auto" }
```

---

### `POST /api/research/stream`
Main research endpoint. Returns a Server-Sent Events stream.

**Body:** `multipart/form-data`

| Field | Required | Description |
|---|---|---|
| `mode` | Yes | `deep_research`, `paper_crux`, `docs_simplifier`, or `custom` |
| `topic` | Yes* | The research topic or query |
| `file` | No | Uploaded file (PDF, DOCX, TXT, MD) |
| `custom_instruction` | No | Used in `custom` mode |

*Required unless a file is uploaded.

**SSE event stream:**

```
data: {"type": "status", "message": "Searching the web...", "queries": ["q1", "q2"]}
data: {"type": "search_done", "query": "q1", "count": 6}
data: {"type": "start", "mode": "deep_research", "topic": "..."}
data: {"type": "chunk", "text": "## Executive Summary\n\n"}
data: {"type": "done", "full_content": "## Executive Summary\n\n..."}
data: {"type": "error", "message": "..."}
```

---

### `POST /api/export`
Exports a finished report.

**Body:** `application/json`

```json
{
  "content": "## Report in markdown...",
  "title": "Report Title",
  "format": "pdf"
}
```

`format` accepts: `md`, `txt`, `pdf`, `docx`

**Response:** File attachment.

---

## Architecture

### Backend (`app.py`)

| Component | Responsibility |
|---|---|
| `MODES` dict | Stores all mode metadata and system prompts |
| `serper_search()` | Calls Serper API, handles knowledge graph, answer box, organic results |
| `tavily_search()` | Calls Tavily API with advanced search depth, normalises to shared result schema |
| `web_search()` | Dispatcher — routes to Serper, Tavily, or both based on config and available keys |
| `build_search_queries()` | Generates mode-specific query sets |
| `format_search_context()` | Deduplicates results, formats as structured context block |
| `extract_text_from_file()` | PDF, DOCX, TXT, MD extraction |
| `build_prompt()` | Assembles final user prompt from context, file content, and topic |
| `MinimalPDF` | Zero-dependency PDF writer class |
| `generate_pdf_from_markdown()` | Parses markdown line-by-line, routes to MinimalPDF methods |
| `generate_docx_from_markdown()` | Builds Word document via python-docx |
| `add_formatted_run()` | Handles inline bold/italic/code runs in Word |
| `/api/research/stream` | SSE endpoint — runs search then streams Groq generation |
| `/api/export` | Converts markdown to requested file format |

### Frontend (`script.js`)

| Component | Responsibility |
|---|---|
| `window.MODES` | Injected by Flask in `index.html`, read by `script.js` |
| `checkSearchStatus()` | Polls `/api/search-status` on load, updates header badge |
| `renderModes()` | Builds mode selector cards from `MODES` |
| `selectMode()` | Switches active mode, updates placeholder, shows custom instruction field |
| `submitResearch()` | Builds FormData, opens fetch stream, delegates to `handleEvent()` |
| `handleEvent()` | Routes SSE events to appropriate UI updates |
| `renderOutput()` | Runs `marked.parse()` and `hljs` highlighting, auto-scrolls |
| `exportReport()` | POSTs to `/api/export`, triggers browser file download |
| `saveToHistory()` / `loadHistory()` | Persists last 20 reports to localStorage |

### Request lifecycle

```
submitResearch()
  → POST /api/research/stream
      → serper_search() × N queries         [server: fetch web results]
      → SSE: status, search_done events     [→ browser: update pills]
      → build_prompt()                      [server: assemble context]
      → Groq stream                         [server: generate report]
      → SSE: start, chunk, done events      [→ browser: render markdown]
  → exportReport() (optional)
      → POST /api/export
      → browser file download
```

---

## UI Features

| Feature | Description |
|---|---|
| Search badge | Green if any search provider is active (shows which), red if none configured |
| Search pills | One per query — blue while searching, green with count when done |
| Status messages | Contextual updates between search and generation phases |
| Live streaming | Tokens appear as generated with a blinking cursor |
| Rendered / Raw tabs | Toggle between formatted HTML and raw markdown |
| Stats bar | Word count, section count, elapsed time, total sources |
| Export bar | Appears after generation — one click per format |
| Copy button | Copies raw markdown to clipboard |
| Session history | Last 20 reports with relative timestamps, click to reload |
| Drag-and-drop | Drop files anywhere on the upload zone |
| Keyboard shortcut | `Ctrl+Enter` or `Cmd+Enter` submits the form |

---

## Troubleshooting

**`AuthenticationError` on first request**
Your `GROQ_API_KEY` is wrong, missing, or has trailing whitespace. Verify it in the Groq console.

**Search badge shows red**
Neither `SERPER_API_KEY` nor `TAVILY_API_KEY` is set in `.env`. The app still works without them — search is just skipped.

**`ImportError: No module named X`**
Run `pip install -r requirements.txt` again in the correct Python environment.

**Streaming appears all at once**
A browser extension is buffering SSE responses. Disable extensions or use a private window.

**Port 5000 already in use**
Change the port in the last line of `app.py`: `app.run(debug=True, port=5001)`

**`script.js` returning 404**
Check the path in `index.html`. Use `/static/script.js` if the file is directly in `static/`, or `/static/js/script.js` if it is inside a subfolder.

**Jinja2 variable not working in script.js**
Flask does not process Jinja2 in `static/` files. Inject `window.MODES = {{ modes | tojson | safe }};` in `index.html` and read it as `const MODES = window.MODES;` at the top of `script.js`.

**Functions undefined in script.js**
Never use `onclick="..."` attributes that reference functions from an external script — the HTML attribute executes before the script finishes loading. Use `addEventListener` inside `DOMContentLoaded` instead.

---

## Author

**Samin Saikia**

Python developer focused on backend systems, AI agents, and practical software tools.

- GitHub: [github.com/Samin-Saikia](https://github.com/Samin-Saikia)
- LinkedIn: [linkedin.com/in/samin-saikia-b7660b3a1](https://www.linkedin.com/in/samin-saikia-b7660b3a1/)

---

## License

MIT — see `LICENSE` for details.