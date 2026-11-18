<p align="center">
  <img src="mobile/assets/icon.png" alt="2ndGM Logo" width="100"/>
</p>

<h1 align="center">2ndGM — AI Chess Lab</h1>

<p align="center">
  A full-stack mobile chess training platform powered by Stockfish, Google Gemini AI, Neo4j, and PostgreSQL.<br/>
  Deep analysis · Grandmaster-style coaching · Spaced-repetition tactics · Opening repertoire graphs.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi"/>
  <img src="https://img.shields.io/badge/Mobile-Expo%20%2F%20React%20Native-000020?style=flat-square&logo=expo"/>
  <img src="https://img.shields.io/badge/Engine-Stockfish-B58863?style=flat-square"/>
  <img src="https://img.shields.io/badge/AI-Google%20Gemini-4285F4?style=flat-square&logo=google"/>
  <img src="https://img.shields.io/badge/DB-PostgreSQL%20%2B%20Neo4j-336791?style=flat-square&logo=postgresql"/>
  <img src="https://img.shields.io/badge/License-All%20Rights%20Reserved-red?style=flat-square"/>
</p>

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Core Capabilities](#2-core-capabilities)
3. [System Architecture](#3-system-architecture)
4. [Directory Structure](#4-directory-structure)
5. [Tech Stack](#5-tech-stack)
6. [Local Setup — Backend](#6-local-setup--backend)
7. [Local Setup — Mobile](#7-local-setup--mobile)
8. [Environment Variables](#8-environment-variables)
9. [API Reference](#9-api-reference)
10. [Author](#10-author)

---

## 1. Project Overview

**2ndGM** is a cross-platform AI chess training application built for serious improvers. It pairs a high-performance Python backend — running Stockfish engine analysis via `python-chess` — with a React Native / Expo mobile client. Every feature is backed by live data: there is no mock or stubbed analysis. The name "2ndGM" reflects the goal of getting the user to play as though a Grandmaster is sitting beside them.

The backend exposes a RESTful FastAPI service that orchestrates:
- Concurrent, semaphore-bounded Stockfish analysis (up to 4 plies simultaneously)
- Google Gemini 1.5 Flash AI coaching with JSON-mode structured responses
- PostgreSQL (Supabase) for game history, puzzle attempts, and spaced-repetition state
- Neo4j AuraDB for a live opening-repertoire property graph (positions as nodes, moves as weighted edges)

The mobile client is an Expo-managed React Native app with file-based routing (Expo Router), Zustand state management, and Victory Native charts. AsyncStorage provides offline resilience for repertoire data.

---

## 2. Core Capabilities

### 🔬 Game Analysis — PGN Analyzer

Paste any PGN string and receive per-move Stockfish evaluation at configurable depth (default depth 20, max 30). Every half-move is independently classified using centipawn-delta (ΔCP) rules against the Lichess accuracy formula:

$$\text{accuracy} = 103.1668 \cdot e^{-0.04354 \cdot \Delta CP} - 3.1668$$

| Classification | Condition |
|---|---|
| **Brilliant !!** | Sacrifice move; ΔCP < 15; advantage maintained or expanded |
| **Great !** | Near-only move to hold advantage; within 15cp of best |
| **Best / Excellent** | ΔCP < 15 |
| **Inaccuracy ?!** | ΔCP ≥ 50 |
| **Mistake ?** | ΔCP ≥ 100 |
| **Blunder ??** | ΔCP ≥ 200 or result flip (win→draw / draw→loss) |
| **Forced** | Only one legal move — not evaluated |

The response includes per-player accuracy percentages, top-3 engine lines per position (MultiPV), centipawn loss per move, and a game-level summary (blunders, mistakes, inaccuracies, brilliant moves, total plies).

---

### 🤖 AI Sparring & Endgame Lab

Play live games against a Stockfish bot scaled to a target Elo (1200 → 2500+). Lower Elo levels apply `UCI_LimitStrength` with organic blunder injection — randomised selection of suboptimal moves — to simulate realistic human opponents.

**Elo scaling:**

| Elo | Depth | Blunder Rate |
|---|---|---|
| 1200 | 1 | 15% |
| 1500 | 3 | 8% |
| 1800 | 6 | 3% |
| 2000 | 10 | 1% |
| 2200 | 15 | 0% |
| 2500 | 20 | 0% (no limit strength) |

**Defiance Mode** removes all strength limits and runs full-depth Stockfish at 3200+ effective Elo.

The **Endgame Lab** ships with four pre-loaded classical positions accessible as dedicated drills:
- Lucena Position (R+P endgame — build a bridge)
- Philidor Position (R+P endgame — passive defence)
- King + Pawn Opposition
- Two Bishops Mate

---

### 🧩 Leitner Spaced-Repetition Puzzles

Puzzle delivery follows a four-box Leitner scheduler. Three consecutive correct solves in the same box advance the puzzle to Box 3. A single failure resets to Box 0.

| Box | Description | Next Review |
|---|---|---|
| 0 | New / failed | +4 hours |
| 1 | 1 correct | +24 hours |
| 2 | 3 consecutive correct | +48 hours |
| 3 | Mastered — graduated | +7 days |

Puzzles are filterable by tactical motif: **pin, fork, skewer, deflection, decoy, discovered attack, zwischenzug, mating net**.

The puzzle queue always serves the highest-priority overdue puzzle first (lowest box, oldest review date), falling back to fresh unseen puzzles when no overdue items exist.

---

### 📖 Opening Repertoire & Active Recall

Opening lines are stored in a **Neo4j property graph**:

```
(:Position {fen, eco, name}) -[:MOVE {san, frequency, masterWinRate}]-> (:Position)
```

Tracks are saved via `POST /api/repertoire/track` using `MERGE` queries — no duplicate nodes or edges are created regardless of how many games traverse the same lines.

The **Active Recall** trainer plays through saved repertoire lines move-by-move. When a move is played:
- If it matches a known repertoire variation → it is accepted and the opponent auto-responds with the highest-frequency reply from the graph
- If it deviates → Gemini AI coach fires a targeted explanation of the deviation

Variation data is cached in AsyncStorage for offline resilience — the app can display known lines without a network connection.

---

### 🧪 Blunder Lab

After game analysis, positions two plies before any ΔCP ≥ 200 blunder can be saved to a dedicated `blunder_lab` table via `POST /api/puzzles/blunders`. These are surfaced as custom drill positions on the Blunder Lab screen, letting users revisit and fix their own recurring mistake patterns.

---

### 📊 Telemetry Dashboard

Three live charts aggregated from PostgreSQL game and puzzle data, with safe zero-value defaults for new accounts:

**Cognitive Fatigue Curve** — Average accuracy per ply bucket (width 2, plies 1–60). Reveals at which move number a player's accuracy begins to decay, exposing time-pressure and concentration patterns.

**Chronobiological Performance** — Win rate, average accuracy, and tilt probability per hour of day across all recorded games. Identifies peak performance windows and late-night tilt risk.

**Tactical Radar Map** — Puzzle solve rate across all 8 tactical motif categories, displayed as a radar/spider chart. Surfaces systematic pattern-recognition blind spots.

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Mobile Client                     │
│            Expo / React Native (TypeScript)         │
│                                                     │
│  Tabs:    Home · Analyze · Puzzles · Repertoire     │
│           Profile (Telemetry)                       │
│  Screens: Sparring · Active Recall · Blunder Lab    │
│           OTB Clock                                 │
│  State:   Zustand stores + AsyncStorage cache       │
│  HTTP:    axios → utils/api.ts (apiClient)          │
└──────────────────────┬──────────────────────────────┘
                       │  HTTP / REST
                       │  EXPO_PUBLIC_API_BASE_URL
                       ▼
┌─────────────────────────────────────────────────────┐
│                 FastAPI Backend                     │
│                 Python 3.11+, uvicorn               │
│                                                     │
│  POST /api/analyze        PGN → ply analysis        │
│  POST /api/coach          Gemini AI coaching        │
│  GET  /api/puzzles/*      Leitner puzzle delivery   │
│  POST /api/puzzles/*      Attempt logging           │
│  GET  /api/repertoire/*   Neo4j graph queries       │
│  POST /api/sparring/move  Elo-scaled bot response   │
│  GET  /api/telemetry/*    PostgreSQL aggregations   │
│  GET  /health             Liveness probe            │
└──────┬──────────┬──────────────┬────────────────────┘
       │          │              │
       ▼          ▼              ▼
┌──────────┐ ┌──────────────────────────────────────┐
│Stockfish │ │ PostgreSQL (Supabase)                 │
│ binary   │ │                                      │
│ asyncio  │ │  puzzles · puzzle_attempts            │
│ popen_   │ │  puzzle_leitner · blunder_lab         │
│ uci      │ │  game_analyses · move_analyses        │
└──────────┘ └──────────────────────────────────────┘
             ┌──────────────────────────────────────┐
             │ Neo4j AuraDB                         │
             │ (:Position)-[:MOVE]->(:Position)     │
             └──────────────────────────────────────┘
             ┌──────────────────────────────────────┐
             │ Google Gemini 1.5 Flash              │
             │ JSON-mode · async generate_content   │
             └──────────────────────────────────────┘
```

**Analysis request lifecycle:**
1. Mobile POSTs PGN to `POST /api/analyze`
2. `analyze.py` parses PGN into `(board_before, move)` tuples via `python-chess`
3. Up to 4 plies analysed concurrently via `asyncio.Semaphore(4)`
4. Per ply: MultiPV Stockfish analysis before the move, then single-PV analysis after
5. `classification.py` resolves ΔCP and applies classification rules
6. `compute_game_summary()` aggregates per-player accuracy and error counts
7. `AnalyzeResponse` JSON returned — mobile renders eval bar, move list, engine lines

---

## 4. Directory Structure

```
2ndGM Chess App/
├── backend/
│   ├── main.py                      # App entry point, CORS, lifespan, router registration
│   ├── run.py                       # Dev launcher (Windows-compatible)
│   ├── requirements.txt
│   ├── .env.example
│   ├── .gitignore
│   │
│   ├── db/
│   │   ├── postgres.py              # Async SQLAlchemy engine + session factory (asyncpg)
│   │   └── neo4j_client.py          # Neo4j async driver singleton + MERGE queries
│   │
│   ├── models/
│   │   └── schemas.py               # All Pydantic v2 request/response models
│   │
│   ├── routers/
│   │   ├── analyze.py               # POST /api/analyze — concurrent ply analysis
│   │   ├── coach.py                 # POST /api/coach — Gemini AI coaching
│   │   ├── puzzles.py               # Leitner queue, attempt logging, blunder lab
│   │   ├── repertoire.py            # Neo4j track save, variation fetch, analytics
│   │   ├── sparring.py              # Elo-scaled bot moves, endgame library
│   │   └── telemetry.py             # PostgreSQL dashboard aggregations
│   │
│   └── services/
│       ├── stockfish_service.py     # asyncio UCI wrapper — analyse_position(), start(), stop()
│       ├── gemini_service.py        # Gemini 1.5 Flash JSON-mode coach
│       ├── classification.py        # ΔCP classification + Lichess accuracy formula
│       ├── sparring_service.py      # Elo config map, blunder injection, endgame library
│       └── pgn_service.py           # PGN parse, FEN validation, solution verification
│
└── mobile/
    ├── app.json                     # Expo config (slug: secondgm, bundle: com.secondgm.chesslab)
    ├── eas.json                     # EAS Build profiles
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    ├── .gitignore
    │
    ├── app/                         # Expo Router — file-based routes
    │   ├── _layout.tsx              # Root layout (fonts, SafeAreaProvider, Stack)
    │   ├── (tabs)/
    │   │   ├── _layout.tsx          # Tab bar (Home, Analyze, Puzzles, Repertoire, Profile)
    │   │   ├── index.tsx            # Home dashboard + interactive quick-play board
    │   │   ├── analyze.tsx          # PGN Analyzer (board, move list, engine lines, coach FAB)
    │   │   ├── puzzles.tsx          # Tactical Engine — Leitner queue, Blunder Lab, Endgame Library
    │   │   ├── repertoire.tsx       # Opening Repertoire — saved track cards
    │   │   └── profile.tsx          # Telemetry Dashboard (3 live charts)
    │   ├── combat/
    │   │   └── sparring-session.tsx # Live sparring board + endgame drill
    │   ├── repertoire/
    │   │   └── active-recall.tsx    # Active Recall trainer (repertoire vs. deviation)
    │   ├── puzzle-board/
    │   │   └── index.tsx            # Puzzle solving board
    │   ├── repertoire/
    │   │   └── browser.tsx          # Opening explorer — build & save new tracks
    │   ├── blunder-lab/
    │   │   └── index.tsx            # Blunder Lab list screen
    │   └── otb-clock/
    │       └── index.tsx            # Over-the-board clock with increment support
    │
    ├── components/
    │   ├── board/ChessBoard.tsx     # Interactive chess board component
    │   ├── analysis/
    │   │   ├── EvalBar.tsx          # Vertical centipawn evaluation bar
    │   │   ├── EngineLines.tsx      # Top-3 Stockfish principal variations
    │   │   ├── MoveList.tsx         # Annotated move history with classification badges
    │   │   └── MoveClassBadge.tsx   # Brilliant/Blunder/etc. colour chip
    │   ├── analytics/
    │   │   ├── FatigueChart.tsx     # Line chart — accuracy vs. move number
    │   │   ├── ChronologyChart.tsx  # Bar chart — performance by hour of day
    │   │   └── RadarMap.tsx         # Spider chart — tactical motif scores
    │   ├── coach/
    │   │   └── CoachSheet.tsx       # Bottom sheet — AI coach advice + key idea
    │   ├── puzzles/
    │   │   └── PuzzleCard.tsx       # Blunder lab / puzzle list card
    │   └── ui/
    │       └── OfflineBanner.tsx    # Global network status banner
    │
    ├── store/                       # Zustand global state
    │   ├── puzzleStore.ts           # Leitner state, fetchNextPuzzle, submitAttempt
    │   ├── repertoireStore.ts       # Neo4j variations + AsyncStorage offline cache
    │   ├── telemetryStore.ts        # Dashboard data fetch + offline fallback
    │   ├── combatStore.ts           # Bot Elo, defiance mode, win/loss streaks
    │   └── profileStore.ts          # OTB clock config
    │
    ├── hooks/
    │   ├── useChessGame.ts          # Chess.js game state wrapper (move, loadPgn, loadFen)
    │   ├── useEngine.ts             # Analysis mutation + loading state
    │   └── useCoach.ts              # Gemini coach request hook
    │
    ├── utils/
    │   └── api.ts                   # axios instance — platform-aware base URL resolution
    │
    └── constants/
        └── theme.ts                 # Design tokens (Colors, FontFamily, FontSize, Spacing, Radius, Shadow)
```

---

## 5. Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Mobile framework | Expo + React Native | SDK 51+ | Cross-platform iOS / Android / Web |
| Routing | Expo Router | v3 | File-based Stack + Tab navigation |
| State management | Zustand | v4 | Lightweight global stores |
| Charts | Victory Native | latest | Fatigue, Chronology, Radar charts |
| HTTP client | axios | v1 | API calls with interceptors |
| Local persistence | AsyncStorage | latest | Repertoire cache, offline resilience |
| Backend framework | FastAPI | ≥ 0.111 | Async REST API with OpenAPI docs |
| ASGI server | uvicorn[standard] | ≥ 0.29 | Production-grade async server |
| Chess engine | Stockfish + python-chess | Stockfish 16+ | UCI analysis via asyncio subprocess |
| AI coaching | Google Gemini 1.5 Flash | google-generativeai ≥ 0.7 | JSON-mode structured GM advice |
| Relational DB | PostgreSQL via Supabase | — | Puzzles, Leitner state, game history |
| Graph DB | Neo4j AuraDB | neo4j ≥ 5.20 | Opening repertoire property graph |
| ORM / driver | SQLAlchemy 2.0 + asyncpg | async | PostgreSQL async sessions |
| Validation | Pydantic v2 | ≥ 2.7 | Request / response schemas |
| Env config | python-dotenv | ≥ 1.0 | `.env` loading in backend |

---

## 6. Local Setup — Backend

### Prerequisites

- Python 3.11+
- [Stockfish binary](https://stockfishchess.org/download/) installed on your machine
- PostgreSQL instance (Supabase free tier works out of the box)
- Neo4j instance ([AuraDB free tier](https://neo4j.com/cloud/platform/aura-graph-database/))
- Google Gemini API key — [generate one here](https://aistudio.google.com/app/apikey)

### Steps

```bash
# 1. Enter the backend directory
cd backend

# 2. Create and activate a virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

# 3. Install all dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env
# Open .env and replace every <CHANGE_ME> with real values (see §8)

# 5. Create the required PostgreSQL tables
# Run this SQL once against your Supabase / PostgreSQL database:
```

```sql
CREATE TABLE puzzles (
  id         TEXT PRIMARY KEY,
  fen        TEXT NOT NULL,
  solution   TEXT[] NOT NULL,
  motif      TEXT,
  difficulty INT,
  source     TEXT
);

CREATE TABLE puzzle_attempts (
  id            SERIAL PRIMARY KEY,
  puzzle_id     TEXT REFERENCES puzzles(id),
  user_id       TEXT,
  success       BOOL,
  time_taken_ms INT,
  attempted_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE puzzle_leitner (
  id                  SERIAL PRIMARY KEY,
  puzzle_id           TEXT,
  user_id             TEXT,
  box                 INT DEFAULT 0,
  consecutive_correct INT DEFAULT 0,
  next_review         TIMESTAMPTZ DEFAULT now(),
  UNIQUE (puzzle_id, user_id)
);

CREATE TABLE blunder_lab (
  id        SERIAL PRIMARY KEY,
  puzzle_id TEXT REFERENCES puzzles(id),
  user_id   TEXT,
  game_id   TEXT,
  ply       INT,
  saved_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (puzzle_id, user_id)
);

CREATE TABLE game_analyses (
  id             TEXT PRIMARY KEY,
  user_id        TEXT,
  pgn            TEXT,
  analysed_at    TIMESTAMPTZ DEFAULT now(),
  accuracy_white FLOAT,
  accuracy_black FLOAT,
  blunders       INT,
  mistakes       INT,
  inaccuracies   INT
);

CREATE TABLE move_analyses (
  id             SERIAL PRIMARY KEY,
  game_id        TEXT REFERENCES game_analyses(id),
  ply            INT,
  move_san       TEXT,
  classification TEXT,
  cp_loss        INT,
  fen_before     TEXT,
  fen_after      TEXT
);
```

```bash
# 6. Start the development server
python run.py

# Or directly with uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

| URL | Description |
|---|---|
| `http://localhost:8000` | API root |
| `http://localhost:8000/docs` | Swagger interactive docs |
| `http://localhost:8000/redoc` | ReDoc documentation |
| `http://localhost:8000/health` | Liveness probe (`{"status": "ok"}`) |

---

## 7. Local Setup — Mobile

### Prerequisites

- Node.js 18+
- npm (comes with Node) or pnpm
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (macOS only), Android Emulator, or the **Expo Go** app on a physical device
- Backend running locally (see §6)

### Steps

```bash
# 1. Enter the mobile directory
cd mobile

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Set EXPO_PUBLIC_API_BASE_URL to your running backend:
#
#   iOS Simulator / Web:         http://localhost:8000
#   Android Emulator:            http://10.0.2.2:8000
#   Physical device (same LAN):  http://<your-machine-LAN-IP>:8000

# 4. Start the Expo development server
npx expo start
```

```
Press i — open iOS Simulator
Press a — open Android Emulator
Press w — open in browser
Scan QR — open in Expo Go on a physical device
```

---

## 8. Environment Variables

### `backend/.env`

Copy `backend/.env.example` → `backend/.env` and fill in every value.

| Variable | Required | Default | Description |
|---|---|---|---|
| `STOCKFISH_PATH` | ✅ | — | Absolute path to the Stockfish binary |
| `ANALYSIS_DEPTH` | No | `20` | Stockfish search depth per ply (1–30) |
| `DATABASE_URL` | ✅ | — | Full PostgreSQL URL: `postgresql://user:pass@host:port/db` |
| `NEO4J_URI` | ✅ | `bolt://localhost:7687` | Neo4j connection URI (`neo4j+s://` for AuraDB TLS) |
| `NEO4J_USER` | No | `neo4j` | Neo4j username |
| `NEO4J_PASSWORD` | ✅ | — | Neo4j password |
| `GEMINI_API_KEY` | ✅ | — | Google Gemini API key |
| `ALLOWED_ORIGINS` | No | `localhost:19006, localhost:3000` | Comma-separated CORS origins |

> **Windows Stockfish path example:** `C:/stockfish/stockfish-windows-x86-64-avx2.exe`  
> **Linux / macOS example:** `/usr/local/bin/stockfish`

---

### `mobile/.env`

Copy `mobile/.env.example` → `mobile/.env` and set the value.

| Variable | Required | Default | Description |
|---|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | No | `http://localhost:8000` | Full URL of the backend server |

> **Important:** Variables prefixed `EXPO_PUBLIC_` are embedded into the app bundle at build time.  
> **Never store secrets** (database passwords, private API keys) in `mobile/.env` — they will be visible in the compiled binary.

For EAS (cloud) builds, set this as an EAS secret:
```bash
eas secret:create --name EXPO_PUBLIC_API_BASE_URL --value https://api.yourdomain.com
```

---

## 9. API Reference

All routes are mounted under the `/api` prefix. Full interactive documentation is available at `http://localhost:8000/docs` when the backend is running.

### Analysis

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze` | Analyse a full game by PGN — returns per-move ΔCP, classifications, top engine lines, and player accuracy |

**Request body:**
```json
{ "pgn": "1. e4 e5 2. Nf3 ...", "depth": 20, "multi_pv": 3 }
```

---

### AI Coach

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/coach` | Send board context to Gemini — returns structured GM advice, key idea, and warning level |

**Request body:**
```json
{
  "fen": "rnbqkbnr/...",
  "last5Moves": ["e4", "e5", "Nf3"],
  "stockfishTop3": [...],
  "proposedMove": "Bc4",
  "themes": ["open_game"],
  "userMessage": "Is this move safe?"
}
```

---

### Puzzles

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/puzzles/tailored` | Fetch the next due puzzle (Leitner priority queue). Optional `?motif=pin` filter |
| `POST` | `/api/puzzles/attempt` | Log a puzzle result and advance/reset the Leitner box |
| `GET` | `/api/puzzles/blunders` | Fetch up to 50 blunder-lab positions for the user |
| `POST` | `/api/puzzles/blunders` | Save a blunder position from a game analysis |

---

### Opening Repertoire

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/repertoire/track` | Save a move sequence to the Neo4j graph (uses MERGE — no duplicates) |
| `GET` | `/api/repertoire/variations` | Get all outgoing variations from a FEN position, ordered by frequency |
| `GET` | `/api/repertoire/analytics` | Node and edge counts for the repertoire graph |

---

### Sparring

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/sparring/move` | Submit a FEN + target Elo — receive the bot's chosen move and resulting FEN |
| `GET` | `/api/sparring/endgames` | List all predefined endgame scenarios (id, name, description, FEN, target Elo) |

---

### Telemetry

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/telemetry/dashboard` | Fatigue curve, chronobiology, and tactical radar data aggregated from PostgreSQL |

---

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Liveness probe — returns `{"status": "ok", "service": "2ndGM Backend"}` |

---

## 10. Author

**Designed and built by Soham Deepak Nandi**

| | |
|---|---|
| GitHub | [@Soham-Nandi-016](https://github.com/Soham-Nandi-016) |
| LinkedIn | [soham-nandi016](https://linkedin.com/in/soham-nandi016) |
| Email | nandisoham016@gmail.com |

© 2026 Soham Deepak Nandi. All rights reserved.


