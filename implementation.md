# 2ndGM: AI Chess Lab — Master Implementation Blueprint

> **STATUS:** Phase 1 — Active Development  
> **Last Updated:** 2026-06-18  
> **Source of Truth:** This file governs all architectural decisions, module scope, and execution order.

---

## 📁 REPOSITORY STRUCTURE

```
2ndGM Chess App/
├── backend/                        # Python FastAPI server
│   ├── main.py                     # FastAPI app entry point
│   ├── routers/
│   │   ├── analyze.py              # /api/analyze endpoint
│   │   ├── repertoire.py           # /api/repertoire endpoints
│   │   ├── puzzles.py              # /api/puzzles endpoints
│   │   └── coach.py                # /api/coach (Gemini) endpoint
│   ├── services/
│   │   ├── stockfish_service.py    # Stockfish subprocess manager
│   │   ├── gemini_service.py       # Gemini API structured JSON calls
│   │   ├── pgn_service.py          # PGN/FEN parsing via python-chess
│   │   └── classification.py      # Move delta classification logic
│   ├── db/
│   │   ├── postgres.py             # PostgreSQL connection pool
│   │   └── neo4j_client.py         # Neo4j driver + graph queries
│   ├── models/
│   │   ├── schemas.py              # Pydantic request/response models
│   │   └── database_models.py      # SQLAlchemy ORM models
│   ├── requirements.txt
│   └── .env                        # STOCKFISH_PATH, DB URLs, GEMINI_KEY
│
├── mobile/                         # Expo React Native app
│   ├── app/                        # Expo Router file-based routing
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx         # Tab navigator layout
│   │   │   ├── index.tsx           # Home / Dashboard
│   │   │   ├── analyze.tsx         # PGN Analyzer tab
│   │   │   ├── repertoire.tsx      # Opening Repertoire tab
│   │   │   ├── puzzles.tsx         # Tactical Puzzles tab
│   │   │   └── profile.tsx         # Profile & Telemetry tab
│   │   ├── analyzer/
│   │   │   └── [gameId].tsx        # Deep game review screen
│   │   ├── sparring/
│   │   │   └── index.tsx           # AI Sparring & Endgame Lab
│   │   ├── blunder-lab/
│   │   │   └── index.tsx           # My Blunder Lab screen
│   │   ├── otb-clock/
│   │   │   └── index.tsx           # OTB Tournament Clock Simulator
│   │   └── _layout.tsx             # Root layout (theme, fonts)
│   ├── components/
│   │   ├── board/
│   │   │   ├── ChessBoard.tsx      # Core board canvas component
│   │   │   ├── ChessPiece.tsx      # SVG piece renderer
│   │   │   ├── BoardSquare.tsx     # Individual square with highlight
│   │   │   └── EvalBar.tsx         # Vertical evaluation bar
│   │   ├── analysis/
│   │   │   ├── MoveList.tsx        # Scrollable PGN notation list
│   │   │   ├── MoveClassBadge.tsx  # Brilliant/Blunder/etc. badge
│   │   │   ├── EngineLines.tsx     # Top-3 Stockfish lines display
│   │   │   └── EvalGraph.tsx       # Accuracy curve chart
│   │   ├── coach/
│   │   │   ├── CoachSheet.tsx      # Bottom sheet AI coach chat
│   │   │   └── CoachBubble.tsx     # Individual chat message bubble
│   │   ├── puzzles/
│   │   │   ├── PuzzleCard.tsx      # Puzzle display card
│   │   │   └── MotifBadge.tsx      # Tactical motif label
│   │   ├── profile/
│   │   │   ├── FatigueGraph.tsx    # Move accuracy vs. time graph
│   │   │   ├── RadarChart.tsx      # Tactical motif radar chart
│   │   │   └── StatCard.tsx        # Individual stat display card
│   │   └── ui/
│   │       ├── Card.tsx            # Reusable sleek card container
│   │       ├── OfflineBanner.tsx   # Offline state native banner
│   │       ├── ClockButton.tsx     # OTB clock lever component
│   │       └── ThemeProvider.tsx   # Dark/light theme context
│   ├── hooks/
│   │   ├── useChessGame.ts         # chess.js game state hook
│   │   ├── useNetworkStatus.ts     # Online/offline detection
│   │   ├── useEngine.ts            # Backend engine API calls
│   │   └── useCoach.ts             # Gemini coach API calls
│   ├── store/
│   │   ├── gameStore.ts            # Zustand: active game state
│   │   ├── repertoireStore.ts      # Zustand: repertoire data
│   │   └── profileStore.ts         # Zustand: user telemetry
│   ├── utils/
│   │   ├── chessLogic.ts           # chess.js wrapper utilities
│   │   ├── fenUtils.ts             # FEN parsing helpers
│   │   ├── cache.ts                # expo-secure-store cache layer
│   │   └── api.ts                  # Axios API client config
│   ├── assets/
│   │   └── pieces/                 # SVG chess piece assets (Neo style)
│   ├── constants/
│   │   ├── theme.ts                # Color palette, typography, spacing
│   │   └── motifs.ts               # Tactical motif definitions
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
│
└── implementation.md               # ← THIS FILE
```

