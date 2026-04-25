# Game Improvement Notes

Branch: `improve-game-feel-feedback-pass`  
Last updated: 2026-04-24

This file summarizes the gameplay, UI, camera, model, and environment improvements made from the feedback pass so the work can be continued without rediscovering context.

## Feedback Areas Addressed

### Difficulty Curve

- Made the opening 30-second round easier by reducing early enemy pressure.
- Slowed the opening spawn cadence and reduced early archer frequency.
- Increased pressure after the opening phase so later play is less easy once the player understands the mechanics.

### Character Movement And Camera

- Adjusted the camera from a strict back/top view to a higher angled third-person tactical view.
- Added vertical mouse camera control so the player can look from higher top-down to lower angled views.
- Preserved horizontal camera rotation for looking around the battlefield.
- Smoothed player combat feel with target-facing and a short attack lunge.

### Player Model And Equipment

- Added a default equipped `maratha_dhal` shield.
- Improved Bajiprabhu's procedural model:
  - layered pagdi wraps
  - plume and tilak
  - angarkha folds
  - shoulder armor
  - waist cord and front plate
  - trimmed cape panels
  - sharper sword blade and tip
  - detailed dhal model

### Shield And Defense

- Added shield deflection logic for incoming projectiles.
- Deflection depends on block state, player-facing direction, and stamina.
- Successful deflection drains stamina, adds rage, and creates a visible shield flash.

### Enemy Projectiles

- Arrows now spawn from the archer weapon/bow area instead of the enemy body center.
- Archer aim tells were added so incoming shots are easier to anticipate.
- Projectiles now collide with large stone blockers and spark on impact.

### Stone Blockers

- Large stones are now registered as gameplay blockers.
- Enemy arrows no longer pass through registered stone blockers.
- Enemies are pushed away from blockers instead of walking through them.

### Power-Ups

- Improved the herb pickup into a clearer Amrut-style pickup.
- Added visual treatment:
  - jar body
  - glowing green gem
  - aura
  - halo
  - point light
  - label sprite with effect text
- Current pickup effect: restores health and stamina.

### Round And Wave Clarity

- HUD now shows clearer stage progress across three stages.
- Added round transition messaging such as surviving one round and entering the next.
- Scorecard and HUD copy were updated to better explain progression.

### UI Clarity

- Clarified stamina/valor/stat labels in localization strings.
- Added coin shop access in pause and scorecard flows.
- Updated control messaging so dodge/space behavior is easier to understand.

### Minimap

- Added/fixed a minimap that shows player position and enemy approach positions.
- Cached enemy positions to reduce flicker.

### Enemy Model Improvements

- Added a reusable procedural model helper: `game/ModelParts.ts`.
- Improved enemy readability by type:
  - archers have scarf, bowstring, and nocked arrow details
  - shield enemies use the detailed dhal model and helmet crest
  - brutes have improved mace detail
  - bosses have trimmed cape panels

## Important Files Changed

- `game/Engine.ts`: wave timing, difficulty, pickup animation, shield defaults, game loop behavior.
- `game/Player.ts`: camera control, shield behavior, player model upgrades, attack feel.
- `game/EnemyManager.ts`: projectile origins, enemy blockers, enemy model upgrades, archer tells.
- `game/World.ts`: stone blocker registration and improved pickup visuals.
- `game/ModelParts.ts`: shared procedural model helpers for dhal and cloth panels.
- `game/GameConfig.ts`: difficulty and timing configuration.
- `game/Cosmetics.ts`: default shield ownership/equip state.
- `components/HUD.tsx`: stage, wave, and stat clarity.
- `components/Minimap.tsx`: minimap behavior.
- `components/PauseMenu.tsx`: coin shop access.
- `components/Scorecard.tsx`: coin shop access and end-state clarity.
- `localization/strings.ts`: clearer gameplay copy.

## Verification

The production build passes:

```bash
npm run build
```

The Vite dev server was run successfully at:

```text
http://127.0.0.1:5173/
```

## Current Development Server

At the time this note was written, the dev server was running with:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

## Known Follow-Up Work

