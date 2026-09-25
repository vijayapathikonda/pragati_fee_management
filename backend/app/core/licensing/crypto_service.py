import os
import json
import base64
from typing import Tuple, Dict, Any, Optional
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization

KEY_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_KEY_PATH = os.path.join(KEY_DIR, "public_key.pem")

class CryptoService:
    _public_key: Optional[ed25519.Ed25519PublicKey] = None

    @classmethod
    def get_public_key(cls) -> ed25519.Ed25519PublicKey:
        if cls._public_key is None:
            if not os.path.exists(PUBLIC_KEY_PATH):
                raise FileNotFoundError(f"Licensing public key missing at: {PUBLIC_KEY_PATH}")
            with open(PUBLIC_KEY_PATH, "rb") as f:
                cls._public_key = serialization.load_pem_public_key(f.read())
        return cls._public_key

    @classmethod
    def verify_license_document(cls, license_data: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """
        Verifies an Ed25519 signed license document.
        Returns: (is_valid, error_message, payload)
        """
        try:
            if not isinstance(license_data, dict):
                return False, "Invalid license format: document must be a JSON object", None

            payload = license_data.get("payload")
            signature_b64 = license_data.get("signature")

            if not payload or not isinstance(payload, dict):
                return False, "License document missing valid payload object", None

            if not signature_b64 or not isinstance(signature_b64, str):
                return False, "License document missing signature", None

            # Recreate canonical JSON byte sequence used for signing
            canonical_json = json.dumps(payload, sort_keys=True, separators=(',', ':')).encode('utf-8')
            signature = base64.b64decode(signature_b64)

            public_key = cls.get_public_key()
            public_key.verify(signature, canonical_json)
            return True, None, payload

        except Exception as e:
            return False, f"Cryptographic verification failed: {str(e)}", None
