"""Unit tests for IoT vitals normaliser — device alias resolution and alarm flags."""

from __future__ import annotations

import pytest

from app.models.patient import Vitals
from app.services.ingestion.iot import IoTNormaliser


class TestIoTNormaliser:
    """Tests for normalising diverse wearable device payload formats."""

    def setup_method(self) -> None:
        self.normaliser = IoTNormaliser()

    def test_standard_field_names(self) -> None:
        payload = {
            "heart_rate_bpm": 75,
            "spo2_percent": 98.0,
            "systolic_bp_mmhg": 125,
            "diastolic_bp_mmhg": 82,
        }
        vitals = self.normaliser.normalise(payload)
        assert vitals.heart_rate_bpm == 75
        assert vitals.spo2_percent == 98.0

    def test_alias_field_names_hr(self) -> None:
        payload = {"hr": 88, "spO2": 96.5}
        vitals = self.normaliser.normalise(payload)
        assert vitals.heart_rate_bpm == 88
        assert vitals.spo2_percent == 96.5

    def test_missing_fields_are_none(self) -> None:
        payload = {"heart_rate_bpm": 72}
        vitals = self.normaliser.normalise(payload)
        assert vitals.spo2_percent is None
        assert vitals.systolic_bp_mmhg is None

    def test_critical_low_spo2_triggers_alarm(self) -> None:
        vitals = Vitals(spo2_percent=88.0)
        alarms = self.normaliser.get_alarm_flags(vitals)
        assert any("spo2" in alarm.lower() for alarm in alarms), (
            f"Low SpO2 should trigger alarm. Got: {alarms}"
        )

    def test_critical_high_heart_rate_triggers_alarm(self) -> None:
        vitals = Vitals(heart_rate_bpm=160)
        alarms = self.normaliser.get_alarm_flags(vitals)
        assert any("heart_rate" in alarm.lower() for alarm in alarms)

    def test_critical_low_bp_triggers_alarm(self) -> None:
        vitals = Vitals(systolic_bp_mmhg=65)
        alarms = self.normaliser.get_alarm_flags(vitals)
        assert any("systolic" in alarm.lower() for alarm in alarms)

    def test_normal_vitals_no_alarms(self) -> None:
        vitals = Vitals(
            heart_rate_bpm=75,
            spo2_percent=98.0,
            systolic_bp_mmhg=122,
            diastolic_bp_mmhg=80,
        )
        alarms = self.normaliser.get_alarm_flags(vitals)
        assert alarms == []

    def test_nested_payload_extraction(self) -> None:
        payload = {
            "deviceId": "BW-001",
            "vitals": {"hr": 80, "spO2": 97.0},
        }
        vitals = self.normaliser.normalise(payload)
        assert vitals.heart_rate_bpm == 80

    def test_string_values_are_converted(self) -> None:
        payload = {"heart_rate_bpm": "72", "spo2_percent": "97.5"}
        vitals = self.normaliser.normalise(payload)
        assert vitals.heart_rate_bpm == 72
        assert vitals.spo2_percent == 97.5

    def test_invalid_string_value_is_none(self) -> None:
        payload = {"heart_rate_bpm": "not_a_number"}
        vitals = self.normaliser.normalise(payload)
        assert vitals.heart_rate_bpm is None
