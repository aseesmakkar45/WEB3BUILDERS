# Full-Stack Data Flow Verification Playbook

This playbook provides step-by-step instructions for developers to verify the connectivity, Cross-Origin Resource Sharing (CORS) configuration, and Server-Sent Events (SSE) streaming capabilities between the React Frontend and the FastAPI Backend.

## 1. Setup & Initialization

### Start the Backend
1. Open a terminal and navigate to the root directory.
2. Navigate into the backend: `cd backend`
3. Install dependencies: `pip install -r requirements.txt` (use a virtual environment if desired).
4. Launch the server: `uvicorn main:app --reload`
5. **Verify:** The terminal should output `Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)`.

### Start the Frontend
1. Open a second terminal window and navigate to the frontend directory: `cd frontend`
2. Install dependencies (if not already done): `npm install`
3. Launch the Vite server: `npm run dev`
4. **Verify:** The terminal should indicate the app is running, usually at `http://localhost:5173`.

## 2. Browser Verification Steps

### Step 1: Open Network Tools
1. Navigate to `http://localhost:5173` in your Chromium-based browser (Chrome, Edge, Brave).
2. Open Developer Tools (F12 or `Ctrl+Shift+I`).
3. Navigate to the **Network** tab.
4. Check the "Preserve log" checkbox (optional but recommended).

### Step 2: Test the Stream Connection
1. In the PersonaTwin.AI interface, type a prompt (e.g., "What are your thoughts on settling Mars?") and hit Enter.
2. Look at the Network tab. You should see a `POST` request to `stream`.
3. Click on the `stream` request.
4. Verify the **Headers**:
   - Status Code: `200 OK`
   - Content-Type: `text/event-stream; charset=utf-8`
5. Verify the **Payload**:
   - Scroll down to Request Payload or Form Data.
   - You should see the `text` field mapping to your prompt, and a generated `chatId`.

### Step 3: Monitor the Event Stream
1. With the `stream` request selected, click the **EventStream** or **Response** tab.
2. **Success Condition:** You should see multiple data chunks arriving sequentially in real-time, matching the `data: ...` SSE format.
3. Observe the frontend UI simultaneously. The assistant's text bubble should be populating fluidly, perfectly mirroring the incoming network chunks.

## 3. Advanced Utility Verification

### Verify Edit Functionality
1. Hover over the user message you just sent.
2. Click the `Edit` (pencil) icon. The bubble should transform into an active textarea.
3. Alter the text (e.g., append "in detail").
4. Click **Save & Submit**.
5. **Verify:** The UI should immediately remove any previous assistant replies to that message, append a new "Thinking..." state, and a fresh `POST` request to `stream` should appear in the Network tab.

### Verify Copy Functionality
1. Hover over any text message.
2. Click the `Copy` icon in the top right.
3. The icon should briefly change to a green checkmark (`Copied!`).
4. Paste the content into a text editor (e.g., Notepad) to verify the clipboard contains the exact message string.

## 4. Troubleshooting
- **CORS Error in Console:** Ensure you are accessing the frontend at `http://localhost:5173` (not `127.0.0.1`) as specified in `backend/main.py` CORS origins.
- **Connection Refused:** Ensure the FastAPI server is running on port 8000 and has not crashed due to syntax errors.
- **Stream Stalls:** Check the backend terminal logs. You should see `Received Request for chat: [UUID]` printed for every interaction.
