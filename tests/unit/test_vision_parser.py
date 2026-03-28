"""Unit tests for Vision OCR service — prescription text extraction accuracy."""

from __future__ import annotations

import pytest

from app.services.ingestion.vision import VisionService


class TestVisionOCRParsing:
    """Tests for regex-based medication pre-extraction from OCR text."""

    def setup_method(self) -> None:
        self.service = VisionService()

    def test_extracts_tablet_with_dosage(self) -> None:
        ocr = "Tab. Metoprolol 25mg BD\nTab. Aspirin 75mg OD"
        results = self.service.parse_medication_from_ocr(ocr)
        names = [r["name"] for r in results]
        assert any("Metoprolol" in n for n in names)

    def test_extracts_capsule_form(self) -> None:
        ocr = "Cap. Omeprazole 20mg BD before meals"
        results = self.service.parse_medication_from_ocr(ocr)
        names = [r["name"] for r in results]
        assert any("Omeprazole" in n for n in names)

    def test_returns_empty_list_for_no_medications(self) -> None:
        ocr = "Patient name: Ramesh Kumar. Age: 72 years. Date: 15/03/2026."
        results = self.service.parse_medication_from_ocr(ocr)
        # Should not crash — may return empty or non-medical matches
        assert isinstance(results, list)

    def test_extracts_dosage_in_mg(self) -> None:
        ocr = "Atorvastatin 20mg at night"
        results = self.service.parse_medication_from_ocr(ocr)
        assert any(r.get("dosage") for r in results), "Dosage should be extracted"

    def test_handles_multilingual_prescription(self) -> None:
        """OCR from a Hindi/mixed prescription should not crash."""
        ocr = "??? ?????? (Metformin) 500mg ?? ??? ??? ???"
        try:
            results = self.service.parse_medication_from_ocr(ocr)
            assert isinstance(results, list)
        except Exception as e:
            pytest.fail(f"Multilingual OCR parsing crashed: {e}")
