<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Pavankhind: The Stand of the 300

A 3D action game built with Three.js and React. Hold the mountain pass as Baji Prabhu Deshpande and his 300 Maratha warriors against waves of Sultanate forces. Survive until the third cannon signals Shivaji Maharaj's safe arrival at Vishalgad.

## Setup

**Prerequisites:** Node.js 18+

```bash
git clone https://github.com/nikhilrdeshpande/pavankhind_-voxel-valor.git
cd pavankhind_-voxel-valor
npm install
npm run dev
```

Open `http://localhost:3000` in your browser. The game runs entirely client-side — no backend required.

### Mobile Testing

Add `?mobile` to the URL (`http://localhost:3000?mobile`) to force mobile mode on desktop for testing touch controls and mobile UI layout.

### Build for Production

```bash
npm run build
npm run preview   # preview the production build locally
```

Output goes to `dist/` — deploy to any static host (Vercel, Netlify, GitHub Pages).

## How to Play

### Desktop Controls

| Action | Key |
|--------|-----|
| Move | `W` `A` `S` `D` |
| Look | Mouse |
| Strike | Left Click |
| Block | Right Click (hold) |
| Parry | Right Click (tap at moment of impact) |
| Dodge | `Space` |
| Valor Strike | `V` (when Valor bar is full) |
| Pause | `P` or `Escape` |

### Mobile Controls

- **Left joystick** — movement
- **ATK** — attack (long press to toggle auto-attack)
- **Block** — hold to block, tap to parry
- **Dodge** — invulnerability roll
- **Valor** — appears with golden glow when Valor is full
- **Center screen** — drag to look around

### Combat System

- **Combo tiers:** Fury (3+), Onslaught (6+), Mythic (9+) — each tier adds audio layers and visual intensity
- **Valor:** Fills on hits. When full, press V for a devastating area strike that kills all nearby enemies
- **Parry:** Tap block at the moment of impact to negate damage, restore stamina, and gain Valor
- **Perks:** Choose from 3 perks every 60 seconds (Blade of Bhavani, Steel Spirit, War Cry)
- **Weapon upgrades:** Every 5 kills your weapon level increases

### Objectives

Periodic "Hold the Line" zones appear — stay inside to complete them for bonus score and coins.

## Game Modes

| Mode | Duration | Starting Wave |
|------|----------|---------------|
| Skirmish | 90s | Wave 1 |
| Battle | 180s | Wave 2 |
| Last Stand | 300s | Wave 3 |
| Daily Challenge | 120s | Wave 2 + random modifier |

**Daily modifiers:** Archers Only, Double Speed, No Blocking, Boss Rush, Fog of War.

## Features

- **6 enemy types** — Standard, Rusher, Shielder, Archer, Brute, Mini-Boss (multi-phase)
- **Procedural audio** — Dhol drums, ambient soundscape, combat SFX all synthesized via Web Audio API (no audio files except intro chant)
- **Post-processing** — Vignette, fake bloom, screen-space god rays, chromatic aberration, film grain, dynamic color grading
- **Dynamic time-of-day** — Sky, fog, and lighting shift from amber sunset to crimson dusk as the timer counts down
- **Procedural animations** — Walk cycles, idle breathing, cape Verlet physics, flag ripple — all code-driven
- **Progression** — 5 ranks, coin economy, 15 achievements, 10 cosmetic skins, 10-tier battle pass
- **Bilingual** — Full Marathi + English localization
- **Mobile-first** — Landscape-enforced, touch controls, safe area insets, fullscreen

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 6 |
| 3D Engine | Three.js 0.182 |
| Styling | Tailwind CSS (CDN) |
| Audio | Web Audio API (procedural synthesis) |
| Storage | localStorage (profile, cosmetics, daily progress) |

## Project Structure

```
game/           Core game systems
  Engine.ts       Game loop, post-processing, state management
  Player.ts       Player model, combat, animations, camera
  EnemyManager.ts Enemy AI, spawning, types, VFX
  World.ts        Environment, sky, terrain, water, particles
  AudioManager.ts Procedural audio engine
  ParticlePool.ts Pooled instanced particle system
  InputManager.ts Keyboard, mouse, virtual touch input

components/     React UI
  HUD.tsx         In-game health/stamina/valor/score/timer
  MobileControls  Virtual joystick and action buttons
  StartScreen     Title screen
  StoryScreen     Opening dialogue
  ModeSelectScreen Mode picker + daily challenge
  PauseMenu       Pause overlay with perk selection
  Scorecard       End-of-run results and sharing
  StoreScreen     Cosmetic shop
  BattlePassScreen Seasonal progression

localization/   Marathi + English string tables
monetization/   Ad stub + battle pass logic
```
