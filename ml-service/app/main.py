import logging
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import model
from .schemas import HealthResponse, PredictRequest, PredictResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("landslide-api")

app = FastAPI(
    title="Landslide Risk Prediction API",
    description=(
        "Given the 11 terrain/environmental features (already fetched by "
        "the caller from real-world sources), returns the model's "
        "landslide risk prediction. Intended to be called from a Node.js "
        "backend, not directly from the browser."
    ),
    version="1.0.0",
)

# Only the Node.js backend should call this service directly. Restrict CORS
# to that origin (comma-separated list supported) rather than "*".
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    try:
        model.load_model()
        logger.info("Model loaded successfully from %s", model.MODEL_PATH)
    except model.ModelNotLoadedError as e:
        # Don't crash the server on startup — /health will report it, and
        # /predict will return a clear 503 instead of a stack trace.
        logger.warning("Model not loaded: %s", e)


@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok", model_loaded=model.is_loaded())


@app.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest):
    if not model.is_loaded():
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded on the server. Train and place "
            "landslide_ensemble_model.pkl, then restart the service.",
        )

    features = payload.to_feature_dict()

    try:
        result = model.predict(features)
    except Exception as e:
        logger.exception("Prediction failed")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")

    return PredictResponse(
        latitude=payload.latitude,
        longitude=payload.longitude,
        features_used=features,
        **result,
    )
