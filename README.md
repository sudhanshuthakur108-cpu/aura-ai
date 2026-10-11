# Aura — companion + agent (frontend prototype)

An interactive frontend prototype of a personal AI that is both a warm companion
and a capable agent. **Everything is demo data held in browser memory.** There is
no backend, no account, no live AI model and no external integration.

“Aura” comes from the project folder name and is a working name. Change it in
[`src/config/brand.ts`](src/config/brand.ts).

## Run it

Requires Node 20+ (tested with Node 24).

```bash
npm install
npm run dev        # start the dev server (http://localhost:5173)
npm test           # unit tests for the store, mission engine and demo responder
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
```

## What’s in the app

| Area | Route | Highlights |
| --- | --- | --- |
| Home | `#/home` | Companion-first: large 3D companion, greeting, “I’m here. What’s on your mind?”, one composer and compact starters. Conversations happen in place (your message → thinking → reply) with “Continue in Chat”. Pending approvals/missions appear only as small indicators |
| Chat | `#/chat/:threadId` | Threads, Enter to send / Shift+Enter for newline, typing state, rich cards (mission, proposal, memory, checklist), follow-ups, retry on error |
| Memory | `#/memory/:memoryId` | Preferences, personal context, goals, saved facts; filter, search, inspect, edit, delete with confirmation |
| Missions | `#/missions/:missionId` | Plan timeline (pending/running/completed/blocked/cancelled), start/pause/resume/cancel/skip, live progress caption, activity log, evidence cards, related approvals, deliverable with recorded decisions |
| Approvals | `#/approvals/:proposalId` | Email, purchase and external-action proposals with exact action, consequences, edit draft, approve (with confirmation) and reject |
| Settings | `#/settings` | Names, character style, orbit ring, tone, reply length, theme, motion, memory capture, reset, disconnected integrations |

## Companion Mode (immersive, simulated)

Click or tap the companion on Home (or focus it and press Enter) to open **Companion Mode**: a full-screen
space where the 3D character lifts from its Home position into the centre, over a dimmed, blurred backdrop
with an ambient glow and drifting particles. Close with the × button or Escape; focus returns to the companion.

- **Status:** `Ready` → `Listening (Demo)` while you type → `Thinking (Demo)` while the scripted reply is prepared → `Replying (Demo)`.
- **Preview listening:** plays the listening animation for a few seconds. It is an animation only — the microphone is never accessed.
- **Conversation:** a compact log plus a text input and prompts. It continues the same local conversation as Home and uses the scripted demo responder.
- **Voice not connected:** a chip that opens a preview of the planned wake word (“call ‘Aura’”) with a sample greeting. The same preview is in Settings → Voice mode.
- **Motion:** respects reduced motion (no fly-in, no particles, still character); background scrolling is locked while open.

| Simulated now | Would need future voice/back-end work |
| --- | --- |
| Status labels and listening animation | Microphone capture, speech-to-text, voice activity detection |
| “Aura?” / greeting sample | On-device wake-word detection and permission flow |
| Scripted text replies | A real model behind `services.chat`, and text-to-speech for spoken replies |

## Navigation

- **Desktop:** a quiet sidebar that collapses to an icon rail (the default) with tooltips; the toggle is remembered in this browser. Counts for active missions and pending approvals stay on the icons.
- **Tablet:** always the icon rail.
- **Mobile:** a slim top bar with a menu button (it shows a dot when something needs you) that opens a “Go to” sheet listing every section with its count.

## Demo-only boundaries

- **Chat replies are scripted.** [`chatResponder.ts`](src/services/demo/chatResponder.ts) matches keywords against curated replies and says so when it can’t help. It is labelled “Scripted demo responder” in the UI. Send a message containing `/error` to see the error and retry state; the retry succeeds.
- **Missions are simulated.** [`missionEngine.ts`](src/state/missionEngine.ts) advances steps on a timer. Sources use fictional publishers and `.example` domains; deliverables are labelled as illustrative. New missions run a generic template and say they can’t research new topics.
- **Approvals never execute anything.** Approving calls [`demoActionGateway`](src/services/demo/actionGateway.ts), which only reports that nothing happened externally. No email, payment, calendar or third-party request exists in the code.
- **Attachments** are visible but explain on click that they aren’t available; nothing is selected or uploaded. There is **no voice input** of any kind.
- **No persistence.** Reloading resets everything. Settings → “Reset demo data” does the same without a reload.

## Companion character

The large character on Home and in Settings → Appearance is a **real-time 3D model
rendered with WebGL** (three.js via React Three Fiber). It is an **original
character built from three.js geometry in code** — no external model file, no
downloaded asset and no third-party licence. It is not an artist-sculpted, rigged
GLB: there is no skeleton, blendshape face or audio lip-sync.

