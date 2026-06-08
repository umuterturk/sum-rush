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
- No scrolling, fits any phone screen
- Deterministic seeded number generation (multiplayer-ready architecture)
- Parabolic speed ramp — game gets faster toward the end
- Bell-curve number distribution (4 is most common, 1 and 7 are rare)

## Tech Stack

- React + TypeScript + Vite
- Pure domain core with ports/adapters architecture
- No external game frameworks

## Development

```bash
npm install
npm run dev     # Start dev server
npm test        # Run tests
npm run build   # Production build
```

## Architecture

The game uses IoC/ports-and-adapters to keep the domain pure:

```
src/
  domain/     # Pure game logic (no React, no DOM, no timers)
  ports/      # Interfaces for external systems
  adapters/   # Browser implementations (clock, storage, sync)
  app/        # React UI layer
```

This design allows multiplayer to be added later by implementing a `FirebaseMatchSyncAdapter` without changing the domain.

## License

MIT
