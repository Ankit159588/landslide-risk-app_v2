from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    # Location, for logging/response context — not used to derive features.
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

    # The 11 model features. Your backend fetches/computes these from
    # real-world sources (DEM, satellite indices, seismic/lithology data,
    # etc.) and sends the actual values here.
    aspect: float = Field(..., description="Aspect, degrees (0-360)")
    earthquake: float = Field(..., description="Earthquake intensity")
    elevation: float = Field(..., description="Elevation, meters")
    flow: float = Field(..., description="Flow accumulation")
    lithology: float = Field(..., description="Lithology class code")
    ndvi: float = Field(..., description="NDVI vegetation index")
    ndwi: float = Field(..., description="NDWI water index")
    plan: float = Field(..., description="Plan curvature")
    precipitation: float = Field(..., description="Precipitation, mm")
    profile: float = Field(..., description="Profile curvature")
    slope: float = Field(..., description="Slope, degrees")

    def to_feature_dict(self) -> dict:
        """Map to the model's canonical (capitalized) feature names."""
        return {
            "Aspect": self.aspect,
            "Earthquake": self.earthquake,
            "Elevation": self.elevation,
            "Flow": self.flow,
            "Lithology": self.lithology,
            "NDVI": self.ndvi,
            "NDWI": self.ndwi,
            "Plan": self.plan,
            "Precipitation": self.precipitation,
            "Profile": self.profile,
            "Slope": self.slope,
        }


class PredictResponse(BaseModel):
    latitude: float
    longitude: float
    probability: float
    risk_percent: float
    threshold: float
    is_high_risk: bool
    status: str
    features_used: dict


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