| Part | Implementation |
| --- | --- |
| Model | `src/components/companion/three/CharacterModel.tsx` — glossy head, dark glass visor, glowing capsule eyes, mouth, antenna, ear pods, floating hands, orbit ring |
| Scene | `three/Companion3D.tsx` — camera, key/rim/fill lights, soft shadows on a floor, local reflections from three's built-in `RoomEnvironment` (no HDR download) |
| Animation | `three/rig.ts` — pure, unit-tested pose per state; the current pose eases toward it every frame for smooth transitions; random blinks; eyes/head drift toward the pointer when idle |
| Palettes | `three/palettes.ts` — Lumen, Ember, Tide (same as the 2D avatar) |
| Boundary | `Companion.tsx` — `size="hero"` uses 3D; smaller sizes use the matching 2D avatar (`renderers/OrbRenderer.tsx`) so only one WebGL context ever exists |

**States** (all genuinely animated in 3D; preview them in Settings → Appearance → "Preview a state"):

| State | Triggered by | What moves |
| --- | --- | --- |
| idle | default | floating, breathing, slow sway, blinking |
| listening | typing in a composer | head tilts, leans in, eyes widen, hand cupped by the ear pod, antenna bead pulses |
| thinking | waiting for a reply | eyes narrow and look up, hand to chin, flat mouth, thought dots |
| speaking | a few seconds after a reply | mouth opens and closes in a speech-like rhythm, small hand gestures |
| celebrating | memory saved, approval recorded, mission completed | happy “^ ^” eyes, big smile, hands up, small bounce, sparkles |

Listening and speaking are **visual only**: nothing requests the microphone, records,
plays or generates audio, and there is no voice button.

**Performance and resilience**

- three.js is in a separate lazy chunk (~250 kB gzipped); it isn't downloaded on screens without the 3D character, and the 2D avatar shows until the first 3D frame.
- The frame loop runs only while the character is on screen, the tab is visible and motion is allowed; otherwise it renders a single frame per change.
- `prefers-reduced-motion` or Settings → Motion → Reduced gives still poses that still show each state.
- No WebGL, a lost WebGL context or a rendering error → the 2D avatar is shown and the app keeps working. Settings shows which renderer is in use.

**Known console notes:** React Three Fiber 9.8 logs a `THREE.Clock` deprecation from its own internals; ANGLE may print shader-compiler precision notes (`X4122`) on Windows. Neither affects rendering.

**Replacing it with an artist-made model later:** add a licensed GLB under `public/models/`, load it in a new
component inside `three/` (keep `CharacterModel`'s props), and map the five states onto the model's own
animation clips or morph targets. Nothing outside `src/components/companion/` needs to change.

## Architecture

```
src/
  config/brand.ts              product + companion name
  types.ts                     domain types shared by data, store and UI
  data/demo/                   curated seed data (threads, memories, missions, proposals)
  services/                    service seams (ChatService, ActionGateway) + demo implementations
  state/                       reducer, mission engine (pure), AppStore provider
  components/ui|shell|companion  primitives, app shell, character
  features/<area>/             one folder per area with its view and CSS
  styles/tokens.css            design tokens (colors, type, spacing, radii, shadows, motion)
```

- State is a single `useReducer` store ([`reducer.ts`](src/state/reducer.ts)) with pure transitions, unit-tested in `reducer.test.ts`.
- Routing is a tiny hash router ([`useRoute.ts`](src/lib/useRoute.ts)), so deep links and back/forward work with no extra dependency.
- Styling is plain CSS with tokens; three dark themes (`ink`, `plum`, `midnight`) and motion preferences are applied as `data-` attributes on `<html>`.

## Future integration seams

| Seam | Today | Replace with |
| --- | --- | --- |
| `services.chat` (`ChatService`) | Scripted keyword responder | Real model endpoint; keep `ChatReply` (text, cards, follow-ups, `memoryToSave`) |
| `services.actions` (`ActionGateway`) | Records decisions only | Server that executes approved actions with real auth and audit trail |
| Mission engine | Local timer in the reducer | Server-sent step/activity updates mapped onto the `Mission` type |
| Memory | In-memory array | Account-scoped storage with export/delete |
| Settings → Integrations | “Not connected” placeholders | OAuth connection flows |

Dependencies: React 19, Vite 8, TypeScript 5.9, three.js + React Three Fiber (3D companion), `lucide-react` icons, and Manrope + Fraunces fonts bundled locally via Fontsource (no remote font requests). Vitest for tests.
