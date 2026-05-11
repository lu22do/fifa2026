# Architecture Document
## FIFA World Cup Betting App
**Version:** 1.0  
**Status:** Draft  
**Stack:** React · Node.js · Supabase  
**Last Updated:** May 2026

---

## 1. Architecture Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                               │
│                                                                   │
│   ┌─────────────────────────────────────────────────────────┐     │
│   │              React App  (Vite + React 19)               │     │
│   │   React Query · Zustand · React Router · TailwindCSS    │     │
│   └────────────────────────┬────────────────────────────────┘     │
└────────────────────────────┼──────────────────────────────────────┘
                             │  HTTPS / WSS
┌────────────────────────────┼──────────────────────────────────────┐
│                      API LAYER                                    │
│                                                                   │
│   ┌─────────────────────────────────────────────────────────┐     │
│   │           Node.js API Server (Express + TypeScript)     │     │
│   │   REST endpoints · Supabase Realtime relay · Cron jobs  │     │
│   └────────────────────────┬────────────────────────────────┘     │
└────────────────────────────┼──────────────────────────────────────┘
                             │  Supabase JS Client
┌────────────────────────────┼──────────────────────────────────────┐
│                    BACKEND LAYER (Supabase)                       │
│                                                                   │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│   │  PostgreSQL  │  │  Auth        │  │  Realtime            │    │
│   │  (primary DB)│  │  (Google +   │  │  (WebSocket pub/sub) │    │
│   │              │  │   Email)     │  │                      │    │
│   └──────────────┘  └──────────────┘  └──────────────────────┘    │
│                                                                   │
│   ┌──────────────┐  ┌──────────────────────────────────────┐      │
│   │  Storage     │  │  Edge Functions (Deno)               │      │
│   │  (optional)  │  │  (bet settlement · notifications)    │      │
│   └──────────────┘  └──────────────────────────────────────┘      │
└───────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Choices

### 2.1 Frontend — React (Vite)

| Concern | Library | Rationale |
|---|---|---|
| Framework | React 19 + Vite | Fast DX, wide ecosystem |
| Routing | React Router v7 | File-based routing, loader pattern |
| Server state | TanStack Query (React Query) | Cache management, background refetching |
| Client state | Zustand | Lightweight; for auth user + UI state |
| Styling | Tailwind CSS v4 | Utility-first; rapid iteration |
| Real-time | Supabase JS client | Direct Realtime subscription from client |
| Forms | React Hook Form + Zod | Validation aligned with API schemas |

### 2.2 Backend — Node.js (Express + TypeScript)

| Concern | Library | Rationale |
|---|---|---|
| Framework | Express 5 + TypeScript | Familiar, extensive middleware ecosystem |
| Auth middleware | Supabase JWT verification | Validates Supabase-issued JWTs on every request |
| Validation | Zod | Shared schemas between front and back end |
| Scheduling | node-cron | Bet window enforcement, settlement triggers |
| Logging | Pino | Low-overhead structured logging |
| Testing | Vitest + Supertest | Unit + integration tests |

### 2.3 Backend as a Service — Supabase

| Feature | Usage |
|---|---|
| **PostgreSQL** | Primary database — all app data |
| **Auth** | Google OAuth + email/password; issues JWTs |
| **Realtime** | Push match status changes and point value updates to clients |
| **Edge Functions** | Bet settlement logic; email notification dispatch |
| **Row Level Security (RLS)** | Players can only read/write their own bets |

---

## 3. Database Schema

All tables live in a single Supabase PostgreSQL project.

### 3.1 Entity Relationship Overview

```
users ──< bets >── matches
  |                   |
  |              betting_category_points
  |
  └──< bet_history (audit log)
  └──< follows (friends leaderboard)
```

### 3.2 Table Definitions

