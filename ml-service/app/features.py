"""
Feature order for the landslide model.

The model was trained on these 11 columns, in this exact order — order
matters because the model is fed a plain numpy array (no column names), so
getting the order wrong silently produces garbage predictions.

Feature values themselves are NOT derived here. The caller (your Node.js
backend) is responsible for fetching/computing real values (elevation,
slope, NDVI, etc. from real-world APIs/GIS sources) and sending them in the
request — this service just validates and runs the model.
"""

import numpy as np

FEATURE_ORDER = [
    "Aspect",
    "Earthquake",
    "Elevation",
    "Flow",
    "Lithology",
    "NDVI",
    "NDWI",
    "Plan",
    "Precipitation",
    "Profile",
    "Slope",
]


def features_to_array(features: dict):
    """Order a feature dict into the exact array shape the model expects."""
    return np.array([[features[name] for name in FEATURE_ORDER]])
