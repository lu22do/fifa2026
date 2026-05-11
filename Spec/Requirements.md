# Product Requirements Document
## FIFA World Cup Betting App
**Version:** 1.0  
**Status:** Draft  
**Last Updated:** May 2026

---

## 1. Overview

### 1.1 Purpose
A web and mobile-friendly platform that allows registered users to place and modify predictions/bets on FIFA World Cup matches throughout the entire competition — from group stages through to the final. The platform differentiates itself by permitting bet modifications within defined time windows, giving players a more dynamic and engaging experience than traditional fixed-bet systems.

### 1.2 Goals
- Allow users to place bets on any World Cup match before and during defined windows
- Allow users to **change their bets** within allowed time windows as the tournament unfolds
- Provide a real-time leaderboard to drive engagement
- Award **fixed points per bet type** on correct predictions; no variable stakes or currency involved
- Give administrators full control over matches, point values, and settlement

### 1.3 Out of Scope (v1.0)
- Real-money payments and withdrawal flows
- Native iOS / Android apps (responsive web only)
- Third-party sportsbook integrations
- In-play prop bets (e.g., next goalscorer, corner count)

---

## 2. User Roles

| Role | Description |
|---|---|
| **Player** | Registered user; can place, view, and modify bets within allowed windows |
| **Admin** | Can manage matches, set/update odds, settle bets, and manage users |

---

## 3. Functional Requirements

### 3.1 User Registration & Profile

#### FR-001 — Sign Up
- A player can create an account using Google OAuth or email + password
- On first login, the user must set a display name to complete their profile
- No starting balance is required; the player's score begins at zero

#### FR-002 — Profile Management
- A player can update their display name
- A player can view their full bet history (all matches, all outcomes)
- A player can view their total points score and a breakdown by match and prediction type

#### FR-003 — Account Security
- Players can reset their password via email link (email/password accounts only)
- Sessions expire after 7 days of inactivity

---

### 3.2 Tournament Structure

#### FR-004 — Match Schedule
- The app must display the full World Cup fixture list, including: date/time, venue, teams, competition stage (group, round of 16, QF, SF, Final), and current match status
- Match times must be displayed in the user's local timezone
- Completed matches must show the final score

#### FR-005 — Competition Stages
The platform supports betting across all stages:
| Stage | Point multiplier |
|---|---|
| Group Stage (48 matches) | x1 |
| Round of 16 (8 matches) | x2 |
| Quarter-Finals (4 matches) | x3 |
| Semi-Finals (2 matches) | x4 |
| Third-Place Play-off (1 match) | x5 |
| Final (1 match) | x6 |

---

### 3.3 Betting Categories (Per Match)

#### FR-007 — Available Betting Categories & Fixed Points
Each betting category awards a fixed number of points for a correct prediction. Points per catetory are set by an admin and apply uniformly to all players.

| Betting category | Description | Points |
|---|---|---|
| Match Result | Win / Draw / Win | 3 pts |
| Both Teams to Score | Yes / No | 2 pts |
| Total Goals | Over or Under a threshold | 2 pts |
| Correct Score | Exact scoreline | 6 pts |
| First Goalscorer | Which player scores first | 5 pts |

Note: A player can hold **one active prediction per match per betting category**, i.e. the player has to take risks with the betting category they pick.

See above for multipliers at each stage.

#### FR-008 — Points Display
- The points value for each betting category is displayed clearly on the bet placement screen
- Players can see potential points to be earned before confirming a prediction
- Incorrect predictions award zero points; there is no points deduction for wrong predictions

---

### 3.4 Placing a Bet

#### FR-009 — Bet Placement
- A player can place a prediction on any upcoming match that has not yet kicked off
- The player selects: betting category and outcome (e.g., Match Result → Home Win)
- No stake is required; the prediction is free to enter
- A player can hold **one active prediction per match per betting category**; placing a second prediction on the same match + betting category replaces (modifies) the first

#### FR-010 — Bet Confirmation
- After placing, the player receives an on-screen confirmation showing: match, betting category, selection, and points on offer for a correct prediction

---

### 3.5 Modifying a Bet

This is a core differentiating feature of the platform.

#### FR-012 — Bet Change Windows
Players may modify a prediction up until 60 min of match start.
After that the prediction are locked.

#### FR-013 — Modifying Selection
- When a player changes their outcome selection (e.g., from Home Win to Draw), the new selection takes effect immediately
- The points on offer for the market do not change when a selection is modified (points are fixed per market, not per outcome)

#### FR-014 — Bet Change Audit Log
- Every change to a prediction is recorded: old selection, new selection, and timestamp
- The player can view the full change history for any of their predictions

---

### 3.6 Bet Settlement