```sql
-- ─────────────────────────────────────────────
-- USERS (extended profile; auth is in Supabase Auth)
-- ─────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  total_points  INT NOT NULL DEFAULT 0,
  role          TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player','admin')),
  is_suspended  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TEAMS
-- ─────────────────────────────────────────────
CREATE TABLE teams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  code          CHAR(3) NOT NULL UNIQUE,       -- e.g. 'BRA', 'ARG'
  flag_url      TEXT,
  group_name    CHAR(1)                        -- A–L for group stage
);

-- ─────────────────────────────────────────────
-- MATCHES
-- ─────────────────────────────────────────────
CREATE TABLE matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team_id    UUID NOT NULL REFERENCES teams(id),
  away_team_id    UUID NOT NULL REFERENCES teams(id),
  stage           TEXT NOT NULL CHECK (stage IN (
                    'group','round_of_16','quarter_final',
                    'semi_final','third_place','final')),
  kickoff_at      TIMESTAMPTZ NOT NULL,
  venue           TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
                    'scheduled','live','half_time','finished',
                    'postponed','abandoned')),
  score_home      SMALLINT,
  score_away      SMALLINT,
  minute          SMALLINT,                    -- current match minute (live)
  bet_lock_at     TIMESTAMPTZ,                 -- computed: kickoff_at + 15 min
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- betting_category POINTS  (fixed points per betting_category; admin-configurable)
-- ─────────────────────────────────────────────
CREATE TABLE betting_category_points (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  betting_category        TEXT NOT NULL CHECK (betting_category IN (
                  'match_result','btts','total_goals',
                  'correct_score','first_goalscorer','tournament_winner')),
  stage         TEXT,                           -- null = applies to all stages; or a specific stage override
  points        SMALLINT NOT NULL CHECK (points > 0),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (betting_category, stage)
);

-- ─────────────────────────────────────────────
-- BETS
-- ─────────────────────────────────────────────
CREATE TABLE bets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id        UUID NOT NULL REFERENCES matches(id),
  betting_category          TEXT NOT NULL,
  selection       TEXT NOT NULL,               -- outcome chosen (e.g. 'home', 'yes', '2-1')
  points_locked   SMALLINT NOT NULL,           -- points value at time of placement; never changes
  points_awarded  SMALLINT,                    -- set on settlement: points_locked if correct, 0 if not
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
                    'active','locked','correct','incorrect','void')),
  change_count    SMALLINT NOT NULL DEFAULT 0,
  placed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at       TIMESTAMPTZ,
  settled_at      TIMESTAMPTZ,
  UNIQUE (user_id, match_id, betting_category)           -- one prediction per user per match per betting_category
);

-- ─────────────────────────────────────────────
-- BET HISTORY  (immutable audit log)
-- ─────────────────────────────────────────────
CREATE TABLE bet_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id          UUID NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL CHECK (event_type IN ('placed','modified','locked','settled','voided')),
  old_selection   TEXT,
  new_selection   TEXT,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- FOLLOWS  (friends leaderboard)
-- ─────────────────────────────────────────────
CREATE TABLE follows (
  follower_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- ─────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  reference_id  UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.3 Row Level Security (RLS) Policies

```sql
-- Users can read/update only their own profile
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users: own row" ON users
  USING (id = auth.uid());

-- Players can read/insert/update their own bets; admins can read all
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bets: own" ON bets
  USING (user_id = auth.uid());
CREATE POLICY "bets: admin read all" ON bets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Bet history is read-only for the owning user
ALTER TABLE bet_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bet_history: own" ON bet_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM bets WHERE id = bet_history.bet_id AND user_id = auth.uid())
  );

-- Matches and betting_category points config are publicly readable
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches: public read" ON matches FOR SELECT USING (TRUE);

ALTER TABLE betting_category_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "betting_category_points: public read" ON betting_category_points FOR SELECT USING (TRUE);
```

---

## 4. API Design

### 4.1 Base URL Structure

```
https://api.worldcupbets.app/v1
```

### 4.2 Authentication
Every protected endpoint requires the Supabase-issued JWT in the `Authorization` header:
```
Authorization: Bearer <supabase_access_token>
```
The Node.js server validates this JWT using the Supabase JWT secret.

### 4.3 Endpoints

#### Auth (delegated to Supabase; no custom endpoints needed)
Supabase Auth handles Google OAuth and email/password natively. The frontend uses the Supabase JS client directly.

#### Matches
```
GET    /matches                  → list all matches (public)
GET    /matches/:id              → single match detail
GET    /matches/:id/betting_categories      → available betting categories and points values for a match
```

#### Predictions
```
GET    /bets                     → player's own predictions (paginated)
GET    /bets/:id                 → single prediction with full history
POST   /bets                     → place a new prediction
PUT    /bets/:id                 → modify an existing prediction (selection only)
GET    /bets/:id/history         → audit log for a prediction
```

#### Score
```
GET    /score                    → player's total points + breakdown by match/betting_category
```

#### Leaderboard
```
GET    /leaderboard              → global leaderboard
GET    /leaderboard/friends      → friends leaderboard for the authenticated user
GET    /leaderboard?stage=group  → stage-specific leaderboard
```

#### Notifications
```
GET    /notifications            → player's notifications (paginated, unread first)
PUT    /notifications/:id/read   → mark single notification as read
PUT    /notifications/read-all   → mark all as read
```

#### Admin (role-guarded)
```
POST   /admin/matches              → create match
PUT    /admin/matches/:id          → update match (status, score, minute)
PUT    /admin/matches/:id/betting_categories  → open/close a betting_category for a match
POST   /admin/matches/:id/settle   → settle all predictions for a match
PUT    /admin/betting_category-points/:betting_category → update points value for a betting_category
PUT    /admin/users/:id/suspend    → suspend / unsuspend user
PUT    /admin/users/:id/points     → manually adjust a user's points total
```

### 4.4 Bet Placement Flow

```
Client                    Node API              Supabase DB
  │                          │                      │
  │── POST /bets ──────────▶ │                      │
  │   { match_id, betting_category,    │                      │
  │     selection }          │                      │
  │                          │── Verify JWT ───────▶│
  │                          │                      │
  │                          │── Check match status  │
  │                          │   (must be scheduled) │
  │                          │                      │
  │                          │── Check betting_category is     │
  │                          │   open for this match │
  │                          │                      │
  │                          │── Fetch points_locked │
  │                          │   from betting_category_points  │
  │                          │                      │
  │                          │── BEGIN TRANSACTION ─▶│
  │                          │   INSERT bets         │
  │                          │   INSERT bet_history  │
  │                          │── COMMIT ────────────▶│
  │                          │                      │
  │◀── 201 Created ──────────│                      │
  │    { bet }               │                      │
