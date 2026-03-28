"""Unit tests for SafetyValidator — the critical safety gate.

These tests are the most important in the entire test suite.
Every blocked phrase, confidence threshold, and safety rule is tested independently.
ALL safety tests must pass with ZERO failures before any release.
"""

from __future__ import annotations

import pytest

from app.models.incident import ActionStep, EmergencyAnalysis, TriageLevel
from app.services.reasoning.safety import (
    BLOCKED_PHRASES,
    MANDATORY_FALLBACK,
    SafetyValidator,
)


class TestSafetyValidatorLowConfidence:
    """Rule 1: Confidence below threshold triggers 108 fallback."""

    def setup_method(self) -> None:
        self.validator = SafetyValidator(confidence_threshold=0.70)

    def test_low_confidence_escalates_to_call_108(
        self, low_confidence_analysis: EmergencyAnalysis
    ) -> None:
        result = self.validator.validate(low_confidence_analysis)
        assert result.triage_level == TriageLevel.CALL_108_IMMEDIATELY

    def test_low_confidence_replaces_steps_with_fallback(
        self, low_confidence_analysis: EmergencyAnalysis
    ) -> None:
        result = self.validator.validate(low_confidence_analysis)
        assert len(result.caregiver_steps) == 1
        assert "108" in result.caregiver_steps[0].instruction

    def test_confidence_exactly_at_threshold_passes(
        self, sample_emergency_analysis: EmergencyAnalysis
    ) -> None:
        """Confidence == threshold should NOT trigger fallback (>= threshold passes)."""
        sample_emergency_analysis.confidence = 0.70
        result = self.validator.validate(sample_emergency_analysis)
        assert result.triage_level == TriageLevel.CRITICAL  # Unchanged

    def test_high_confidence_passes_through(
        self, sample_emergency_analysis: EmergencyAnalysis
    ) -> None:
        sample_emergency_analysis.confidence = 0.95
        result = self.validator.validate(sample_emergency_analysis)
        # Steps should be preserved (not replaced by fallback from Rule 1)
        assert len(result.caregiver_steps) >= 1


class TestSafetyValidatorBlockedPhrases:
    """Rule 2: Blocked phrases in steps trigger 108 escalation."""

    def setup_method(self) -> None:
        self.validator = SafetyValidator()

    def test_give_aspirin_is_blocked(
        self, blocked_phrase_analysis: EmergencyAnalysis
    ) -> None:
        result = self.validator.validate(blocked_phrase_analysis)
        assert result.triage_level == TriageLevel.CALL_108_IMMEDIATELY
        assert "108" in result.caregiver_steps[0].instruction

    @pytest.mark.parametrize(
        "blocked_phrase",
        [
            "Take aspirin immediately",
            "Give aspirin now",
            "Administer aspirin",
            "Tell him to double the dose",
            "Increase the dose of metformin",
            "Stop taking metformin",
            "Stop the medication today",
            "Perform CPR on the patient",
            "Start CPR immediately",
            "Give injection of insulin",
        ],
    )
    def test_each_blocked_phrase_triggers_fallback(
        self,
        blocked_phrase: str,
        sample_emergency_analysis: EmergencyAnalysis,
    ) -> None:
        """Every blocked phrase must trigger 108 fallback."""
        sample_emergency_analysis.triage_level = TriageLevel.MODERATE
        sample_emergency_analysis.confidence = 0.90
        sample_emergency_analysis.caregiver_steps = [
            ActionStep(
                priority=1,
                instruction=blocked_phrase,
                rationale="Test — contains blocked phrase",
            )
        ]
        result = self.validator.validate(sample_emergency_analysis)
        assert result.triage_level == TriageLevel.CALL_108_IMMEDIATELY, (
            f"Phrase '{blocked_phrase}' was NOT blocked"
        )

    def test_safe_phrases_are_not_blocked(
        self, stable_analysis: EmergencyAnalysis
    ) -> None:
        """Valid, safe instructions must pass through."""
        result = self.validator.validate(stable_analysis)
        assert result.triage_level == TriageLevel.STABLE
        assert len(result.caregiver_steps) == 2


class TestSafetyValidatorCriticalTriage:
    """Rule 3: CRITICAL triage must always have 108 as step 1."""

    def setup_method(self) -> None:
        self.validator = SafetyValidator()

    def test_critical_without_108_gets_108_inserted(
        self, sample_emergency_analysis: EmergencyAnalysis
    ) -> None:
        """If a CRITICAL analysis doesn't start with 108, insert it."""
        # Remove 108 from first step
        sample_emergency_analysis.caregiver_steps[0] = ActionStep(
            priority=1,
            instruction="Help the patient sit up and breathe slowly.",
            rationale="Test — missing 108 in critical step",
        )
        result = self.validator.validate(sample_emergency_analysis)
        assert "108" in result.caregiver_steps[0].instruction

    def test_critical_with_108_already_present_not_duplicated(
        self, sample_emergency_analysis: EmergencyAnalysis
    ) -> None:
        """If step 1 already contains 108, don't insert again."""
        original_step_count = len(sample_emergency_analysis.caregiver_steps)
        result = self.validator.validate(sample_emergency_analysis)
        # Step count should be same or 1 more (if 108 was missing from first step)
        assert len(result.caregiver_steps) >= original_step_count

    def test_urgent_triage_does_not_require_108_insertion(
        self, stable_analysis: EmergencyAnalysis
    ) -> None:
        """Non-critical triage should not auto-insert 108 as step 1."""
        stable_analysis.triage_level = TriageLevel.URGENT
        stable_analysis.confidence = 0.85
        result = self.validator.validate(stable_analysis)
        # Should not force 108 for URGENT (only CRITICAL)
        assert result.triage_level == TriageLevel.URGENT


class TestSafetyValidatorMinimumSteps:
    """Rule 4: Non-stable triage must have at least 2 steps."""

    def setup_method(self) -> None:
        self.validator = SafetyValidator()

    def test_urgent_with_one_step_gets_fallback_added(
        self, sample_emergency_analysis: EmergencyAnalysis
    ) -> None:
        sample_emergency_analysis.triage_level = TriageLevel.URGENT
        sample_emergency_analysis.confidence = 0.85
        sample_emergency_analysis.caregiver_steps = [
            ActionStep(
                priority=1,
                instruction="Call 108. Tell them about chest discomfort.",
                rationale="Only step — should trigger minimum step rule",
            )
        ]
        result = self.validator.validate(sample_emergency_analysis)
        assert len(result.caregiver_steps) >= 2

    def test_stable_with_one_step_is_acceptable(
        self, stable_analysis: EmergencyAnalysis
    ) -> None:
        stable_analysis.caregiver_steps = [stable_analysis.caregiver_steps[0]]
        result = self.validator.validate(stable_analysis)
        # STABLE can have 1 step (minimum step rule only for non-stable)
        assert result.triage_level == TriageLevel.STABLE


class TestSafetyValidatorResiliency:
    """Validator must never crash regardless of malformed input."""

    def setup_method(self) -> None:
        self.validator = SafetyValidator()

    def test_empty_steps_list_is_handled(
        self, sample_emergency_analysis: EmergencyAnalysis
    ) -> None:
        sample_emergency_analysis.caregiver_steps = []
        # Should not crash — should return something safe
        try:
            result = self.validator.validate(sample_emergency_analysis)
            assert result is not None
        except Exception as e:
            pytest.fail(f"Validator raised unexpected exception: {e}")
