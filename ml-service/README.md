# Landslide Risk Prediction — FastAPI service

Fixed, standalone version of the model from `land_slide_project.ipynb`, served as a REST API. No Gradio/Streamlit UI — your Node.js backend fetches the real-world feature values and this service just runs the model on them.

## What was actually broken in the notebook

1. **The saved model wasn't the one being evaluated.** In the "save model" cell, a fresh `ensemble` was trained, but the printed classification report / ROC-AUC came from an old `ensemble_model` variable left over from an earlier cell — the metrics you saw described a different model than the one saved to disk. Fixed in `train_model.py`, which evaluates the exact object it saves.
2. **Two models, two feature sets.** One cell trained on every column in the CSV; a later cell retrained a "clean" model on just 11 columns. Whichever `.pkl` got loaded determined whether predictions used 11 features or the full set, with no guardrail. Fixed by training on the 11-feature set consistently, and bundling `feature_order` into the saved artifact so serving code can't silently drift out of sync with what the model expects.
3. **No error handling for a missing/wrong model file** — the notebook versions just crashed. The API now returns a clean `503` with a clear message instead.

## Project layout

```
ml-service/
  app/
    main.py     # FastAPI app: /health and /predict routes
    model.py     # loads the .pkl artifact, validates it, runs predict()
    features.py   # canonical 11-feature order + array conversion
    schemas.py     # request/response validation
  train_model.py    # retrain and save the model artifact
  requirements.txt
```

## Setup

```bash
cd ml-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

## Train the model

You need the Kaggle CSV (`new1SupervisedDataSet.csv`) locally — it isn't in the repo.

```bash
python train_model.py path/to/new1SupervisedDataSet.csv
```

This writes `landslide_ensemble_model.pkl` into `ml-service/` — a dict of `{model, feature_order, threshold}`, not a bare sklearn object, so `model.py` can validate it before trusting it.

## Run the API

```bash
export ALLOWED_ORIGINS="http://localhost:5000"   # your Node backend's origin
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## API contract

### `GET /health`
```json
{ "status": "ok", "model_loaded": true }
```

### `POST /predict`

Your Node backend sends the coordinates plus all 11 already-fetched feature values:

```json
{
  "latitude": 30.3165,
  "longitude": 78.0322,
  "aspect": 93.26,
  "earthquake": 0.0,
  "elevation": 1654.75,
  "flow": 266.66,
  "lithology": 1.0,
  "ndvi": 0.72,
  "ndwi": -0.21,
  "plan": 0.01,
  "precipitation": 348.57,
  "profile": -0.02,
  "slope": 5.0
}
```

**Response `200`:**
```json
{
  "latitude": 30.3165,
  "longitude": 78.0322,
  "probability": 0.42,
  "risk_percent": 42.0,
  "threshold": 0.11,
  "is_high_risk": true,
  "status": "HIGH_RISK",
  "features_used": {
    "Aspect": 93.26, "Earthquake": 0.0, "Elevation": 1654.75,
    "Flow": 266.66, "Lithology": 1.0, "NDVI": 0.72, "NDWI": -0.21,
    "Plan": 0.01, "Precipitation": 348.57, "Profile": -0.02, "Slope": 5.0
  }
}
```

**Errors:**
- `422` — a required field is missing, or `latitude`/`longitude` is out of range
- `503` — model file not found/loaded on the server
- `500` — prediction failed unexpectedly

Example call from Node (axios):
```js
const { data } = await axios.post("http://localhost:8000/predict", {
  latitude, longitude,
  aspect, earthquake, elevation, flow, lithology,
  ndvi, ndwi, plan, precipitation, profile, slope,
});
```

`latitude`/`longitude` are accepted and echoed back for logging/context but aren't used in the prediction itself — only the 11 named features feed the model, in the exact order defined in `app/features.py`. If your feature names differ from these (e.g. you call it `rainfall` instead of `precipitation`), just adjust the field names in `app/schemas.py`.
