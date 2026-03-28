# Promptwars 2026 Hackathon — SAHAYAK (First Responder AI)

**Google AI Promptwar Hackathon 2026 Submission**  
**Vertical**: Healthcare & Emergency Medical Response  
**Core Technologies**: Google Cloud, Gemini 2.0 Flash, FastAPI, Web Speech API

---

## 1. The Problem Space
India's 6 million informal caregivers face a crisis the moment a medical emergency strikes. When an elderly relative experiences sudden chest pain, high blood pressure, or a severe fall, untrained family members face:
1. **Language Barriers**: Panicked caregivers speak Hindi, Tamil, Telugu, or Bengali, while medical systems and doctors require structured clinical English.
2. **Missing Context**: Critical contraindications (like blood thinners) are easily forgotten in the panic.
3. **Generic Guidance**: Standard helplines give "one-size-fits-all" advice, ignoring the patient's specific chronic conditions.

**Every second between emergency and informed care costs lives.**

## 2. The Solution: SAHAYAK (सहायक)
**SAHAYAK** is a multimodal, real-time AI emergency co-pilot built entirely on the Google ecosystem. 

It acts as an instantaneous bridge between an untrained caregiver and clinical action. It accepts conversational panic prompts in Native Indian Languages, cross-references them against the patient's existing chronic conditions and active medications, and fuses them into a highly structured, life-saving response in milliseconds.

### Approach and Logic
- **Input Modality**: Native Language Voice (via Web Speech API) + Simulated IoT Vitals.
- **Reasoning Engine**: The inputs are packaged with the patient's complete history profile and sent to **Gemini 2.0 Flash**.
- **Output Triangulation**: Gemini returns a strictly typed JSON schema containing:
  1. A Clinical Triage Level (CRITICAL, URGENT, STABLE).
  2. A native English translation of the caregiver's panicked speech for hospital charts.
  3. Actionable, step-by-step guidance in plain vocabulary.
  4. Medication contraindication flags (e.g. "Do not give Aspirin, patient is already on Warfarin").

### Assumptions Made
1. The patient's chronic conditions, medical history, and active drug list are already onboarded into the Cloud Firestore-style database (or mocked backend) prior to the emergency.
2. The user of the app is a family member or bystander with absolutely zero formal medical training.

---

## 3. Evaluation Focus Areas

Our implementation strictly targets the Promptwars 2026 judging criteria:

### A. Code Quality (Readability & Maintainability)
- **Strict Typing**: The entire Python backend uses strict Pydantic V2 models (`app/models`) ensuring a single source of truth for both API contracts and AI reasoning outputs.
- **Service Abstraction**: The core Gemini connection is isolated in `app/services/reasoning/gemini.py`, decoupling the AI logic from the FastAPI routing logic.
- **Prompt Centralization**: All system instructions and JSON structure injections are maintained in a dedicated `prompts.py` file to prevent prompt drift.

### B. Security (Safe & Responsible Implementation)
- **Zero Hardcoded Secrets**: Completely environment-variable driven via Pydantic `Settings`. 
- **PII Protection**: Caregiver IDs and sensitive tracking metadata are explicitly stripped from the context payloads before being sent to the Gemini context window (`exclude={"caregiver_id"}`).
- **Algorithmic Safety Net**: An independent Python `SafetyValidator` intercepts Gemini's outputs. If Gemini hallucinates a confidence score below 70%, the system drops the AI response and executes a hard-fallback to the official Indian "Call 108" emergency protocol.

### C. Efficiency (Optimal Resource Use)
- **Real-Time Latency**: The intelligence engine was aggressively optimized by abandoning the sluggish `gemini-1.5-pro` model in favor of the blistering fast **Gemini 2.0 Flash**. 
- **Lean SDK Integration**: We explicitly bypass standard SDK schema-enforcement bloat that crashes on complex nested JSON, instructing Gemini directly via the System Prompt for near-zero-latency structural compliance.
- **Containerless Architecture**: The entire FastAPI backend is capable of scaling to zero instantly on Google Cloud Run.

### D. Testing (Validation of Functionality)
- **Resilient Error Handling**: The API possesses native `try/except` HTTP 429 hooks. If Google AI Rate Limits are triggered during high-throughput testing, the backend safely relays a deterministic `429 Too Many Requests` status to the UI layer, avoiding silent 500 server crashes.

### E. Accessibility (Inclusive Design)
- **Multilingual Support**: The frontend UI features a dynamic Web Speech API Language dropdown bridging the digital divide across Hindi, Tamil, Telugu, Kannada, Bengali, Malayalam, and English.
- **WCAG 2.1 UI**: The glassmorphism frontend possesses high-contrast text, large 48dp mobile touch-targets, and screen-readable output translation blocks.
- **Low Digital Literacy**: Features a massive central microphone button ("Tap to Record") instead of requiring frantic typing during a panic attack.

### F. Google Services (Meaningful Integration)
This project is deeply integrated into Google's ecosystem:
1. **Gemini 2.0 Flash API**: The autonomous medical reasoning core processing multimodal context.
2. **Google Cloud Platform (GCP)**: Configured seamlessly for Cloud Run serverless deployment via `app/main.py`.
3. **Google Chrome Web Speech API**: Powers the real-time transcription layer right in the browser.

---

## 4. How to Run Locally

### Requirements
- Python 3.10+
- A Google GenAI API Key (`GEMINI_API_KEY`)

### Start the Backend
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set API Key
$env:GEMINI_API_KEY="your_api_key_here"  # Windows PowerShell
export GEMINI_API_KEY="your_api_key_here" # Mac/Linux

# 3. Start FastAPI
uvicorn app.main:app --host 127.0.0.1 --port 8080
```

### Start the Frontend
Open `frontend/index.html` in any modern browser (Google Chrome or Microsoft Edge recommended for native Speech Recognition). Connect your microphone, select your native language, and speak!

---
*Built by Kamal Patel for the Promptwars 2026 March 28 Hackathon.*