---

## 🏗️ SYSTEM ARCHITECTURE

### Frontend: React Native + Expo
- **Framework:** Expo SDK (managed workflow) with Expo Router v3 (file-based routing)
- **Language:** TypeScript (strict mode)
- **State:** Zustand for global stores; React Query for server state/caching
- **Chess Logic:** `chess.js` (local JS rules engine — works fully offline)
- **Storage:** `expo-secure-store` for sensitive data; `@react-native-async-storage/async-storage` for puzzle/repertoire cache
- **Network Detection:** `@react-native-community/netinfo`
- **Charts:** `react-native-gifted-charts` or `victory-native` for telemetry graphs
- **Haptics:** `expo-haptics` for piece drop / move registration feedback

> **STRICT RULE:** Only native components (`<View>`, `<Text>`, `<ScrollView>`, `<TouchableOpacity>`, `<FlatList>`) and touch handlers (`onPress`, `onLongPress`). Zero HTML elements or `onClick`.

### Backend: Python FastAPI
- **Framework:** FastAPI with Uvicorn ASGI server
- **Chess Engine:** Stockfish binary via `python-chess` subprocess (asyncio-compatible)
- **Target Analysis Depth:** 18–20 plies minimum
- **AI Coach:** Google Gemini API via `google-generativeai` SDK (Structured JSON Mode)
- **Task Queue:** `asyncio` background tasks for multi-ply game analysis loops

### Data Layer
| Store | Purpose |
|---|---|
| **PostgreSQL** | User profiles, game history, puzzle attempts, telemetry metrics |
| **Neo4j** | Opening repertoire graph (FEN node → move edge → FEN node) |
| **Local Cache** | Offline puzzles, blunder lab FENs, cached repertoires |

---

## 🎨 DESIGN SYSTEM

### Color Palette (Dark Theme Primary)
```
Background:       #0D0F14  (near-black)
Surface:          #161A23  (card backgrounds)
Surface Elevated: #1E2330  (modals, sheets)
Primary:          #4F9CF9  (electric blue — CTAs)
Accent:           #F9A84F  (amber — highlights, badges)
Success:          #3DD68C  (green — best/excellent moves)
Warning:          #F9C74F  (yellow — inaccuracies)
Danger:           #F94F4F  (red — blunders)
Brilliant:        #A78BFA  (purple — !! moves)
Text Primary:     #F0F4FF
Text Secondary:   #8A93A8
Border:           #2A3040
```

### Typography
- **Headings:** `Inter` Bold / SemiBold
- **Body:** `Inter` Regular / Medium
- **Notation/Moves:** `Roboto Mono` (monospace for PGN readability)
- Load via `expo-font` or `@expo-google-fonts`

