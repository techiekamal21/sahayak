"""Cloud Vision API service — prescription and document OCR.

Processes blurry, low-light photos of:
- Prescription slips
- Medication bottles
- Discharge summaries
- Medical reports

Uses DOCUMENT_TEXT_DETECTION for maximum accuracy on text-heavy images.
"""

from __future__ import annotations

import base64
import logging
from typing import Optional

from google.cloud import vision
from google.cloud.vision import AnnotateImageResponse

logger = logging.getLogger(__name__)


class VisionService:
    """Extracts text from medical document photos using Cloud Vision API.

    Optimised for handwritten and printed medical text including:
    - Drug names (generic and brand)
    - Dosages (e.g., '5mg', '10 ml')
    - Frequency instructions (e.g., 'BD', 'TDS', 'once daily')
    - Diagnosis codes and descriptions
    """

    def __init__(self) -> None:
        self._client = vision.ImageAnnotatorAsyncClient()

    async def extract_text_from_image(
        self,
        image_bytes: Optional[bytes] = None,
        image_base64: Optional[str] = None,
        image_uri: Optional[str] = None,
    ) -> str:
        """Extract all text from a medical document image.

        Accepts image as bytes, base64 string, or GCS URI.

        Args:
            image_bytes: Raw image bytes
            image_base64: Base64-encoded image string
            image_uri: Google Cloud Storage URI (gs://bucket/object)

        Returns:
            Extracted text string. May be multi-line.
        """
        if image_base64:
            image_bytes = base64.b64decode(image_base64)

        if image_bytes:
            image = vision.Image(content=image_bytes)
        elif image_uri:
            image = vision.Image(source=vision.ImageSource(image_uri=image_uri))
        else:
            raise ValueError("Must provide image_bytes, image_base64, or image_uri")

        # DOCUMENT_TEXT_DETECTION is superior to TEXT_DETECTION for structured docs
        response: AnnotateImageResponse = await self._client.document_text_detection(
            image=image,
            image_context=vision.ImageContext(
                language_hints=["en", "hi", "ta", "te", "kn", "ml", "mr"],
            ),
        )

        if response.error.message:
            logger.error("Vision API error: %s", response.error.message)
            raise RuntimeError(f"Vision API failed: {response.error.message}")

        if not response.full_text_annotation:
            logger.warning("Vision API returned no text from image")
            return ""

        extracted_text = response.full_text_annotation.text
        logger.info("Vision OCR complete — extracted %d characters", len(extracted_text))

        return extracted_text

    def parse_medication_from_ocr(self, ocr_text: str) -> list[dict]:
        """Basic regex pre-extraction of medication patterns from OCR text.

        This is a helper — the actual intelligent parsing is done by Gemini.
        This function serves as a quick check / test utility.
        """
        import re

        # Common prescription patterns
        patterns = [
            r"Tab\.?\s+([A-Za-z]+(?:\s+\d+mg)?)",  # Tab. Metoprolol 25mg
            r"Cap\.?\s+([A-Za-z]+(?:\s+\d+mg)?)",  # Cap. Omeprazole 20mg
            r"Inj\.?\s+([A-Za-z]+(?:\s+\d+mg)?)",  # Inj. Insulin 10 units
            r"([A-Za-z]+)\s+(\d+(?:\.\d+)?)\s*(?:mg|ml|mcg|IU|units?)",  # Drug 25mg
        ]

        found: list[dict] = []
        for pattern in patterns:
            matches = re.findall(pattern, ocr_text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    name = match[0].strip()
                    dosage = " ".join(str(m) for m in match[1:]).strip()
                else:
                    name = str(match).strip()
                    dosage = ""

                if name and len(name) > 2:
                    found.append({"name": name, "dosage": dosage or None})

        return found
