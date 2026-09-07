"""
Train and save the landslide ensemble model.

Usage:
    python train_model.py path/to/new1SupervisedDataSet.csv

Fixes vs. the original notebook:
  1. The notebook trained a fresh `ensemble` model in the "save" cell, but
     then evaluated/reported metrics from a *stale* `ensemble_model`
     variable defined in an earlier cell — so the reported accuracy never
     actually corresponded to the model that got saved to disk. Fixed here
     by evaluating the exact object that gets saved.
  2. The notebook fit the model on ALL columns in one cell, then separately
     retrained a "clean" model on just 11 columns in another cell — two
     different models with two different feature sets floating around.
     This script trains on the 11-feature set once, consistently.
  3. The saved artifact now bundles the model together with its expected
     feature order and decision threshold, so the serving code can never
     silently drift out of sync with what the model was trained on.
"""

import sys

import joblib
from catboost import CatBoostClassifier
from lightgbm import LGBMClassifier
from sklearn.ensemble import VotingClassifier
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from app.features import FEATURE_ORDER

DECISION_THRESHOLD = 0.11  # chosen in the notebook to favor recall
OUTPUT_PATH = "landslide_ensemble_model.pkl"


def main(csv_path: str):
    import pandas as pd

    df = pd.read_csv(csv_path)

    missing = [c for c in FEATURE_ORDER + ["Landslide"] if c not in df.columns]
    if missing:
        raise SystemExit(f"Dataset is missing required columns: {missing}")

    X = df[FEATURE_ORDER]
    y = df["Landslide"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    m1 = XGBClassifier(n_estimators=100, learning_rate=0.1, random_state=42)
    m2 = LGBMClassifier(n_estimators=100, learning_rate=0.1, random_state=42, verbose=-1)
    m3 = CatBoostClassifier(iterations=200, learning_rate=0.1, random_state=42, verbose=0)

    ensemble = VotingClassifier(
        estimators=[("xgb", m1), ("lgb", m2), ("cat", m3)],
        voting="soft",
    )

    print("Training ensemble on features:", FEATURE_ORDER)
    ensemble.fit(X_train, y_train)

    # Evaluate the SAME object we are about to save (this is the bug fix).
    y_proba = ensemble.predict_proba(X_test)[:, 1]
    y_pred = (y_proba >= DECISION_THRESHOLD).astype(int)

    print(f"\n--- Ensemble performance (threshold={DECISION_THRESHOLD}) ---")
    print(classification_report(y_test, y_pred))
    print("ROC-AUC:", roc_auc_score(y_test, y_proba))

    artifact = {
        "model": ensemble,
        "feature_order": FEATURE_ORDER,
        "threshold": DECISION_THRESHOLD,
    }
    joblib.dump(artifact, OUTPUT_PATH)
    print(f"\n✅ Saved model artifact to '{OUTPUT_PATH}'")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python train_model.py path/to/dataset.csv")
    main(sys.argv[1])
