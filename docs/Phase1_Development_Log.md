# Frontend Development Log - Phase 1 MVP

This document summarizes the chronological development of the PersonaTwin.ai Frontend MVP, categorized by the distinct development passes (prompts) executed.

## PASS 1: Core Shell & Layout Scaffolding
**Goal:** Establish the foundational React architecture, Tailwind configuration, and the primary UI components.
*   **Initialization:** Scaffolded a new React Vite project within the `frontend/` directory to keep the root directory clean for the future FastAPI backend.
*   **Styling:** Installed and configured Tailwind CSS. Defined the core color palette (including custom `--color-marble` for the pristine background) in `index.css`.
*   **Component Structure:**
    *   `App.jsx`: Created the full-screen flex container.
    *   `Sidebar.jsx`: Built the fixed-width sidebar with a "New Chat" button, "Recents" section, and a User Profile footer.
    *   `ChatContainer.jsx`: Implemented the main chat area featuring a dynamic greeting system that randomly selects from contextually aware Persona AI greetings.
    *   `MessageInput.jsx`: Designed the central query input area with auto-resizing `<textarea>`, attachment buttons, and microphone UI.
*   **Metadata:** Updated the `index.html` document title to "New Chat - PersonaTwin.ai".

## PASS 2: Advanced UX Interactions & Typographical Overhaul
**Goal:** Introduce fluid state transitions, resizable panels, and establish a premium typographical hierarchy.
*   **Sidebar Interactivity:** 
    *   Added a draggable resize handle allowing the sidebar width to fluidly adjust between 200px and 400px.
    *   Implemented a collapse/expand toggle (`PanelLeftClose` / `PanelLeftOpen`), which dynamically relocates to the top-left of the chat container when the sidebar is hidden.
    *   Cleared out hardcoded mock data to prepare for dynamic injection.
*   **Typography:** 
    *   Imported the **Zilla Slab** Google Font and mapped it as the default sans-serif font in Tailwind to achieve a "modern typewriter" aesthetic—instilling a serious, focused tone while maintaining high legibility.
    *   Increased global letter spacing (`tracking-wide`) and line heights (`leading-loose`) to make the interface feel breathable and uncrowded.
*   **AI Disclaimer:** Updated the disclaimer in `MessageInput.jsx` to explicitly state: *"AI generated information. AI can make mistakes"*.

## PASS 3: API Wiring, Audio Integration & UI Polish
**Goal:** Bridge the UI with native browser APIs to handle multimodal inputs (text, documents, and voice) for the Gemma 4 pipeline.
*   **Input Polish:** Eradicated the harsh default browser focus ring on the textarea using strict Tailwind utilities (`focus:outline-none`, `focus:ring-0`, `border-none`) for a floating, pristine input aesthetic.
*   **Header Typography:** Imported the **Spectral** Google Font and applied it exclusively to the large dynamic greeting in `ChatContainer.jsx` to provide elegant contrast against the Zilla Slab body text.
*   **Document Attachment:** 
    *   Wired the Paperclip icon to a hidden `<input type="file" multiple />`.
    *   Selected files are saved in local React state and rendered as removable, pill-shaped UI "chips" located above the text input.
*   **Native Voice Capture:** 
    *   Integrated the browser's native `MediaRecorder` API to the Microphone button.
    *   When recording, requests microphone permissions (`getUserMedia`) and pulses the icon red.
    *   Upon stopping, it compiles the raw audio chunks into a Blob (`audio/webm`), converts it to a standard `File` object (`voice_note.webm`), and automatically attaches it alongside document chips.

## PASS 4: Multi-Chat Session Architecture & Drag-and-Drop Ingestion
**Goal:** Transition from a single isolated chat state to a robust multi-session architecture and implement global file ingestion.
*   **State Hoisting:** Moved the `chats` array and `activeChatId` state to the top level in `App.jsx` to synchronize the Sidebar and ChatContainer perfectly.
*   **Sidebar Actions:** 
    *   Chats are now categorized into **Pinned** and **Recents**.
    *   Added hover-state action buttons to each chat item: **Pin**, **Delete**, and **Rename**.
    *   Renaming triggers an inline `<input>` field, saving the new title on Enter or Blur.