- Split procedural models into dedicated modules:
  - `HeroModel`
  - `EnemyModel`
  - `PowerupModel`
  - `EnvironmentProps`
- Add a proper model asset pipeline if richer art is needed:
  - introduce GLTF/GLB loading
  - add placeholder asset conventions
  - keep procedural fallback models
- Further improve environment art:
  - terrain variation
  - boundary silhouettes
  - battlefield props
  - stronger depth cues
  - lighting polish
- Improve power-up readability further:
  - unique shapes per pickup type
  - stronger pickup animation
  - HUD toast describing collected effect
- Improve stage identity:
  - stage-specific enemy mixes
  - stage-specific environment changes
  - clearer round-start banners
- Add stronger projectile combat:
  - visible arrow trails
  - shield block sound/flash
  - better projectile impact feedback
- Add automated or browser-based visual checks once the local browser tooling is stable.

## 2026-04-24 Visual Polish Pass

Added `VISUAL_ENHANCEMENT_PLAN.md` as a developer-facing roadmap for making the game visually stronger. It covers power-up clarity, projectile feedback, stage identity, environment depth, model extraction, and technical debt.

Implemented the first pass from that plan:

- Added multiple power-up types instead of one generic pickup:
  - Amrut Kalash: `+40 HP + full stamina`
  - Utsah Herb: `full stamina + dodge ready`
  - Parakram Flame: `+50 Valor charge`
  - Dhal Ward: `+25 HP + shield stamina`
- Added unique procedural visuals for each pickup type.
- Added a HUD pickup toast showing what was collected and what it did.
- Reworked pickup animation so it uses `userData` markers instead of fragile child indexes.
- Added environmental stage gateways at key battlefield positions to make progression feel more physical.
- Added stronger arrow fletching and a distinct shield deflection burst separate from stone impact sparks.
- Added `Player.gainValor()` and `Player.refreshDodge()` helpers for clearer pickup effects.

Verification:

```bash
npm run build
```

Build passed. The local dev server responded with HTTP 200 at:

```text
http://127.0.0.1:5173/
```

## 2026-04-25 Story And Stage Identity Pass

Expanded `VISUAL_ENHANCEMENT_PLAN.md` into a fuller phase-by-phase roadmap covering:

- story-first game loop
- tactical readability
- hero presentation
- environment spectacle
- model pipeline decision
- polish and QA

Implemented the next high-impact slice:

- Added stage names and directives to runtime stats:
  - Opening Hold
  - Enemy Surge
  - Final Stand
- Added stage transition banners separate from 30-second round banners.
- Added a three-pip cannon signal HUD so the player has a story-facing sense of progress toward Vishalgad.
- Added stage-based enemy mix logic:
  - Stage 1: mostly melee and rushers.
  - Stage 2: more archers and shielders.
  - Stage 3: heavier pressure with brutes, shielders, archers, and rushers.
- Increased later-stage enemy pressure slightly through max enemy count and spawn cadence.
- Added a Valor-ready aura around Baji so ultimate readiness is visible in the 3D scene.
- Added dhal/shield glow while blocking so defense has clearer visual feedback.
- Fixed `App.tsx` default stats to include the newer pickup and stage fields.
- Updated `gameplay.md` so it matches the current mode durations, stage system, and cannon signal HUD.

Verification:

```bash
npm run build
npx tsc --noEmit
curl -I http://127.0.0.1:5173/
```

All checks passed. The only remaining build warning is the existing Vite large-bundle warning.

### Relook Fixes

After screenshot-based visual QA, two issues were found and fixed:

- Stage and round banners could overlap because stage boundaries often happen on the same timing as 30-second round transitions. Stage banners now take priority and suppress the round banner while active.
- The playable lane had a large hard dark rectangle caused by the directional light's default shadow camera bounds. The shadow camera now has battlefield-sized bounds and bias, and large cliff walls no longer cast broad shadows across the whole lane. The lane remains cinematic but is more readable.

Visual smoke test:

- Entered the game through the start screen and mode select using Playwright.
- Captured gameplay screenshots.
- Confirmed no page errors other than the expected headless-browser pointer-lock limitation.
- Confirmed the stage HUD and `Opening Hold` banner render.
