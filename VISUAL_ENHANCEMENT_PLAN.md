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