### Board Visual (Neo Style)
- **Light Squares:** `#F0D9B5`
- **Dark Squares:** `#B58863`
- **Highlighted (Last Move):** `rgba(255, 255, 0, 0.4)` overlay
- **Selected Piece:** `rgba(79, 156, 249, 0.5)` overlay
- **Legal Move Dots:** Semi-transparent filled circles on target squares
- **Pieces:** Sharp SVG vector assets at exact square dimensions

### Component Standards
- All cards: `borderRadius: 16`, `padding: 16`, shadow elevation 4–8
- Bottom sheets: rounded top corners (`borderTopLeftRadius: 24`)
- Badges/chips: `borderRadius: 999` (pill shape)
- Smooth transitions: `Animated` API or `react-native-reanimated`

---

## 🛠️ MODULE SPECIFICATIONS

### Module 1: PGN Analyzer & Game Review

**Flow:**
1. User pastes PGN or FEN string into `TextInput`
2. `chess.js` parses locally and validates
3. POST to `/api/analyze` with PGN payload
4. Backend iterates every ply asynchronously via `python-chess` + Stockfish
5. Returns per-move: `{ ply, move, eval, bestMove, topLines[3], cpLoss, classification }`
6. Frontend renders `MoveList` with `MoveClassBadge` per move
7. `EvalBar` animates on each ply navigation
8. User can tap any move to jump board state

**Move Classification Delta Rules:**
| Tag | Condition |
|---|---|
| Brilliant `!!` | Sacrifice maintaining/expanding advantage (heuristic + structural check) |
| Great `!` | Only move to maintain advantage, high difficulty |
| Best / Excellent | ΔCP < 15 |
| Inaccuracy `?!` | ΔCP ≥ 50 |
| Mistake `?` | ΔCP ≥ 100 |
| Blunder `??` | ΔCP ≥ 200 or win→draw/loss flip |

**API Contract:**
```
POST /api/analyze
Body: { pgn: string, depth?: number }
Response: {
  gameId: string,
  moves: MoveAnalysis[],
  summary: { accuracy: number, blunders: number, mistakes: number, inaccuracies: number }
}
```

### Module 2: Opening Repertoire & LLM Coach

**Neo4j Graph Schema:**
- **Node:** `(:Position { fen: string, eco: string, name: string })`
- **Edge:** `(:Position)-[:MOVE { san: string, frequency: float, masterWinRate: float }]->(:Position)`

**Gemini Context Packet (Structured JSON):**
```json
{
  "fen": "<current FEN>",
  "last5Moves": ["e4", "c5", "Nf3", "d6", "d4"],
  "stockfishTop3": [{ "move": "cxd4", "eval": "+0.3", "line": "..." }],
  "proposedMove": "e5",
  "proposedMoveEval": "-0.8",
  "themes": ["open_file", "isolated_pawn", "weak_d5"]
}
```

**Response Schema:**
```json
{
  "advice": "<grandmaster-style conceptual explanation>",
  "keyIdea": "<one-sentence core concept>",
  "warningLevel": "caution | critical | neutral"
}
```

**Active-Recall Trainer:** System plays pre-stored repertoire opponent lines. User must input correct moves. Deviations trigger instant coach annotation + replay prompt.

### Module 3: AI Sparring & Endgame Lab

**Elo Scaling Table (Stockfish Depth Limiting):**
| Target Elo | Search Depth | Blunder Rate |
|---|---|---|
| 1200 | 1 | High (15%) |
| 1500 | 3 | Medium (8%) |
| 1800 | 6 | Low (3%) |
| 2000 | 10 | Minimal (1%) |
| 2200 | 15 | Near-zero |
| 2500+ | Unlimited | 0% |

**Endgame FEN Library (Mandatory Scenarios):**
- K+P opposition drills, key square patterns, breakthrough
- Lucena Position (Rook + Pawn vs Rook — winning)
- Philidor Position (Rook vs Rook + Pawn — drawing)
- Two Bishops vs King mate
- Knight + Bishop vs King mate
- Knight vs Bishop imbalance studies

