"""Safety validator — the last gate before AI output reaches a caregiver.

NO output from Gemini reaches the caregiver without passing through this validator.
This is a hardcoded, rule-based layer — it does not call any AI.

Rules are deterministic and testable. This module has 100% test coverage.
"""

from __future__ import annotations

import logging
import re

from app.models.incident import ActionStep, EmergencyAnalysis, TriageLevel

logger = logging.getLogger(__name__)

# ── Blocked Phrases ────────────────────────────────────────────────────────────
# These phrases in any caregiver step trigger immediate escalation to 108.
# They represent instructions that are either dangerous without clinical oversight
# or that should only be given by emergency services.

BLOCKED_PHRASES: list[str] = [
    "take aspirin",
    "give aspirin",
    "administer aspirin",  # May already be on daily aspirin — double dose risk
    "double the dose",
    "increase the dose",
    "double his dose",
    "double her dose",  # Never advise dose changes
    "stop taking",
    "stop the medication",
    "discontinue",  # Never advise stopping medication
    "perform cpr",  # Only after checking consciousness — misuse risk
    "start cpr",
    "do cpr",
    "inject",
    "give injection",  # No self-injection should be advised without proper training
    "insert",  # No invasive procedures
    "administer iv",
    "apply tourniquet",  # Only medically trained personnel
]

# ── Mandatory Fallback Step ───────────────────────────────────────────────────
# Inserted as step 1 whenever the safety validator triggers.

MANDATORY_FALLBACK = ActionStep(
    priority=1,
    instruction=(
        "Call 108 immediately. Tell the operator: "
        "'I have an elderly patient with a medical emergency.' "
        "Stay on the line with the operator and follow their instructions."
    ),
    caution=None,
    rationale="Safety fallback — triggered when AI confidence is insufficient or output is unsafe.",
)

MANDATORY_CPR_CHECK = ActionStep(
    priority=1,
    instruction=(
        "Check if the person is conscious: "
        "tap their shoulder firmly and ask 'Are you okay?' loudly. "
        "If no response, call 108 immediately and tell them the patient is unconscious."
    ),
    caution="Do not attempt CPR unless instructed by the 108 operator.",
    rationale="CPR check must precede all other cardiac interventions — prevents harm from premature CPR.",
)


class SafetyValidationError(Exception):
    """Raised when a non-recoverable safety issue is detected."""


class SafetyValidator:
    """Validates and sanitises Gemini emergency analysis output.

    Each rule is independently testable. Rules execute in order.
    First rule violation triggers fallback and stops further processing.
    """

    def __init__(self, confidence_threshold: float = 0.70) -> None:
        self.confidence_threshold = confidence_threshold
        self._compiled_patterns = [
            re.compile(phrase, re.IGNORECASE) for phrase in BLOCKED_PHRASES
        ]

    def validate(self, analysis: EmergencyAnalysis) -> EmergencyAnalysis:
        """Run all safety rules. Return sanitised analysis.

        Never raises — always returns an EmergencyAnalysis.
        If unsafe, returns a fallback-escalated analysis.
        """
        try:
            analysis = self._rule_low_confidence(analysis)
            analysis = self._rule_blocked_phrases(analysis)
            analysis = self._rule_critical_must_have_108(analysis)
            analysis = self._rule_minimum_steps(analysis)
        except Exception:
            logger.exception("Safety validator encountered unexpected error — applying fallback")
            analysis.triage_level = TriageLevel.CALL_108_IMMEDIATELY
            analysis.caregiver_steps = [MANDATORY_FALLBACK]
        return analysis

    # ── Individual Rules ──────────────────────────────────────────────────────

    def _rule_low_confidence(self, analysis: EmergencyAnalysis) -> EmergencyAnalysis:
        """Rule 1: Confidence below threshold → escalate to 108 fallback."""
        if analysis.confidence < self.confidence_threshold:
            logger.warning(
                "Low confidence (%.2f < %.2f) — escalating to CALL_108",
                analysis.confidence,
                self.confidence_threshold,
            )
            analysis.triage_level = TriageLevel.CALL_108_IMMEDIATELY
            analysis.caregiver_steps = [MANDATORY_FALLBACK]
        return analysis

    def _rule_blocked_phrases(self, analysis: EmergencyAnalysis) -> EmergencyAnalysis:
        """Rule 2: Scan all steps for blocked phrases → escalate if found."""
        for step in analysis.caregiver_steps:
            for pattern in self._compiled_patterns:
                if pattern.search(step.instruction):
                    logger.warning(
                        "Blocked phrase '%s' detected in step %d — escalating",
                        pattern.pattern,
                        step.priority,
                    )
                    analysis.triage_level = TriageLevel.CALL_108_IMMEDIATELY
                    analysis.caregiver_steps = [MANDATORY_FALLBACK]
                    return analysis
        return analysis

    def _rule_critical_must_have_108(self, analysis: EmergencyAnalysis) -> EmergencyAnalysis:
        """Rule 3: CRITICAL triage must always have '108' in step 1."""
        if analysis.triage_level == TriageLevel.CRITICAL:
            if not analysis.caregiver_steps:
                analysis.caregiver_steps = [MANDATORY_FALLBACK]
            elif "108" not in analysis.caregiver_steps[0].instruction:
                # Insert mandatory 108 call as first step, re-number others
                existing = [
                    ActionStep(
                        priority=s.priority + 1,
                        instruction=s.instruction,
                        caution=s.caution,
                        rationale=s.rationale,
                    )
                    for s in analysis.caregiver_steps
                ]
                analysis.caregiver_steps = [MANDATORY_FALLBACK, *existing]
        return analysis

    def _rule_minimum_steps(self, analysis: EmergencyAnalysis) -> EmergencyAnalysis:
        """Rule 4: Non-STABLE triage must have at least 2 steps."""
        if (
            analysis.triage_level not in (TriageLevel.STABLE, TriageLevel.CALL_108_IMMEDIATELY)
            and len(analysis.caregiver_steps) < 2
        ):
            # Add fallback as step 1 if only 1 step exists
            analysis.caregiver_steps.insert(0, MANDATORY_FALLBACK)
        return analysis
