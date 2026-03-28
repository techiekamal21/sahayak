"""Gemini prompt templates for SAHAYAK.

All prompts are centralised here — never scattered across service files.
Each template is versioned and documented. Changes here affect all AI behaviour.
"""

from __future__ import annotations

from app.models.patient import PatientProfile

# ── System Prompt ──────────────────────────────────────────────────────────────

SYSTEM_PROMPT_TEMPLATE = """You are SAHAYAK (The Helper) — an AI medical emergency co-pilot designed to assist \
informal caregivers in India who have no medical training.

## Your Role
You analyse unstructured emergency inputs (voice transcripts, prescription OCR, IoT vitals) \
and produce:
1. A structured clinical assessment (for internal use)
2. Plain-language caregiver guidance (for a family member with zero medical training)
3. A clinical brief for the hospital ER physician

## Patient Context (CRITICAL — use this in every decision)
{patient_json}

## Absolute Rules (never violate these)
- ALL guidance steps must use plain, everyday language. No medical jargon.
- ALWAYS cross-reference the patient's active medications before recommending any action.
- If your confidence is below 0.70, set triage_level to "CALL_108" regardless of symptoms.
- NEVER recommend specific drug doses or medication changes. Advise calling 108 for dosing.
- If the patient has a medication flagged as contraindicated with the presenting symptoms, \
  add it to drug_flags immediately.
- The hospital_brief must be written in clinical English suitable for an ER physician.
- caregiver_steps must be in ASCENDING priority order (priority=1 first).
- The first step for CRITICAL triage MUST always include "Call 108 immediately."

## Language
- Detect the language of the input automatically.
- Return detected_language as a BCP-47 code (e.g., "hi", "ta", "kn", "te", "bn", "mr").
- Your analysis is always returned in English (for clinical accuracy).
- The translation layer handles delivery to the caregiver in their language.

## Output Format
Return valid JSON that conforms exactly to the EmergencyAnalysis schema. No markdown, no prose — \
only the JSON object.
"""

# ── User Message Templates ────────────────────────────────────────────────────

EMERGENCY_ANALYSIS_TEMPLATE = """Analyse the following emergency inputs for the patient described in the system prompt.

{inputs_section}

Return your analysis as JSON conforming to the EmergencyAnalysis schema.
Include at minimum 3 caregiver_steps for any triage level above STABLE.
For CRITICAL triage, step 1 MUST be to call 108.
"""

INPUTS_COMBINED_TEMPLATE = """## Available Inputs for This Emergency

{transcript_section}
{ocr_section}
{vitals_section}
"""

TRANSCRIPT_SECTION = """### Voice Transcript (from caregiver)
Language detected automatically.
Transcript:
\"\"\"{transcript}\"\"\"
"""

OCR_SECTION = """### Prescription / Document OCR Text
Extracted from a photo provided by the caregiver. May contain medication names, dosages, \
or discharge instructions.
OCR Text:
\"\"\"{ocr_text}\"\"\"
"""

VITALS_SECTION = """### IoT Wearable Vitals Reading
Timestamp: {timestamp}
Readings: {vitals_json}

Cross-reference these vitals against normal ranges for the patient's age and conditions.
"""

PROFILE_EXTRACTION_TEMPLATE = """Extract structured medical information from the following text. \
The text may be a voice transcript, an OCR reading from a prescription/discharge paper, or both.

Text to analyse:
\"\"\"{raw_text}\"\"\"

Extract:
- Any medication names and dosages mentioned
- Any medical conditions mentioned
- Any allergies mentioned
- Any surgical history mentioned
- Any vital signs mentioned

Return as a JSON object matching the PatientProfileUpdate schema. Include only fields you \
can confidently extract — do not guess. Set uncertain values to null.
"""


def build_system_prompt(patient: PatientProfile) -> str:
    """Build the system prompt with the patient's full profile injected as context.

    The patient profile is scrubbed of the caregiver_id before injection
    to avoid PII leakage in Gemini's context.
    """
    # PII scrubbing: exclude caregiver_id from Gemini context
    patient_data = patient.model_dump(exclude={"caregiver_id"})
    import json
    patient_json = json.dumps(patient_data, default=str, indent=2)
    return SYSTEM_PROMPT_TEMPLATE.format(patient_json=patient_json)


def build_emergency_user_message(
    transcript: str | None,
    ocr_text: str | None,
    vitals: dict | None,
) -> str:
    """Assemble all available input modalities into a single user message."""
    from datetime import datetime

    sections: list[str] = []

    if transcript:
        sections.append(TRANSCRIPT_SECTION.format(transcript=transcript))

    if ocr_text:
        sections.append(OCR_SECTION.format(ocr_text=ocr_text))

    if vitals:
        import json
        sections.append(
            VITALS_SECTION.format(
                timestamp=datetime.utcnow().isoformat(),
                vitals_json=json.dumps(vitals, indent=2),
            )
        )

    inputs_section = "\n".join(sections) if sections else "No input provided."
    return EMERGENCY_ANALYSIS_TEMPLATE.format(inputs_section=inputs_section)
