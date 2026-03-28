# Promptwars 2026 March 28 — SAHAYAK

**Google AI Promptwar Hackathon 2026 Submission**
**Vertical**: Healthcare
**Core Tech**: Google Cloud, Gemini 1.5 Pro, FHIR R4, FastAPI

![SAHAYAK Mission](https://i.imgur.com/KxO2xG3.png)

## The Problem
India's 6 million informal caregivers face a crisis the moment a medical emergency strikes.
When an elderly relative experiences chest pain, high blood pressure, or a severe fall, caregivers face:
1. **Language Barriers**: Panicked caregivers speak Hindi, Tamil, or Kannada, while medical systems require structured clinical English.
2. **Missing Context**: Medication lists (which contain critical contraindications like blood thinners) are scattered on blurry paper prescriptions.
3. **Generic Guidance**: Standard helplines give "one-size-fits-all" advice, ignoring the patient's specific chronic conditions.

**Every second between emergency and informed care costs lives.**

## The Solution: SAHAYAK
**SAHAYAK (सहायक)** is a multimodal, voice-first AI emergency co-pilot completely built on the Google Cloud ecosystem. 

It accepts a chaotic mix of inputs — a panicked Hindi voice call, a blurry photo of a prescription, and vitals from a wearable device — and fuses them into a single, highly structured, life-saving response in under 8 seconds.

### Key Features
*   🎤 **Voice-First Input**: Speaks 12+ Indian languages via **Cloud Speech-to-Text v2**.
*   📸 **Prescription OCR**: Deciphers blurry medical documents via **Cloud Vision API**.
*   🧠 **Single-Call AI Fusion**: Fuses multiple inputs with a 1M-token patient history profile using **Vertex AI (Gemini 1.5 Pro)**.
*   🛡️ **Deterministic Safety Gate**: A strict algorithmic validator blocks AI hallucinations and forces mandatory "Call 108" interventions for critical, low-confidence, or unsafe outputs.
*   🏥 **Hospital EMR Pre-Brief**: Automatically generates and pushes an HL7 **FHIR R4** patient brief to the target hospital via the **Cloud Healthcare API** before the ambulance even arrives.

## Architecture & Google Cloud Services
This project leverages 8 core Google Cloud services in a production-ready architecture designed to scale to zero and handle sensitive PII securely:

1.  **Vertex AI (Gemini 1.5 Pro)**: Core clinical reasoning layer.
2.  **Cloud Speech-to-Text**: Voice transcription.
3.  **Cloud Vision API**: Prescription OCR and unstructured text extraction.
4.  **Cloud Healthcare API**: FHIR R4 interoperability for hospital integration.
5.  **Firestore**: NoSQL real-time database for patient profiles.
6.  **Cloud Run**: Serverless containerised deployment of the FastAPI backend.
7.  **Firebase Authentication**: Phone OTP auth designed for low digital literacy.
8.  **Secret Manager & Cloud KMS**: Patient data encrypted at rest (CMEK) and zero hardcoded credentials.

## Repository Structure
```
.
├── app/                  # FastAPI backend
│   ├── main.py           # App factory
│   ├── config.py         # Pydantic settings (Secret Manager)
│   ├── models/           # Pydantic & FHIR schemas
│   ├── routers/          # API endpoints (emergency, profile)
│   └── services/         # GCP Integrations (Gemini, Speech, Vision, FHIR)
├── frontend/             # Voice-first WCAG 2.1 AA UI
│   ├── index.html
│   ├── styles.css
│   └── app.js            # Interactive Emergency Demo
├── terraform/            # Infrastructure as Code (GCP)
├── tests/                # 40+ pytest cases (Unit & Integration)
├── Dockerfile            # Cloud Run optimised container
└── requirements.txt      # Production dependencies
```

## Running the Project

### 1. View Frontend Demo (Zero Config)
To run the interactive UI demo:
```bash
cd frontend
npx serve .
```

### 2. Local Backend Setup (Requires GCP Account)
```bash
# 1. Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# 2. Authenticate with Google Cloud
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID

# 3. Run FastAPI server
uvicorn app.main:app --reload --port 8080
```

### 3. Running Tests
The test suite securely mocks all Google Cloud services via Pytest fixtures, ensuring no unexpected billing charges or API key leaks during CI/CD.
```bash
pytest tests/ -v
```

## Safety & Ethics
*  **Safety Validator**: An independent Python layer validates all Gemini outputs before delivery. If Gemini gives life-threatening advice (e.g., "Give more aspirin" to a patient already on blood thinners) or confidence drops below 70%, the system drops the AI response and hard-fallbacks to "Call 108 immediately."
*  **PII Sanitisation**: The AI is blinded to exact caregiver identities to protect privacy.
*  **Accessibility**: Frontend is WCAG 2.1 AA compliant (4.5:1 contrast, 48dp touch targets).

---
*Built by Kamal Patel for the Google AI Promptwar Hackathon 2025.*