*   **Global Drag-and-Drop:** 
    *   Added window-level `dragover`, `dragleave`, and `drop` event listeners to `App.jsx`.
    *   Dragging files over the browser renders a full-screen, backdrop-blurred overlay with a pulsing upload icon.
    *   Dropping files automatically attaches them to the current active chat, or instantly spawns a new session if none exists.
*   **Dynamic Title:** Hooked `document.title` to the active chat's title using a React `useEffect`.
*   **Interactive File Chips:** 
    *   Created `LightboxModal.jsx` for image files. Clicking an image chip opens a high-resolution modal preview using `URL.createObjectURL`.
    *   Clicking a non-image document/audio chip programmatically generates a temporary anchor tag to instantly trigger a browser download, followed by memory cleanup (`URL.revokeObjectURL`).

## PASS 5: Activity-Based Sorting
**Goal:** Ensure the sidebar accurately reflects user activity across multiple chat sessions.
*   **Activity Tracking:** Added a `lastUsedTime` timestamp to the chat object schema.
*   **Update Logic:** Implemented an `updateChatActivity(id)` function that updates the timestamp to `Date.now()` whenever a prompt or file is submitted in `MessageInput.jsx`.
*   **Sidebar Sorting:** Modified the Sidebar rendering logic to sort both Pinned and Recent chat arrays by `lastUsedTime` (descending) rather than `createdAt`, guaranteeing that the most recently interacted-with chats bubble to the top of their respective groups.

## PASS 6: Soft Transition Animations
**Goal:** Soften the UI experience by applying fluid animations to state changes, element entrances, and overlays.
*   **CSS Keyframes:** Utilized the Tailwind CSS v4 `@theme` block in `index.css` to define native `@keyframes` (`fade-in`, `fade-in-up`, `scale-in`).
*   **Overlay Animations:**
    *   Applied `animate-fade-in` to the Drag-and-Drop backdrop and `animate-scale-in` to the drag prompt to draw focus gracefully.
    *   Applied identical `fade-in` and `scale-in` treatments to the `LightboxModal.jsx` to prevent jarring snap-opens.
*   **Component Entrances:**
    *   Applied `animate-fade-in-up` to the file attachment chips in `MessageInput.jsx` so they slide elegantly into place.
    *   Applied `animate-fade-in` to the chat items in `Sidebar.jsx`, ensuring fluid transitions when creating, renaming, or pinning sessions.

## PASS 7: Strict Sidebar Pinning Constraints
**Goal:** Ensure the Sidebar remains uncluttered by limiting the amount of vertical space consumed by Pinned chats.
*   **Pinning Logic Constraints:** Updated the `pinChat` function in `App.jsx` to count currently pinned chats before executing a pin action.
*   **User Feedback:** If a user attempts to pin a 6th chat session, the state mutation is blocked and a native browser alert is safely triggered: *"You can only pin up to 5 chats at a time."*

## PASS 8: Claude Landing Layout & Simulated Streaming
**Goal:** Restructure the UI to match the fluid landing-to-active transition of top-tier chat apps, and engineer a client-side API stream simulator.
*   **Centered Landing State (`!isChatActive`):**
    *   Added a prominent amber `Scale` icon above the greeting.
    *   The `MessageInput` rests directly in the center of the viewport, with three Quick-Action legal recommendation pills situated immediately below.
    *   Clicking any pill injects the prompt into the input state and shifts browser focus to the textarea.
*   **Active Chat Transition (`isChatActive`):**
    *   Submitting a query causes the centered landing layout to fade out, and the `MessageInput` gracefully transitions/docks to the absolute bottom of the viewport.
    *   The primary container transitions into a vertically scrollable stream of native message bubbles.
*   **Real-Time Sidebar Search:**
    *   Embedded a sleek search input below the "New Chat" CTA in the sidebar.
    *   Automatically filters the Pinned and Recents arrays based on the search query.
*   **Client-Side Streaming Engine:**
    *   Lifted the submit handling logic to `handleSendMessage` inside `App.jsx`.
    *   Created `simulateStream`, which instantiates a mocked "PersonaTwin.ai" response bubble and recursively injects an IRAC-structured string token-by-token every 20ms to mimic the tactile UX of a live LangGraph streaming API.

