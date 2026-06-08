# Sum Rush

A fast, mobile-first arcade puzzle game where you tap falling numbers to build stacks that sum to exactly **21**.

**[Play Now](https://umuterturk.github.io/sum-rush/)**

## How to Play

- Numbers (1–7) fall from the top of the screen
- Tap a falling number to add it to your stack (max 5 numbers)
- When your stack sums to exactly 21, you score a point and the stack clears
- If the stack is full, the oldest number is automatically removed (sliding window)
- Tap a stack number to remove it manually
- You have 2 minutes to score as many points as possible

## Features

- Mobile-first, touch-optimized UI
- **1v1 multiplayer** — quick match or private room codes
- Live opponent score for competitive adrenaline
- Firebase Analytics (GA4) event tracking
- No scrolling, fits any phone screen
- Deterministic seeded number generation (shared arena in multiplayer)
- Parabolic speed ramp — game gets faster toward the end
- Bell-curve number distribution (4 is most common, 1 and 7 are rare)

## Tech Stack

- React + TypeScript + Vite
- Firebase (Firestore, Anonymous Auth, Analytics)
- Pure domain core with ports/adapters architecture
- No external game frameworks

## Development

```bash
npm install
npm run dev     # Start dev server
npx vitest      # Run tests
npm run build   # Production build
```

Copy `.env.example` to `.env` and fill in your Firebase config to enable multiplayer and analytics locally.

## Firebase Setup

1. Create a [Firebase project](https://console.firebase.google.com/)
2. Enable **Firestore** (production mode)
3. Enable **Anonymous Authentication** (Authentication → Sign-in method)
4. Enable **Google Analytics** (GA4) when creating the project
5. Register a **Web app** and copy the config values into `.env`
6. Deploy security rules and indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Or manually paste [`firestore.rules`](firestore.rules) into the Firebase console.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Web app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | GA4 measurement ID |

Without these env vars, the game runs in **solo-only** mode (multiplayer buttons are hidden).

## Multiplayer Architecture

Game logic runs entirely on each client. Firestore only carries:

- **Match config** — shared `seed` and `matchDuration` so both players see the same falling numbers
- **Live scores** — each client writes its own score; opponent score is read via `onSnapshot`

```
matches/{matchId}
  mode: 'quick' | 'private'
  inviteCode: string | null
  status: 'waiting' | 'ready' | 'ended'
  seed: string
  matchDuration: number
  players: { [uid]: { name, score, joinedAt } }
```

Matchmaking options:
- **Quick Match** — auto-pairs with another waiting player
- **Create Room** — generates a 6-character invite code
- **Join Room** — enter a friend's code

## Analytics Events

| Event | When |
|-------|------|
| `app_open` | App loads |
| `mode_selected` | Solo / quick / create / join chosen |
| `mp_search_started` | Quick match search begins |
| `mp_room_created` | Private room created |
| `mp_room_joined` | Joined a private room |
| `match_started` | Countdown complete, game begins |
| `point_scored` | Player scores a point (multiplayer) |
| `match_ended` | Match time expires |

## Architecture

The game uses IoC/ports-and-adapters to keep the domain pure:

```
src/
  domain/     # Pure game logic (no React, no DOM, no timers)
  ports/      # Interfaces for external systems
  adapters/   # Browser / Firebase implementations
  app/        # React UI layer
  firebase/   # Firebase initialization
  multiplayer/# Match types
```

## License

MIT
