# NextFlow — Developer README

Visual LLM Workflow Builder · Next.js 14 · React Flow · Trigger.dev · Gemini API

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Trigger.dev Tasks](#triggerdev-tasks)
- [Node System](#node-system)
- [Execution Engine](#execution-engine)
- [State Management](#state-management)
- [API Routes](#api-routes)
- [Authentication](#authentication)
- [File Uploads](#file-uploads)
- [Deployment](#deployment)

---

## Project Overview

NextFlow is a Krea.ai-inspired visual workflow builder focused on LLM pipelines. Users drag and drop nodes onto a canvas, connect them, and execute workflows that chain text, images, video, and AI models together.

Key capabilities:
- 6 node types: Text, Image Upload, Video Upload, LLM, Crop Image, Extract Frame
- Parallel DAG execution — independent branches run concurrently
- All heavy processing runs as Trigger.dev background tasks (no serverless timeout issues)
- Full workflow history persisted to PostgreSQL with node-level execution details
- Auto-save, undo/redo, export/import as JSON

---

## Architecture

```
Browser (React Flow canvas)
    │
    ├── Zustand stores (workflowStore, executionStore, historyStore)
    │
    ├── /api/execute          → triggers Trigger.dev tasks
    ├── /api/execute/poll     → polls Trigger.dev run status
    ├── /api/workflows        → CRUD for workflow persistence
    ├── /api/runs             → workflow run history
    ├── /api/runs/nodes       → per-node execution history
    └── /api/upload/*         → Transloadit file uploads

Trigger.dev Cloud (background tasks)
    ├── llm-task              → calls Google Gemini API
    ├── crop-image-task       → FFmpeg crop → Transloadit upload
    └── extract-frame-task    → FFmpeg frame extraction → Transloadit upload
```

### Execution Flow

1. User clicks **Run All** → `execution-engine.ts` runs topological sort
2. Nodes are grouped into levels — same-level nodes execute with `Promise.all`
3. Each executable node POSTs to `/api/execute` → Trigger.dev task is triggered
4. Client polls `/api/execute/poll?runId=...` every 2s until COMPLETED or FAILED
5. Output is stored in `executionStore` → node UI updates reactively
6. Run + per-node results saved to PostgreSQL via `/api/runs` and `/api/runs/nodes`

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14.2.5 | Framework, App Router, API routes |
| TypeScript | ^5 | Type safety throughout |
| React Flow (`@xyflow/react`) | ^12.3.6 | Visual canvas, nodes, edges |
| Zustand | ^4.5.4 | Client state management |
| Prisma | ^5.14.0 | ORM for PostgreSQL |
| PostgreSQL | via Neon | Persistent storage |
| Clerk | ^5.2.4 | Authentication |
| Trigger.dev SDK | 4.4.1 | Background task execution |
| Google Generative AI | ^0.21.0 | Gemini API client |
| Transloadit | via REST API | File upload CDN |
| fluent-ffmpeg | ^2.1.3 | Video/image processing in tasks |
| ffmpeg-static | ^5.3.0 | FFmpeg binary bundled for Trigger.dev |
| Zod | ^3.23.8 | API request validation |
| Tailwind CSS | ^3.4.1 | Styling |
| Lucide React | ^0.400.0 | Icons |
| date-fns | ^3.6.0 | Date formatting in history panel |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   ├── api/
│   │   ├── execute/
│   │   │   ├── route.ts          # Triggers Trigger.dev tasks
│   │   │   └── poll/route.ts     # Polls task run status
│   │   ├── runs/
│   │   │   ├── route.ts          # Workflow run CRUD
│   │   │   └── nodes/route.ts    # Per-node execution records
│   │   ├── upload/
│   │   │   ├── image/route.ts    # Image upload via Transloadit
│   │   │   └── video/route.ts    # Video upload via Transloadit
│   │   └── workflows/
│   │       ├── route.ts          # List / create workflows
│   │       ├── [id]/route.ts     # Get / update / delete workflow
│   │       └── sample/route.ts   # Create pre-built sample workflow
│   ├── dashboard/
│   │   ├── page.tsx              # Server component — fetches workflows
│   │   └── DashboardClient.tsx   # Client — grid, templates, context menu
│   └── workflow/[id]/
│       ├── page.tsx              # Server component — fetches workflow by id
│       └── WorkflowClient.tsx    # Client — layout, auto-save, keyboard save
│
├── components/
│   ├── canvas/
│   │   ├── WorkflowCanvas.tsx    # ReactFlow setup, connection logic, glow effects
│   │   ├── CanvasToolbar.tsx     # Bottom/top overlaid toolbar panels
│   │   ├── CustomEdge.tsx        # Bezier edge renderer
│   │   └── KeyboardShortcutsModal.tsx
│   ├── nodes/
│   │   ├── TextNode.tsx
│   │   ├── ImageUploadNode.tsx
│   │   ├── VideoUploadNode.tsx
│   │   ├── LLMNode.tsx
│   │   ├── CropImageNode.tsx
│   │   └── ExtractFrameNode.tsx
│   └── sidebar/
│       ├── LeftSidebar.tsx       # Node palette, drag-to-canvas
│       └── RightSidebar.tsx      # Workflow run history panel
│
├── hooks/
│   └── useKeyboardShortcuts.ts   # All keyboard shortcuts registered here
│
├── lib/
│   ├── execution-engine.ts       # DAG execution, topological sort, polling
│   ├── prisma.ts                 # Prisma client singleton
│   └── type-validator.ts         # Connection type-safety + cycle detection
│
├── store/
│   ├── workflowStore.ts          # Nodes, edges, name, save state
│   ├── executionStore.ts         # Per-node run status, output, error
│   ├── historyStore.ts           # Undo/redo stack
│   └── canvasToolStore.ts        # Active tool (select/pan/cut/magic)
│
├── trigger/
│   ├── index.ts                  # Re-exports all tasks
│   ├── llmTask.ts                # Gemini API task
│   ├── cropImageTask.ts          # FFmpeg crop task
│   └── extractFrameTask.ts       # FFmpeg frame extraction task
│
├── types/
│   ├── nodes.ts                  # Node data interfaces
│   ├── workflow.ts               # Workflow / run / execution types
│   └── execution.ts              # Execution status types
│
└── middleware.ts                 # Clerk auth — protects all non-public routes
```

---

## Local Setup

### Prerequisites

- Node.js 18+
- npm or pnpm
- PostgreSQL database (Neon free tier works)
- Accounts at: Clerk, Trigger.dev, Transloadit, Google AI Studio

### Steps

```bash
# 1. Clone and install
git clone <repo-url>
cd nextflow
npm install

# 2. Set up environment variables (see section below)
cp .env.example .env.local

# 3. Push database schema
npx prisma db push

# 4. Generate Prisma client
npx prisma generate

# 5. Run dev server
npm run dev

# 6. In a separate terminal, run Trigger.dev dev worker
npx trigger.dev@latest dev
```

> **Important:** Both `npm run dev` AND `npx trigger.dev dev` must be running locally for task execution to work. The Trigger.dev CLI creates a tunnel so cloud tasks can reach your local machine.

---

## Environment Variables

Create `.env.local` with the following:

```env
# Database — get from neon.tech
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# Clerk — get from clerk.com dashboard
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# Trigger.dev — get from trigger.dev dashboard
TRIGGER_SECRET_KEY="tr_dev_..."

# Google Gemini — get from aistudio.google.com
GEMINI_API_KEY="AIza..."

# Transloadit — get from transloadit.com
# ⚠️  BOTH are required — same value, different names
# NEXT_PUBLIC_ version used in Next.js API routes
# Non-prefixed version used inside Trigger.dev tasks
NEXT_PUBLIC_TRANSLOADIT_KEY="your_transloadit_key"
TRANSLOADIT_KEY="your_transloadit_key"
```

### Adding env vars to Trigger.dev Cloud

Trigger.dev tasks run in their own cloud environment and do NOT inherit your Vercel/local env vars automatically. You must add these manually:

1. Go to **trigger.dev → Your Project → Environment Variables**
2. Add: `GEMINI_API_KEY`, `TRANSLOADIT_KEY`

---

## Database

### Schema Overview

```prisma
Workflow
  id, userId, name, nodes (JSON), edges (JSON)
  └── WorkflowRun
        id, workflowId, userId, scope, status, duration, completedAt
        └── NodeExecution
              id, runId, nodeId, nodeType, status, inputs, outputs, error, duration
```

`scope` values: `"full"` | `"partial"` | `"single"`
`status` values: `"running"` | `"success"` | `"failed"`

### Useful Prisma Commands

```bash
# Push schema changes to DB (dev — no migration files)
npx prisma db push

# Open Prisma Studio to inspect/edit data
npx prisma studio

# Generate Prisma client after schema changes
npx prisma generate

# Create a named migration (production)
npx prisma migrate dev --name your_migration_name
```

### Indexes

- `Workflow.userId` — filters workflows by authenticated user
- `WorkflowRun.workflowId` + `WorkflowRun.userId`
- `NodeExecution.runId`
- All relations use `onDelete: Cascade` so deleting a workflow cleans up all runs and node executions

---

## Trigger.dev Tasks

All tasks live in `src/trigger/` and are registered via `trigger.config.ts`.

### Task: `llm-task` (`src/trigger/llmTask.ts`)

```ts
// Input:
{
  model: string           // e.g. "gemini-2.0-flash"
  systemPrompt?: string
  userMessage: string
  imageUrls?: string[]    // fetched and base64-encoded inline
}

// Output:
{ output: string }        // LLM text response
```

Images are fetched server-side, converted to base64, and sent as inline data parts to the Gemini API. Handles quota errors (429) and auth errors (401/403) with clean user-facing messages instead of raw API errors.

### Task: `crop-image-task` (`src/trigger/cropImageTask.ts`)

```ts
// Input:
{
  imageUrl: string
  xPercent: number        // 0–100
  yPercent: number        // 0–100
  widthPercent: number    // 0–100
  heightPercent: number   // 0–100
}

// Output:
{ output: string }        // Transloadit CDN URL of cropped image
```

Uses FFmpeg's native `iw`/`ih` expressions in the crop filter — no ffprobe required. Downloads image to tmpdir → crops → uploads result to Transloadit.

### Task: `extract-frame-task` (`src/trigger/extractFrameTask.ts`)

```ts
// Input:
{
  videoUrl: string
  timestamp: string       // Seconds ("5") or percentage ("50%")
}

// Output:
{ output: string }        // Transloadit CDN URL of extracted frame JPEG
```

For percentage timestamps, parses video duration from FFmpeg stderr output (no ffprobe binary needed — duration is in the `Duration: HH:MM:SS` line FFmpeg always prints).

### Trigger.dev Config (`trigger.config.ts`)

```ts
export default defineConfig({
  project: "proj_qxlbslbjcpdltbhtznik",
  maxDuration: 300,       // 5 min max per task
  dirs: ["./src/trigger"],
  build: {
    external: ["ffmpeg-static", "fluent-ffmpeg"],
  },
})
```

`ffmpeg-static` and `fluent-ffmpeg` are marked `external` so Trigger.dev bundles the FFmpeg binary correctly for its Linux runtime rather than trying to tree-shake it.

### Deploying Tasks

```bash
# Deploy all tasks to Trigger.dev cloud
npx trigger.dev@latest deploy

# Run tasks locally (with hot reload)
npx trigger.dev@latest dev
```

---

## Node System

### Node Types & Handles

| Node | Input Handles | Output Handle | Runs Task? |
|---|---|---|---|
| `textNode` | — | `output` (text) | No — passthrough |
| `imageUploadNode` | — | `output` (image) | No — passthrough |
| `videoUploadNode` | — | `output` (video) | No — passthrough |
| `llmNode` | `system_prompt`, `user_message`, `images` | `output` (text) | Yes |
| `cropImageNode` | `image_url`, `x_percent`, `y_percent`, `width_percent`, `height_percent` | `output` (image) | Yes |
| `extractFrameNode` | `video_url`, `timestamp` | `output` (image) | Yes |

Passthrough nodes resolve their output directly from `node.data` (e.g. `text`, `imageUrl`, `videoUrl`) without hitting any API.

### Type-Safe Connections (`src/lib/type-validator.ts`)

Every connection attempt is validated before being accepted:

```ts
// Which output types each target handle accepts:
system_prompt  → ["text"]
user_message   → ["text"]
images         → ["image"]
image_url      → ["image"]
video_url      → ["video"]
timestamp      → ["text", "number"]
x_percent      → ["text", "number"]
```

Invalid connections show a toast error and are rejected without adding the edge. Cycle detection uses DFS — creating a connection back to an ancestor node is blocked.

### `connectedHandles` Array

Each node's `data.connectedHandles: string[]` tracks which input handles have active connections. Node components use this to:
- Show a "connected" badge next to the handle label
- Disable the corresponding manual input field (greyed out)

This array is updated in `WorkflowCanvas.tsx` `onConnect` (add) and `onEdgesDelete` (remove).

### Adding a New Node Type

1. Create `src/components/nodes/YourNode.tsx` with `Handle` components from `@xyflow/react`
2. Register in `nodeTypes` object in `src/components/canvas/WorkflowCanvas.tsx`
3. Add default data to `defaultData` in `WorkflowCanvas.tsx` and `CanvasToolbar.tsx`
4. Add to the node list in `src/components/sidebar/LeftSidebar.tsx`
5. Add output type to `NODE_OUTPUT_TYPES` in `src/lib/type-validator.ts`
6. Add accepted input types to `HANDLE_TYPES` in `type-validator.ts`
7. If it runs a task: create task in `src/trigger/`, export from `src/trigger/index.ts`, add a case in `src/app/api/execute/route.ts`

---

## Execution Engine

**File:** `src/lib/execution-engine.ts`

### Topological Sort → Parallel Levels

```ts
function topologicalSort(nodes, edges): string[][]
// Returns array of levels where each level can run in parallel
// Example for the sample workflow:
// Level 0: [upload-image, text-system, text-user, upload-video]
// Level 1: [crop-image, extract-frame]
// Level 2: [llm-1]
// Level 3: [text-system-2, llm-2]  ← llm-2 waits for llm-1 AND extract-frame
```

Each level is executed with `Promise.all` — nodes within the same level run concurrently. A node only advances to the next level once all nodes in the current level complete.

### Output Unwrapping

Tasks return `{ output: value }`. The engine unwraps this so downstream nodes receive the plain value when resolving inputs:

```ts
function unwrapOutput(raw: any): any {
  if (typeof raw?.output === "string") return raw.output  // most tasks
  if (typeof raw?.text === "string") return raw.text      // LLM fallback
  if (typeof raw?.url === "string") return raw.url        // URL fallback
  return raw
}
```

Node components do their own unwrapping for display purposes independently of this.

### Input Resolution

Before executing a node, `resolveNodeInputs()` builds the input object:
1. For each incoming edge, get the source node's output (via `getNodeOutput`)
2. `images` handle is special — multiple incoming edges append to an array
3. Fill any unconnected handles with defaults from `node.data`

### Exported Functions

```ts
runWorkflow(workflowId, nodes, edges, "full" | "partial")
// Full DAG execution with parallel levels

runSingleNode(workflowId, nodeId, nodes, edges)
// One node only — still resolves inputs from upstream nodes
// Resets only that node's state, not the whole workflow

runSelectedNodes(workflowId, selectedIds, nodes, edges)
// Filters to selected subset + internal edges, runs as sub-workflow
// Creates a "partial" scope run in history
```

### Polling Loop

```ts
async function pollRun(runId, nodeId, timeoutMs = 300000): Promise<any>
// Polls /api/execute/poll every 2 seconds
// Returns output on COMPLETED
// Throws on FAILED or timeout (5 min)
```

---

## State Management

Four Zustand stores, all in `src/store/`:

### `workflowStore.ts`

Core workflow data — nodes, edges, name, save state.

```ts
// Key actions:
updateNode(nodeId, partialData)
// Merges partialData into node.data — used by every node component
// e.g. updateNode(id, { text: "hello" }) or updateNode(id, { imageUrl: url })

removeNode(nodeId)
// Removes node AND all its connected edges from state

addNode(node)
// Appends to nodes array — used by sidebar and keyboard shortcuts
```

### `executionStore.ts`

Per-node execution status — drives all node UI state.

```ts
// Every node reads its own status from here:
const status = nodeStates[id]?.status  // "idle" | "running" | "success" | "failed"
const output = nodeStates[id]?.output
const error  = nodeStates[id]?.error

// resetNodeStates() clears all — called at start of full workflow run
// Individual node resets used for single-node runs
```

### `historyStore.ts`

Undo/redo as snapshots of `{ nodes, edges }`. Max 50 entries.

```ts
// Call pushHistory() BEFORE any destructive action:
pushHistory({ nodes: safeNodes, edges: safeEdges })
// Then apply the change

// To undo:
const entry = undo()      // returns the snapshot
if (entry) {
  setNodes(entry.nodes)   // caller must apply it
  setEdges(entry.edges)
}
```

### `canvasToolStore.ts`

Single active tool state. React Flow uses this to switch between selection mode, pan mode, and cut mode.

---

## API Routes

### Workflows

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/workflows` | ✅ | List all workflows for current user |
| `POST` | `/api/workflows` | ✅ | Create new workflow |
| `GET` | `/api/workflows/[id]` | ✅ | Get single workflow |
| `PUT` | `/api/workflows/[id]` | ✅ | Update name/nodes/edges |
| `DELETE` | `/api/workflows/[id]` | ✅ | Delete workflow + cascade |
| `POST` | `/api/workflows/sample` | ✅ | Create pre-built 9-node sample |

### Execution

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/execute` | ✅ | Trigger task, returns `{ runId }` |
| `GET` | `/api/execute/poll?runId=` | ✅ | Returns PENDING / COMPLETED / FAILED |

### Run History

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/runs?workflowId=` | ✅ | List runs for a workflow (last 50) |
| `POST` | `/api/runs` | ✅ | Create run record |
| `PATCH` | `/api/runs` | ✅ | Update run status/completedAt |
| `POST` | `/api/runs/nodes` | ✅ | Save node execution record |
| `GET` | `/api/runs/nodes?runId=` | ✅ | Get node executions for a run |

### File Uploads

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/upload/image` | ✅ | Upload image → Transloadit → `{ url }` |
| `POST` | `/api/upload/video` | ✅ | Upload video → Transloadit → `{ url }` |

All routes use Zod validation on request bodies and return consistent error shapes `{ error: string }`.

---

## Authentication

Clerk handles all auth via `src/middleware.ts`.

```ts
// Only these routes are public:
"/sign-in(.*)"
"/sign-up(.*)"
"/"    // redirects to /dashboard or /sign-in

// Everything else — including all /api/* routes — requires a valid Clerk session
```

Every API route calls `const { userId } = await auth()` and returns `401` immediately if not authenticated. All Prisma queries include `userId` in the `where` clause to prevent cross-user data access.

Clerk redirects:
- After sign-in → `/dashboard`
- After sign-up → `/dashboard`
- Unauthenticated access → `/sign-in`

---

## File Uploads

### Upload Flow

```
Browser selects file
  → POST /api/upload/image (or /video) with FormData
  → API creates Transloadit assembly
  → API polls assembly URL every 1.5s until ASSEMBLY_COMPLETED
  → Returns { url: "https://assets.transloadit.com/..." }
  → Browser calls updateNode(id, { imageUrl: url }) to store in node data
```

### Transloadit Assembly Config

Minimal setup — just stores the file as-is, no processing:

```json
{
  "auth": { "key": "YOUR_KEY" },
  "steps": {
    ":original": { "robot": "/upload/handle" }
  }
}
```

Processing (crop, frame extraction) happens later in Trigger.dev tasks.

### URL Extraction Priority

The upload routes try multiple locations in the Transloadit response:
1. `poll.uploads[0].ssl_url`
2. `poll.results[":original"][0].ssl_url`
3. Any key in `poll.results[*][0].ssl_url`

This handles Transloadit returning results under different keys depending on the assembly config.

---

## Deployment

### Vercel

```bash
# Build command (set in Vercel dashboard):
prisma generate && next build
```

Add all environment variables from the [Environment Variables](#environment-variables) section to your Vercel project settings.

### Trigger.dev

```bash
# Deploy all tasks to Trigger.dev cloud:
npx trigger.dev@latest deploy
```

After deploying, go to **Trigger.dev dashboard → Project → Environment Variables** and add:
- `GEMINI_API_KEY`
- `TRANSLOADIT_KEY`

These are separate from your Vercel environment and must be added manually.

### `next.config.mjs` Notes

```js
serverComponentsExternalPackages: ["fluent-ffmpeg", "ffmpeg-static", "sharp", "axios"]
```

These native packages are excluded from Next.js bundling. FFmpeg runs exclusively inside Trigger.dev tasks, not in Next.js API routes, so this is a precaution against accidental import.

---

## Keyboard Shortcuts Reference

| Shortcut | Action |
|---|---|
| `T` | Add Text node |
| `I` | Add Image Upload node |
| `L` | Add LLM node |
| `C` | Add Crop Image node |
| `E` | Add Extract Frame node |
| `Shift+V` | Add Video Upload node |
| `V` | Activate Select tool |
| `H` | Activate Pan tool |
| `X` | Activate Cut tool (click edges to delete) |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Ctrl+S` | Save workflow |
| `Ctrl+0` | Fit view |
| `Ctrl+A` | Select all nodes |
| `Ctrl+Enter` | Run full workflow |
| `Delete` / `Backspace` | Delete selected node(s) |