**Engine Defiance Mode:** Stockfish at max depth, user must convert or hold. No hints. Tracks # of moves to conversion.

### Module 4: Tactical Puzzle Engine

**Motif Index:**
`pin | skewer | fork | deflection | decoy | interference | removing_defender | windmill | back_rank | discovered_attack | zwischenzug | zugzwang | mating_net`

**Spaced Repetition Logic:**
- Failed puzzle → stored with motif tag + timestamp
- Re-injected into queue after 4h, 24h, 48h intervals (modified Leitner)
- Mastered = 3 consecutive correct solutions

**Puzzle Schema:**
```
{ id, fen, solution: string[], motif: string, difficulty: number, source: string }
```

### Advanced Features

**My Blunder Lab:**
- Extract positions 2 plies before user's error from uploaded game analysis
- Store as custom puzzle with known winning line
- `blunder_lab` collection per user in PostgreSQL
- Cannot mark complete until all resolved correctly

**OTB Clock Simulator:**
- Touch piece → highlight legal moves
- Touch target square → move staged (not committed)
- Tap large clock lever component to commit move + start opponent's clock
- Option: hide notation entirely (mental tracking only)
- Uses `expo-haptics` on clock press for physical feel

**Profile Telemetry:**
- **Fatigue Graph:** x-axis = move number, y-axis = move accuracy %, color bands for time elapsed
- **Chronobio Tracking:** accuracy grouped by hour-of-day (0–23), highlights peak vs. tilt hours
- **Tactical Radar:** 8-axis radar chart — one axis per major motif category, scored 0–100

---

## 🚀 PHASE 1 EXECUTION ORDER

### Phase 1.1 — Backend Foundation ✅ NEXT
**Goal:** Operational FastAPI server with `/api/analyze` endpoint connected to Stockfish.

**Files to create:**
- `backend/main.py` — FastAPI app, CORS config, router registration
- `backend/routers/analyze.py` — POST `/api/analyze`
- `backend/services/stockfish_service.py` — async Stockfish subprocess via `python-chess`
- `backend/services/pgn_service.py` — PGN parsing, ply iteration
- `backend/services/classification.py` — ΔCP move classification
- `backend/models/schemas.py` — Pydantic models
- `backend/requirements.txt`
- `backend/.env.example`

**Success Criteria:** curl POST to `/api/analyze` with a PGN returns classified move-by-move JSON.

---

### Phase 1.2 — Frontend Canvas
**Goal:** Expo Router scaffold + interactive native chessboard with `chess.js`.

**Files to create:**
- `mobile/` — Expo project initialized via `npx create-expo-app`
- `mobile/app/(tabs)/_layout.tsx` — Tab navigation
- `mobile/app/(tabs)/index.tsx` — Home dashboard shell
- `mobile/app/(tabs)/analyze.tsx` — Analyzer tab shell
- `mobile/components/board/ChessBoard.tsx` — Core board component
- `mobile/components/board/ChessPiece.tsx` — SVG piece renderer
- `mobile/components/ui/OfflineBanner.tsx` — Network state banner
- `mobile/hooks/useChessGame.ts` — chess.js integration hook
- `mobile/hooks/useNetworkStatus.ts` — offline detection
- `mobile/constants/theme.ts` — Design tokens

**Success Criteria:** Board renders on device/simulator, pieces move legally, offline banner appears without network.

---

### Phase 1.3 — Integration Bridge
**Goal:** Mobile client transmits board positions to backend, receives and renders engine evaluations.

**Files to create/modify:**
- `mobile/utils/api.ts` — Axios base client pointing to backend
- `mobile/hooks/useEngine.ts` — Analysis API hook with loading/error states
- `mobile/components/analysis/EvalBar.tsx` — Animated evaluation bar
- `mobile/components/analysis/MoveList.tsx` — Notation with classification badges
- `mobile/components/analysis/MoveClassBadge.tsx` — Visual move tags
- `mobile/components/analysis/EngineLines.tsx` — Top-3 lines display
- `mobile/app/(tabs)/analyze.tsx` — Full wired analyzer screen

