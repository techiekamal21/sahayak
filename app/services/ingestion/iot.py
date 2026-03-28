"""IoT vitals normaliser — processes wearable device readings.

Receives raw MQTT payloads from BLE wearables via Cloud IoT Core + Pub/Sub.
Normalises diverse sensor formats into the standard Vitals model.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from app.models.patient import Vitals

logger = logging.getLogger(__name__)

# ── Normal Ranges for Adult Patients ─────────────────────────────────────────
NORMAL_RANGES = {
    "heart_rate_bpm": (60, 100),
    "systolic_bp_mmhg": (90, 140),
    "diastolic_bp_mmhg": (60, 90),
    "spo2_percent": (95.0, 100.0),
    "temperature_celsius": (36.1, 37.2),
    "respiratory_rate_per_min": (12, 20),
    "glucose_mmol_l": (3.9, 7.8),
}

# Alarm thresholds — immediate risk flags
CRITICAL_THRESHOLDS = {
    "heart_rate_bpm": (40, 150),        # Below 40 or above 150
    "systolic_bp_mmhg": (70, 180),      # Severe hypotension or hypertensive emergency
    "spo2_percent": (90.0, 100.0),      # SpO2 < 90% is critical
    "temperature_celsius": (35.0, 39.5),  # Hypothermia or high fever
    "respiratory_rate_per_min": (8, 30),  # Respiratory distress
}


class IoTNormaliser:
    """Normalises raw IoT wearable data into standard Vitals objects.

    Different device manufacturers use different JSON field names and units.
    This normaliser handles the most common formats encountered in Indian
    consumer-grade wearables.
    """

    # Common field name aliases from various wearable manufacturers
    FIELD_ALIASES: dict[str, list[str]] = {
        "heart_rate_bpm": ["hr", "heart_rate", "bpm", "pulse", "heartRate"],
        "systolic_bp_mmhg": ["systolic", "sbp", "sys", "bp_sys"],
        "diastolic_bp_mmhg": ["diastolic", "dbp", "dia", "bp_dia"],
        "spo2_percent": ["spo2", "spO2", "oxygen_saturation", "o2sat", "bloodOxygen"],
        "temperature_celsius": ["temp", "temperature", "body_temp", "bodyTemperature"],
        "respiratory_rate_per_min": ["rr", "resp_rate", "respiratory_rate", "breathRate"],
        "glucose_mmol_l": ["glucose", "blood_glucose", "bg_mmol", "glucoseMMOL"],
    }

    def normalise(self, raw_payload: dict) -> Vitals:
        """Convert a raw IoT payload dict into a Vitals model instance.

        Args:
            raw_payload: Raw dict from wearable device (any known format)

        Returns:
            Normalised Vitals model
        """
        vitals_dict: dict = {"source": "iot_wearable"}

        for canonical_name, aliases in self.FIELD_ALIASES.items():
            value = self._extract_value(raw_payload, [canonical_name] + aliases)
            if value is not None:
                vitals_dict[canonical_name] = self._to_float_or_int(value, canonical_name)

        vitals = Vitals(**vitals_dict)

        alarms = self.get_alarm_flags(vitals)
        if alarms:
            logger.warning("IoT vitals alarms triggered: %s", alarms)

        return vitals

    def get_alarm_flags(self, vitals: Vitals) -> list[str]:
        """Return list of alarm messages for critical values.

        An alarm means this vital is outside safe limits and may indicate
        an emergency even before Gemini analysis.
        """
        alarms: list[str] = []
        vitals_dict = vitals.model_dump()

        for field, (low, high) in CRITICAL_THRESHOLDS.items():
            value = vitals_dict.get(field)
            if value is None:
                continue
            if value < low:
                alarms.append(
                    f"{field} is critically LOW ({value} < {low})"
                )
            elif value > high:
                alarms.append(
                    f"{field} is critically HIGH ({value} > {high})"
                )

        return alarms

    @staticmethod
    def _extract_value(payload: dict, aliases: list[str]) -> Optional[object]:
        """Try each alias in order and return the first found value."""
        for alias in aliases:
            if alias in payload:
                return payload[alias]
            # Check nested keys (some devices nest in e.g. "vitals": {...})
            for nested_dict in payload.values():
                if isinstance(nested_dict, dict) and alias in nested_dict:
                    return nested_dict[alias]
        return None

    @staticmethod
    def _to_float_or_int(value: object, field_name: str) -> Optional[float | int]:
        """Convert value to appropriate numeric type."""
        try:
            fval = float(str(value))
            # Integer fields
            if field_name in ("heart_rate_bpm", "systolic_bp_mmhg",
                              "diastolic_bp_mmhg", "respiratory_rate_per_min"):
                return int(round(fval))
            return round(fval, 1)
        except (ValueError, TypeError):
            logger.warning("Cannot convert IoT value '%s' for field '%s'", value, field_name)
            return None
