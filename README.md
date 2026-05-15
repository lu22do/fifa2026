# FIFA 2026 Betting App

A React + Vite + Supabase app for World Cup predictions, built from a Supabase starter template and extended to satisfy the product spec in `spec/requirements.md`.

## What is included

- React 19 app with Vite, Tailwind CSS, React Router, React Query, Zustand, and Supabase auth
- Email/password and Google authentication via Supabase
- Match betting, bet modification before lock time, and score-based settlement logic
- User profile, bet history, leaderboard, and admin match management screens
- Node.js API server with Express + TypeScript that proxies bet and admin workflows to Supabase
- Supabase schema definitions for users, matches, bets, bet history, category points, teams, and leaderboard view

## Getting started

1. Copy `.env.template` to `.env` and fill in your Supabase values.
2. Install dependencies:
   ```bash
   npm install
   cd api && npm install
   ```
3. Run the API server and the frontend separately:
   ```bash
   npm run dev
   ```
   In another terminal:
   ```bash
   cd api && npm run dev
   ```

## Project structure

- `/src` - frontend React application
- `/api` - backend Express API server for custom bet and admin workflows
- `/supabase/schema.sql` - Supabase database schema and seed data
- `/spec` - requirements and architecture documents