**Success Criteria:** Upload PGN → navigate moves → see eval bar animate + move badges render.

---

### Phase 1.4 — AI Coach Integration
**Goal:** Gemini API connected, producing grandmaster-style conceptual commentary.

**Files to create/modify:**
- `backend/services/gemini_service.py` — Gemini SDK, structured JSON prompt
- `backend/routers/coach.py` — POST `/api/coach`
- `mobile/hooks/useCoach.ts` — Coach API hook
- `mobile/components/coach/CoachSheet.tsx` — Bottom sheet coach UI
- `mobile/components/coach/CoachBubble.tsx` — Chat message component

**Success Criteria:** Tap "Ask Coach" on any position → receive human-readable grandmaster explanation on device.

---

## 📦 DEPENDENCIES MANIFEST

### Backend (`requirements.txt`)
```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
python-chess>=1.999
stockfish>=3.28.0
google-generativeai>=0.7.0
psycopg2-binary>=2.9.9
neo4j>=5.20.0
sqlalchemy>=2.0.30
pydantic>=2.7.0
python-dotenv>=1.0.0
httpx>=0.27.0
```

### Mobile (`package.json` key deps)
```json
{
  "expo": "~51.0.0",
  "expo-router": "~3.5.0",
  "react-native": "0.74.x",
  "chess.js": "^1.0.0",
  "zustand": "^4.5.0",
  "@tanstack/react-query": "^5.40.0",
  "axios": "^1.7.0",
  "expo-haptics": "~13.0.0",
  "expo-secure-store": "~13.0.0",
  "@react-native-async-storage/async-storage": "^1.23.0",
  "@react-native-community/netinfo": "^11.3.0",
  "expo-font": "~12.0.0",
  "@expo-google-fonts/inter": "^0.2.3",
  "@expo-google-fonts/roboto-mono": "^0.2.3",
  "react-native-reanimated": "~3.10.0",
  "react-native-gesture-handler": "~2.16.0",
  "react-native-svg": "^15.3.0",
  "victory-native": "^41.0.0"
}
```

---

## 🔐 ENVIRONMENT VARIABLES

### Backend `.env`
```
STOCKFISH_PATH=/usr/local/bin/stockfish
DATABASE_URL=postgresql://user:password@localhost:5432/secondgm
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
GEMINI_API_KEY=your_gemini_api_key
ANALYSIS_DEPTH=20
```

### Mobile `.env` (via `expo-constants`)
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

## ✅ QUALITY & TESTING GATES

| Gate | Tool | Criteria |
|---|---|---|
| Type Safety | TypeScript strict | Zero `any` escapes in prod code |
| API Contract | Pydantic v2 | All request/response shapes validated |
| Offline Parity | NetInfo mock | Board interactive, banner visible, no crashes |
| Engine Accuracy | Manual PGN test | Known Blunder flagged correctly (ΔCP ≥ 200) |
| Coach Output | Gemini integration test | Returns valid JSON with `advice` field |
| Performance | React Native Perf Monitor | Board renders < 16ms per frame |

---

## 🗓️ MILESTONE ROADMAP

| Milestone | Target | Status |
|---|---|---|
| M1: Backend + Stockfish pipe live | Week 1 | 🔲 Pending |
| M2: Native board + Expo scaffold | Week 1 | 🔲 Pending |
| M3: Full analyzer wired end-to-end | Week 2 | 🔲 Pending |
| M4: Gemini coach integrated | Week 2 | 🔲 Pending |
| M5: Opening repertoire + Neo4j | Week 3 | 🔲 Pending |
| M6: Puzzle engine + spaced rep | Week 3–4 | 🔲 Pending |
| M7: Blunder Lab + OTB Clock | Week 4 | 🔲 Pending |
| M8: Telemetry dashboard | Week 5 | 🔲 Pending |
| M9: AI Sparring + Endgame Lab | Week 5–6 | 🔲 Pending |
| M10: Beta polish + QA | Week 6–7 | 🔲 Pending |