## PASS 9: Full-Stack Integration & Message Utilities (Phase 1 Step 6)
**Goal:** Tear down the local sandbox UI timer and wire the frontend directly to a real FastAPI backend, while implementing advanced message interactions.
*   **FastAPI Initialization:** Scaffolded `backend/` with `main.py` and `requirements.txt`. Implemented the `/api/chat/stream` POST endpoint returning `StreamingResponse`.
*   **Network Stream Parsing:** Replaced `simulateStream` in `App.jsx` with a real `fetch` call that reads `multipart/form-data` and uses `ReadableStreamDefaultReader` to parse incoming SSE `data: ` chunks in real-time.
*   **Live Telemetry:** Added `console.log` and `console.error` hooks deep into the stream reader loop to explicitly dump network tokens into the developer console as they arrive over the wire.
*   **Message UX Utilities:**
    *   Implemented a hover-state action bar for message bubbles.
    *   **Copy:** Uses `navigator.clipboard.writeText` with a temporary 2-second success state icon (`Check`).
    *   **Edit:** Replaces the text bubble with an active `<textarea>`. Saving the edit smartly truncates the message history and spins up a brand new streaming request to the backend.

## PASS 10: Production Backend Restructuring (Phase 2 Step 1)
**Goal:** Modularize the FastAPI gateway to create a highly isolated handoff boundary for the AI engineers building the LangGraph/ChromaDB RAG pipeline.
*   **Modular Architecture:**
    *   `core/config.py`: Introduced Pydantic `BaseSettings` for global app config (Database URLs, Model Paths).
    *   `api/routes/chat.py`: Abstracted the streaming endpoint into a dedicated `APIRouter`.
    *   `main.py`: Refactored to include routers and leverage FastAPI's modern `@asynccontextmanager` for server lifespans, adding explicit `logger.info` blocks for team DB initialization.
*   **The RAG Sandbox:**
    *   Created `services/rag_engine.py` containing an asynchronous `generate_rag_stream` generator.
    *   Injected massive developer comments instructing the LangGraph team exactly where to instantiate their state machines, query ChromaDB, and yield the Gemma 4 tokens without ever touching the API routing layer.

## PASS 11: Advanced Streaming Controls & Memory Rollbacks (Phase 2 Step 2)
**Goal:** Finalize the full-stack architecture by granting users full control over active inference streams and ensuring pristine memory management when editing historical messages.
*   **Active Stream Interruption (Frontend):**
    *   Integrated an `AbortController` deeply into `callStreamAPI` within `App.jsx`.
    *   Updated `MessageInput.jsx` to dynamically render a square `Stop` button during active generation, allowing users to forcefully terminate the network stream.
    *   Handled the resulting `AbortError` gracefully to reset UI state without crashes.
*   **Backend Disconnection Telemetry:**
    *   Wrapped the RAG generation loop in `backend/services/rag_engine.py` inside a `try...except asyncio.CancelledError` block.
    *   This instantly catches the broken socket when the frontend aborts, logging a highly visible warning to the backend console and immediately halting any ghost GPU inference.
*   **Deep Context Truncation & Cursor Precision:**
    *   Verified the `editMessageAndResubmit` function surgically slices the message array exactly at the modified message index, perfectly managing historical context rollbacks before re-submitting to the backend.
    *   Engineered a UX micro-interaction in `ChatContainer.jsx` that automatically calculates the length of a historical message upon clicking 'Edit', using `.setSelectionRange()` to anchor the text cursor precisely at the absolute end of the message string for immediate typing.

## PASS 12: Global Keyboard Capture / "Type-to-Chat" (Phase 2 Step 3)
**Goal:** Create a hyper-responsive, desktop-class experience where the user can simply start typing anywhere in the app to instantly focus the main input field.
*   **Window-Level Listener:** Bound a global `keydown` event listener via a React `useEffect` inside `MessageInput.jsx`.
*   **Focus Guardrails:** Implemented strict exclusion rules to ignore keystrokes if the user is already focused on an existing `<input>`, `<textarea>`, or `contenteditable` element (e.g., editing a message or searching).
*   **Modifier Filtering:** Ignored `metaKey`, `ctrlKey`, `altKey` combinations and functional control keys (`e.key.length > 1`) to preserve native browser shortcuts and interactions.
*   **Seamless Cascade:** Safely triggered `.focus()` on the main textarea, allowing the initial keystroke to perfectly route into the React state without dropping a single character.