#### FR-016 — Automatic Settlement
- When an admin marks a match as "Finished" and enters the final score, the system automatically settles all predictions for that match
- Correct predictions: the fixed points for that betting category are added to the player's total score
- Incorrect predictions: no points are awarded and no points are deducted
- Voided predictions (e.g., abandoned match): no points are awarded or deducted; the prediction is marked void

#### FR-017 — Settlement Notifications
- Players receive an in-app notification when one of their predictions is settled
- Notification includes: match, their selection, outcome (Correct / Incorrect / Void), and points earned

#### FR-018 — Edge Cases
- Draws in a Match Result betting category where only Win/Win outcomes were offered must be voided

---

### 3.7 Points Score

#### FR-019 — Total Score
- Each player has a cumulative points total displayed prominently in the UI at all times
- The score is updated immediately after each bet is settled

#### FR-020 — Score Breakdown
- Players can view a breakdown of their points by: match, stage, and betting category type
- Each entry shows: match, betting category, selection, result, and points earned

---

### 3.8 Leaderboard

#### FR-021 — Global Leaderboard
- A public leaderboard ranks all players by total points accumulated across the tournament
- Updated in real time after each settlement
- Shows: rank, display name, total points, number of correct predictions

#### FR-022 — Friends Leaderboard
- A player can follow other players to create a private leaderboard among friends
- Accessible from the main leaderboard via a toggle

#### FR-023 — Stage-Level Leaderboard
- Separate leaderboard views for each competition stage (e.g., best predictor of the group stage)

---

### 3.9 Notifications

#### FR-024 — Notification Types

| Trigger | Channel |
|---|---|
| Prediction placed successfully | In-app |
| Prediction change confirmed | In-app |
| Match about to kick off (2h warning) - reminder to bet | In-app + email |
| Change window closing (10 min warning) | In-app |
| Prediction locked | In-app |
| Prediction settled (correct or incorrect) + leaderboard | In-app + email |

---

### 3.10 Admin Panel

#### FR-026 — Match Management
- An 3rd party API should be used to populate the matches & the live scores 
- Admins can also manually create, edit, and delete matches (date, time, teams, stage, venue)
- Admins can also manually update match status: Scheduled → Live → Finished / Postponed / Abandoned
- Admins can also manually enter live scores during a match

#### FR-027 — Points Configuration
- Point value changes only apply to predictions placed after the change; existing locked predictions retain the value at placement time

#### FR-028 — Bet Settlement
- Admins trigger settlement by checking the final score and confirming
- A settlement preview shows total points to be awarded before confirming
- Admins can void individual predictions

#### FR-029 — User Management
- Admins can view all users, their points scores, and prediction history
- Admins can suspend or reinstate a user account
- Admins can manually adjust a user's points total with a reason note

---

## 4. Non-Functional Requirements

### 4.1 Authentication
- Players must authenticate via **Google OAuth 2.0** or **email + password**
- Passwords must be at least 8 characters and stored hashed (bcrypt/argon2)
- Both authentication methods link to the same account if the same email is used
- Sessions must use secure, HttpOnly cookies or short-lived JWT access tokens with refresh token rotation

### 4.2 Performance
- The match list and leaderboard must load within 2 seconds on a standard broadband connection
- Odds updates and bet lock notifications must be pushed to clients within 1 second of the server event

### 4.3 Availability
- Target uptime: 99.5% during the tournament period
- Graceful degradation: if real-time updates are unavailable, the UI falls back to polling every 30 seconds

### 4.4 Security
- All API endpoints must require authentication except: match schedule (read-only) and leaderboard (read-only)
- Rate limiting on bet placement: max 10 bet actions per minute per user
- Admin actions must require re-authentication (step-up auth) for destructive operations (void, suspend)

### 4.5 Accessibility
- WCAG 2.1 AA compliance for all player-facing screens

---

## 5. User Stories Summary

| ID | As a… | I want to… | So that… |
|---|---|---|---|
| US-01 | Guest | Register with my Google account | I can start predicting quickly |
| US-02 | Player | Place a prediction on a match result | I can participate in the tournament |
| US-03 | Player | Change my prediction up to 1h before kickoff | I can react to team news |
| US-05 | Player | See how many points each betting category is worth | I know what I'm playing for |
| US-06 | Player | Get notified when my prediction locks | I'm not caught off guard |
| US-07 | Player | See my total points score at all times | I can track my progress |
| US-08 | Player | View the global leaderboard | I can compare with other players |
| US-09 | Player | View my prediction history and points breakdown | I can review my accuracy |
| US-10 | Admin | Set points values per betting category | I can adjust difficulty and reward balance |
| US-11 | Admin | Settle all predictions for a finished match | Points are awarded automatically |
| US-12 | Admin | Suspend a user | I can enforce fair play |