```

### 4.5 Bet Modification Flow

```
Client                    Node API              Supabase DB
  │                          │                      │
  │── PUT /bets/:id ────────▶│                      │
  │   { selection }          │                      │
  │                          │── Fetch bet + match ─▶│
  │                          │                      │
  │                          │── Enforce change      │
  │                          │   window rules        │
  │                          │   (see FR-012)        │
  │                          │                      │
  │                          │── BEGIN TRANSACTION ─▶│
  │                          │   UPDATE bets         │
  │                          │   INSERT bet_history  │
  │                          │── COMMIT ────────────▶│
  │                          │                      │
  │◀── 200 OK ───────────────│                      │
  │    { bet }               │                      │
```

---

## 5. Real-Time Architecture

### 5.1 Supabase Realtime Channels

```
Channel: matches
  → Listens on: matches table (UPDATE)
  → Payload: { match_id, status, score_home, score_away, minute }
  → Consumers: all clients

Channel: bets:{user_id}
  → Listens on: bets table (UPDATE) for that user_id
  → Payload: { bet_id, status, locked_at, points_awarded }
  → Consumers: authenticated player only (enforced by RLS)

Channel: leaderboard
  → Server broadcasts on settlement events
  → Payload: top 50 leaderboard snapshot
```

### 5.2 Client Subscription Pattern (React)

```typescript
// hooks/useMatchStatus.ts
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'

