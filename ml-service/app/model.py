"""
Loads the trained ensemble model and exposes a single predict() function.

Expects an artifact produced by train_model.py: a dict with keys
{"model", "feature_order", "threshold"} saved via joblib, NOT the bare
sklearn estimator. Bundling the feature order and threshold together with
the model avoids the classic bug of code drifting out of sync with what the
model was actually trained on.
"""

import os
import joblib

from .features import FEATURE_ORDER, features_to_array

MODEL_PATH = os.getenv("MODEL_PATH", "landslide_ensemble_model.pkl")

_artifact = None


class ModelNotLoadedError(RuntimeError):
    pass


def load_model():
    global _artifact
    if not os.path.exists(MODEL_PATH):
        raise ModelNotLoadedError(
            f"Model file not found at '{MODEL_PATH}'. Run train_model.py first, "
            f"or set the MODEL_PATH environment variable."
        )
    artifact = joblib.load(MODEL_PATH)

    if not isinstance(artifact, dict) or "model" not in artifact:
        raise ModelNotLoadedError(
            "Model file is not a valid artifact produced by train_model.py "
            "(expected a dict with 'model', 'feature_order', 'threshold')."
        )

    if artifact.get("feature_order") != FEATURE_ORDER:
        raise ModelNotLoadedError(
            "Model was trained with a different feature order than the "
            "server expects. Retrain with the current train_model.py."
        )

    _artifact = artifact
    return _artifact


def is_loaded() -> bool:
    return _artifact is not None


def predict(features: dict) -> dict:
    if _artifact is None:
        raise ModelNotLoadedError("Model is not loaded yet.")

    model = _artifact["model"]
    threshold = _artifact["threshold"]

    x = features_to_array(features)
    probability = float(model.predict_proba(x)[0][1])
    is_high_risk = probability >= threshold

    return {
        "probability": probability,
        "risk_percent": round(probability * 100, 2),
        "threshold": threshold,
        "is_high_risk": is_high_risk,
        "status": "HIGH_RISK" if is_high_risk else "SAFE",
    }
