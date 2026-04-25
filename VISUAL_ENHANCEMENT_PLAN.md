# Visual Enhancement Developer Plan

Branch: `improve-game-feel-feedback-pass`

## Goal

Make the game feel visually richer, clearer, and more enjoyable without breaking the existing procedural Three.js setup. The current build already uses Three.js, procedural models, post-processing, world props, minimap, stage HUD, and improved shield/projectile behavior. The next work should focus on visual readability, emotional payoff, and stronger stage identity.

## Product Direction

The game should feel like a heroic tactical action stand in Pavankhind:

- The battlefield should look alive, not empty.
- The hero should be readable from the angled camera.
- Enemy type, projectile danger, power-up effect, and stage escalation should be understood visually before reading UI text.
- Every major action should produce a visible reaction: strike, block, dodge, pickup, wave transition, boss arrival, arrow impact.

## Questions A Developer Should Resolve Before Large Asset Work

- Will the project stay fully procedural, or should it support imported GLTF/GLB models?
- Should art direction lean stylized voxel/low-poly or more detailed third-person action?
- Should enemies remain simple procedural archetypes, or should each enemy type get a dedicated model file?
- Should power-ups be permanent upgrades, temporary buffs, or instant pickups only?
- Should stage transitions change only UI and enemy mix, or also lighting/environment layout?

For the current branch, assume procedural art continues and avoid a large asset pipeline until the gameplay loop is visually clear.

## Priority 1: Readability And Feedback

### Power-Ups

Files to inspect:

- `game/World.ts`
- `game/Engine.ts`
- `game/Player.ts`
- `components/HUD.tsx`
- `game/GameConfig.ts`

Required changes:

- Replace the single generic herb/amrut pickup with multiple clearly different pickup types.
- Give each pickup a unique mesh silhouette, color, label, and effect.
- Show a HUD toast when a pickup is collected.
- Keep effects simple and understandable:
  - Amrut: health and stamina restore.
  - Utsah: stamina restore and dodge refresh.
  - Parakram: valor gain.
  - Dhal: defensive recovery.

Acceptance checks:

- The player can identify pickups by shape/color without reading a paragraph.
- The HUD says what was collected and what it did.
- Pickup animation does not depend on fragile child indexes.

### Projectiles

Files to inspect:

- `game/EnemyManager.ts`
- `game/Player.ts`
- `game/World.ts`

Required changes:

- Keep arrows spawning from the archer bow/weapon origin.
- Add stronger arrow trail/fletching.
- Add distinct impact feedback for stone hits and shield deflections.
- Keep aim tell visible before arrows launch.

Acceptance checks:

- Incoming arrows are visible from the current camera angle.
- A blocked/deflected arrow has a different visual payoff than a stone impact.

## Priority 2: Stage Identity

Files to inspect:

- `game/Engine.ts`
- `game/World.ts`
- `components/HUD.tsx`
- `localization/strings.ts`

Required changes:

- Treat the three stages as distinct moments:
  - Stage 1: Opening Hold.
  - Stage 2: Enemy Surge.
  - Stage 3: Final Stand.
- Add stage-specific HUD banner copy.
- Add stage/environment markers so the player feels progression, not only a timer.
- Intensify lighting/fog/post-processing by stage.

Acceptance checks:

- A player can tell when they entered Stage 2 or Stage 3 without looking only at the timer.
- Stage 3 should feel more dangerous through visuals and enemy pressure.

## Priority 3: Environment Depth

Files to inspect:

- `game/World.ts`
- `game/ModelParts.ts`

Required changes:

- Split world art helpers into smaller functions or modules over time.
- Add foreground/edge props that create depth from the angled camera:
  - stage gateways
  - war drums
  - broken shields
  - arrow barricades
  - side-path silhouettes
  - flags with different allegiance colors
- Keep repeated props instanced where possible.

Acceptance checks:

- The battlefield has clear near/mid/far depth.
- Props should not block gameplay unless they are registered as blockers.
- Stone blockers must match collision behavior for enemies and arrows.

## Priority 4: Character And Enemy Models

Files to inspect:

- `game/Player.ts`
- `game/EnemyManager.ts`
- `game/ModelParts.ts`

Required changes:

- Extract model-building into separate files:
  - `game/models/HeroModel.ts`
  - `game/models/EnemyModels.ts`
  - `game/models/PowerupModels.ts`
  - `game/models/EnvironmentModels.ts`
- Keep `Player.ts` focused on control/combat/camera.
- Keep `EnemyManager.ts` focused on spawning and AI.
- Add stronger silhouettes:
  - hero: shield, pagdi, sword, cape, sash
  - archer: bow, quiver, hood
  - shielder: broad shield, crest
  - brute: mace, bulk, spikes
  - boss: height, horns/standard/aura

Acceptance checks:

- Enemy type is readable at a glance.
- The hero is not visually sunk into the ground and remains readable from top/angled camera.

## Priority 5: Bugs And Technical Debt

Files to inspect:

- `game/World.ts`
- `game/EnemyManager.ts`
- `game/Player.ts`
- `game/Engine.ts`

Known risks:

- `World.ts` has too much procedural content in one constructor.
- Pickup animation previously depended on child indexes.
- Some effects use local `requestAnimationFrame` loops instead of engine-managed arrays.
- Enemy and projectile blockers use `arrowBlockers`; rename later to a more generic `collisionBlockers`.
- Bundle size warning exists from Vite because the main JS chunk is over 500 kB.

Fix strategy:

- Do small behavior-safe refactors.
- Preserve existing user-facing behavior while improving visuals.
- Add build checks after each pass.

## Implementation Order

1. Add developer notes and keep this plan current.
2. Implement clear power-up variants and HUD pickup toast.
3. Add stage identity copy and environmental stage markers.
4. Improve projectile impact/deflection visuals.
5. Build and run locally.
6. Then split models/world props into modules in a separate cleanup pass.

## Full Enhancement Roadmap

### Phase 1: Story-First Game Loop

Narrative goal: the player should understand that Baji Prabhu is holding a narrow pass so Shivaji Maharaj can reach Vishalgad. The player's mental model should be: "buy time, survive the surge, wait for the cannon signal."

Files:

- `game/Engine.ts`
- `game/GameConfig.ts`
- `components/HUD.tsx`
- `localization/strings.ts`
- `gameplay.md`

Build:

- Add explicit stage names and directives:
  - Stage 1: Opening Hold — stop the scouting wave.
  - Stage 2: Enemy Surge — archers and shield troops press the pass.
  - Stage 3: Final Stand — elites and boss pressure arrive before the cannon signal.
- Add a cannon-signal HUD with three pips tied to stage progress.
- Add stage transition banners independent of wave banners.
- Update `gameplay.md` so it matches the actual mode-based durations.

Acceptance:

- A new player should know what stage they are in and why it matters.
- The game should feel like a story escalation, not only a countdown.

### Phase 2: Tactical Readability

Files:

- `game/EnemyManager.ts`
- `game/World.ts`
- `components/Minimap.tsx`
- `components/HUD.tsx`

Build:

- Use stage-specific enemy mixes instead of one general weighted table.
- Stage 1 should be mostly melee/rusher training.
- Stage 2 should introduce archer and shielder pressure.
- Stage 3 should bring brutes, shielders, archers, and boss/elite pressure.
- Improve minimap enemy icons by type.
- Add clearer offscreen arrow danger indicators later.

Acceptance:

- The player should feel a difference between stages.
- Enemy silhouettes, minimap icons, and HUD warnings should agree.

### Phase 3: Hero Presentation

Files:

- `game/Player.ts`
- `game/ModelParts.ts`
- future: `game/models/HeroModel.ts`

Build:

- Add a visible Valor-ready aura around Baji.
- Add shield/block visual glow when the dhal is actively protecting.
- Add better stance changes:
  - idle heroic stance
  - shield stance
  - attack lunge
  - dodge burst
- Later, split the model construction out of `Player.ts`.

Acceptance:

- The player can tell when Valor is ready without only looking at the bar.
- Blocking should feel protective and powerful.

### Phase 4: Environment Spectacle

Files:

- `game/World.ts`
- `game/ModelParts.ts`
- future: `game/models/EnvironmentModels.ts`

Build:

- Add stage-specific environmental intensity:
  - Stage 1: misty dawn hold.
  - Stage 2: smoke, torch lines, war flags.
  - Stage 3: ember-heavy final stand with stronger red/gold lighting.
- Add more battlefield storytelling props:
  - abandoned palkhi/supply bundles
  - fallen shields
  - snapped banners
  - cannon-signal vista toward Vishalgad
- Keep gameplay blockers explicit and fair.

Acceptance:

- The battlefield should become more dramatic as the player approaches the end.
- Props should never lie about collision.

### Phase 5: Model Pipeline Decision

Files:

- `package.json`
- `game/ModelParts.ts`
- future: `game/assets.ts`

Build:

- Decide whether to keep procedural low-poly models or add GLTF/GLB support.
- If GLTF is introduced:
  - use `GLTFLoader`
  - keep procedural fallbacks
  - define asset scale/origin rules
  - keep mobile performance budget

Acceptance:

- Models should improve without making the game fragile or slow.

### Phase 6: Polish And QA

Files:

- all gameplay/render files
- `README.md`
- `gameplay.md`

Build:

- Fix doc mismatches.
- Add bundle-splitting or chunk warning handling.
- Add repeatable visual QA steps.
- Add browser screenshot checks once tooling is stable.

Acceptance:

- `npm run build` passes.
- Game runs locally.
- Docs explain the actual mechanics.