export function useMatchStatus(matchId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel(`match-status:${matchId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${matchId}`,
      }, () => {
        // Invalidate so TanStack Query refetches match + derived state
        queryClient.invalidateQueries({ queryKey: ['matches', matchId] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId, queryClient])
}
```

---

## 6. Bet Window Enforcement

Bet window rules (FR-012) are enforced exclusively on the Node.js API — never trusted from the client.

```typescript
// services/betWindowService.ts

export function getBetWindowStatus(match: Match): BetWindowStatus {
  const now = new Date()
  const kickoff = new Date(match.kickoff_at)
  const minutesElapsed = (now.getTime() - kickoff.getTime()) / 60000

  if (match.status === 'scheduled') {
    return { canChange: true, reason: null }
  }

  if (match.status === 'half_time') {
    const halfTimeStarted = new Date(match.half_time_at!)
    const halfTimeElapsed = (now.getTime() - halfTimeStarted.getTime()) / 60000
    if (halfTimeElapsed <= 10) {
      return { canChange: true, reason: null }
    }
    return { canChange: false, reason: 'HALF_TIME_WINDOW_CLOSED' }
  }

  if (match.status === 'live') {
    if (minutesElapsed <= 15) {
      return { canChange: true, reason: 'LIVE_WINDOW' }
    }
    return { canChange: false, reason: 'MATCH_LOCKED' }
  }

  return { canChange: false, reason: 'MATCH_ENDED' }
}
```

---

## 7. Settlement Flow

Settlement is triggered by an admin action and runs as a Supabase Edge Function to keep business logic close to the database.

```
Admin UI
  │
  │── POST /admin/matches/:id/settle
  │   { final_score_home, final_score_away }
  │
  ▼
Node API
  │── Validate admin role
  │── Validate match is 'live' or 'half_time' (not already finished)
  │── UPDATE matches SET status = 'finished', score_home, score_away
  │── Invoke Supabase Edge Function: settle_match({ match_id })
  │
  ▼
Edge Function: settle_match
  │── SELECT all active bets for match_id
  │── For each bet:
  │     Determine result (correct / incorrect / void)
  │     UPDATE bets SET status, points_awarded, settled_at
  │     INSERT bet_history (event_type = 'settled')
  │     If correct: UPDATE users SET total_points = total_points + points_awarded
  │                 INSERT notifications (points earned)
  │     If incorrect: INSERT notifications (0 points)
  │     If void:   INSERT notifications (prediction voided)
  │── Refresh leaderboard materialized view
```

---

## 8. Frontend Architecture

### 8.1 Page Structure

```
/                           → Public: Match schedule + leaderboard
/matches/:id                → Public: Match detail + betting_categories and points
/auth/login                 → Public: Sign in (Google / email)
/auth/register              → Public: Sign up with email
/dashboard                  → Protected: Player home (upcoming predictions, total score)
/bets                       → Protected: All predictions with history
/bets/:id                   → Protected: Single prediction detail + audit log
/score                      → Protected: Points breakdown by match and betting_category
/leaderboard                → Public: Global + friends leaderboard
/profile                    → Protected: Profile settings + notification prefs
/admin                      → Admin: Match management dashboard
/admin/matches/:id          → Admin: Betting category management + settlement
/admin/users                → Admin: User management
```

### 8.2 State Management Strategy

```
Supabase Auth state        → Zustand (authStore)
  - current user
  - session / JWT

Server data (matches, bets) → TanStack Query
  - automatic caching
  - background refetch
  - optimistic updates on bet modify

Real-time data (odds, notifications) → Supabase Realtime
  - direct client subscriptions
  - update TanStack Query cache on event

UI state (modals, drawers)  → Local component state (useState)
```

### 8.3 Optimistic Bet Modification

```typescript
// Immediately reflect selection change in UI; roll back on error
const { mutate: modifyBet } = useMutation({
  mutationFn: (update) => api.put(`/bets/${update.id}`, update),
  onMutate: async (update) => {
    await queryClient.cancelQueries({ queryKey: ['bets', update.id] })
    const previous = queryClient.getQueryData(['bets', update.id])
    queryClient.setQueryData(['bets', update.id], (old) => ({ ...old, ...update }))
    return { previous }
  },
  onError: (_, __, context) => {
    queryClient.setQueryData(['bets', context.previous.id], context.previous)
    toast.error('Failed to update prediction — please try again')
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['bets'] })
  },
})
```

---

## 9. Deployment

### 9.1 Environments

| Environment | Frontend | API | Supabase Project |
|---|---|---|---|
| Development | localhost:5173 (Vite) | localhost:3000 | worldcup-dev |
| Staging | Vercel preview URL | Railway (staging) | worldcup-staging |
| Production | Vercel (worldcupbets.app) | Railway (prod) | worldcup-prod |

### 9.2 Environment Variables

**Node API:**
```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=     # Server-side only; never exposed to client
SUPABASE_JWT_SECRET=
NODE_ENV=production
PORT=3000
```

**React App:**
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=        # Public anon key; safe to expose
VITE_API_BASE_URL=
```

### 9.3 CI/CD

```
GitHub → push to main
  │
  ├── Run tests (Vitest)
  ├── Run Supabase migrations (supabase db push)
  ├── Deploy API to Railway
  └── Deploy frontend to Vercel (auto)
```

---

## 10. Key Decisions & Trade-offs

| Decision | Choice | Trade-off |
|---|---|---|
| Bet window enforcement location | Node.js API only | Adds one network hop vs. edge function, but keeps logic auditable and testable |
| Settlement mechanism | Supabase Edge Function | Close to DB reduces latency; limited to Deno runtime |
| Real-time | Supabase Realtime | No additional WebSocket infra; tied to Supabase plan limits |
| Auth | Supabase Auth | Zero custom auth code; Google OAuth built in |
| Points atomicity | PostgreSQL transaction in Node | Ensures points_awarded and total_points update together or not at all |
| Leaderboard | Materialized view on users.total_points, refreshed on settlement | Eventual consistency acceptable; avoids expensive live aggregations |
| Points locked at placement | Stored on the bet row (points_locked) | Protects players from retrospective admin point value changes |