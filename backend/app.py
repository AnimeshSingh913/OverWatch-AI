from fastapi import FastAPI, UploadFile, File, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import time
import json
import requests
import pandas as pd
import numpy as np
from collections import defaultdict
from scipy.stats import beta as beta_dist

# -----------------------------
# ML / NLP
# -----------------------------
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier, IsolationForest
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, brier_score_loss
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

import nltk
from nltk.sentiment import SentimentIntensityAnalyzer

# Safe NLTK init (no repeated downloads)
try:
    nltk.data.find("sentiment/vader_lexicon.zip")
except LookupError:
    nltk.download("vader_lexicon")

# -----------------------------
# FastAPI App
# -----------------------------
app = FastAPI(title="OverWatch AI – Credit Decision Trust Intelligence")

# -----------------------------
# CORS – restrict to your Vercel frontend + local dev
# -----------------------------
ALLOWED_ORIGINS = [
    "http://localhost:5173",        # Vite dev server
    "http://localhost:8080",        # Vite alt port
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
]

_vercel_url = os.getenv("FRONTEND_URL")
if _vercel_url:
    ALLOWED_ORIGINS.append(_vercel_url.rstrip("/"))
else:
    ALLOWED_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# 4. SEMANTIC EMBEDDINGS (Offline Local TF-IDF Exemplar Matcher)
# -----------------------------
class LocalSemanticMatcher:
    """
    Offline semantic exemplar matcher replacing literal keyword matching with 
    sublinear TF-IDF character/word n-gram cosine similarity.
    Requires 0 external network calls at inference time.
    """
    def __init__(self):
        self.categories = {
            "compliance": [
                "kyc anti money laundering aml ofac sanctions screening failed regulatory",
                "sanction list match ofac hit regulatory compliance violation fair lending",
                "forged documentation fraudulent income synthetic identity fabricated payslip",
                "ecoa fcra disparate impact fair lending regulatory bias zip code redlining",
                "mandatory audit checklist non compliance kyc cdd adverse action form",
            ],
            "dispute": [
                "completely wrong decision model missed obvious default risk override required",
                "unacceptable error in credit scoring urgent manual review correction needed",
                "heavily biased assessment misjudged debt to income ratio collateral value",
                "clear failure in automated underwriting textbook misclassification reject",
                "critical flaw in risk model rejecting correct decision overriding system output",
            ],
            "cognitive_uncertainty": [
                "uncertain doubtful not sure about this credit recommendation hesitant",
                "hesitant to trust the model output seems suspicious unusual applicant",
                "conflicting signals unclear whether to approve or reject borderline case",
                "doubting the model do not fully trust the ai score too busy rubber stamp",
            ]
        }
        all_texts = []
        self.cat_slices = {}
        idx = 0
        for cat, phrases in self.categories.items():
            start = idx
            all_texts.extend(phrases)
            idx += len(phrases)
            self.cat_slices[cat] = (start, idx)
            
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 3), 
            sublinear_tf=True, 
            min_df=1,
            token_pattern=r"(?u)\b\w+\b"
        )
        self.exemplar_vectors = self.vectorizer.fit_transform(all_texts)

    def score_series(self, text_series):
        if text_series.empty:
            return {cat: np.zeros(0) for cat in self.categories}
        texts = [str(t) if pd.notna(t) else "" for t in text_series]
        vecs = self.vectorizer.transform(texts)
        sims = cosine_similarity(vecs, self.exemplar_vectors)
        
        result = {}
        for cat, (start, end) in self.cat_slices.items():
            cat_sims = sims[:, start:end]
            # Max cosine similarity to exemplar space
            result[cat] = np.max(cat_sims, axis=1)
        return result

_SEMANTIC_MATCHER = LocalSemanticMatcher()

# -----------------------------
# NLP & Behavioral Feature Extraction
# -----------------------------
FEATURE_COLS = [
    "sentiment",
    "negativity",
    "skepticism_flag",
    "note_length",
    "cognitive_uncertainty",
    "compliance_trigger",
    "dispute_intensity",
    "fatigue_rubberstamp",
    "ai_proposed_approval",
    "dept_underwriting",
    "dept_fraud",
    "dept_compliance",
    "skepticism_x_negativity",
]

def extract_nlp_features(df):
    sia = SentimentIntensityAnalyzer()
    notes = df["confidence_note"].fillna("").astype(str)

    # 1. Sentiment compound score: [-1, 1] & negativity: [0, 1]
    polarity = notes.apply(lambda x: sia.polarity_scores(x))
    df["sentiment"] = polarity.apply(lambda p: p["compound"])
    df["negativity"] = polarity.apply(lambda p: p["neg"])

    # 2. Semantic Exemplar Matching (Replacing literal keyword matching)
    semantic_scores = _SEMANTIC_MATCHER.score_series(notes)
    df["cognitive_uncertainty"] = semantic_scores["cognitive_uncertainty"]
    df["compliance_trigger"] = semantic_scores["compliance"]
    df["dispute_intensity"] = semantic_scores["dispute"]

    # Skepticism flag: Triggered by semantic dispute intensity (>0.15) OR high negative sentiment
    df["skepticism_flag"] = ((df["dispute_intensity"] > 0.15) | (df["sentiment"] < -0.2)).astype(int)

    # Complacency Flag: Operator noted reservations/uncertainty, but did NOT override
    if "override" not in df.columns:
        if "model_decision" in df.columns and "human_decision" in df.columns:
            df["override"] = df["model_decision"] != df["human_decision"]
        else:
            df["override"] = False
    df["is_complacent"] = (df["skepticism_flag"] == 1) & (df["override"] == False)

    # 3. Note character length (normalized) & word count
    lengths = notes.str.len()
    max_len = lengths.max()
    df["note_length"] = (lengths / max_len).fillna(0.0) if max_len > 0 else 0.0
    
    words = notes.str.split().str.len()
    max_words = words.max()
    df["word_count"] = (words / max_words).fillna(0.0) if max_words > 0 else 0.0

    # 4. Decision Fatigue / Rubber-Stamping Marker: Low note word count (<4) or low effort
    df["fatigue_rubberstamp"] = (words < 4).astype(int)

    # 5. Operational Risk Asymmetry: Did AI propose Approve vs Reject?
    if "model_decision" in df.columns:
        df["ai_proposed_approval"] = (df["model_decision"].astype(str).str.strip().str.lower() == "approve").astype(int)
    else:
        df["ai_proposed_approval"] = 0

    # 6. Departmental Risk Profiles
    dept_col = df["department"].astype(str).str.lower() if "department" in df.columns else pd.Series([""] * len(df))
    df["dept_underwriting"] = dept_col.str.contains("underwriting", na=False).astype(int)
    df["dept_fraud"] = dept_col.str.contains("fraud", na=False).astype(int)
    df["dept_compliance"] = dept_col.str.contains("compliance", na=False).astype(int)

    # 7. Interaction Term
    df["skepticism_x_negativity"] = df["skepticism_flag"] * df["negativity"]

    return df

# -----------------------------
# 2. CALIBRATION (Expected Calibration Error & Reliability Diagram)
# -----------------------------
def compute_calibration_metrics(y_true, y_prob, n_bins=5):
    """
    Computes Expected Calibration Error (ECE), Maximum Calibration Error (MCE),
    and generates binned reliability diagram data.
    """
    y_true = np.asarray(y_true)
    y_prob = np.asarray(y_prob)
    total_samples = len(y_true)
    
    if total_samples == 0:
        return {"ece": 0.0, "mce": 0.0, "n_bins": n_bins, "reliability_diagram": []}
        
    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    diagram = []
    ece = 0.0
    mce = 0.0
    
    for i in range(n_bins):
        low, high = bin_edges[i], bin_edges[i+1]
        if i == n_bins - 1:
            mask = (y_prob >= low) & (y_prob <= high)
        else:
            mask = (y_prob >= low) & (y_prob < high)
            
        bin_count = int(np.sum(mask))
        if bin_count > 0:
            avg_pred = float(np.mean(y_prob[mask]))
            obs_freq = float(np.mean(y_true[mask]))
            gap = abs(avg_pred - obs_freq)
            ece += (bin_count / total_samples) * gap
            mce = max(mce, gap)
        else:
            avg_pred = float((low + high) / 2.0)
            obs_freq = 0.0
            gap = 0.0
            
        diagram.append({
            "bin": i + 1,
            "bin_range": f"[{low:.1f}, {high:.1f}]",
            "count": bin_count,
            "avg_predicted": round(avg_pred, 4),
            "observed_frequency": round(obs_freq, 4),
            "calibration_gap": round(gap, 4),
        })
        
    return {
        "ece": round(float(ece), 4),
        "mce": round(float(mce), 4),
        "n_bins": n_bins,
        "reliability_diagram": diagram
    }

# -----------------------------
# 1. ENSEMBLE UNCERTAINTY & MODEL TRAINING
# -----------------------------
def train_trust_model(df):
    for col in FEATURE_COLS:
        if col not in df.columns:
            df[col] = 0.0

    X = df[FEATURE_COLS].fillna(0.0)
    y = df["override"].astype(int)

    if len(np.unique(y)) < 2:
        return None, None

    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=4,
        min_samples_leaf=1,
        class_weight="balanced",
        random_state=42
    )
    gb = GradientBoostingClassifier(
        n_estimators=80,
        max_depth=3,
        learning_rate=0.08,
        random_state=42
    )
    lr = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(C=1.0, class_weight="balanced", random_state=42, max_iter=1000))
    ])

    ensemble = VotingClassifier(
        estimators=[('rf', rf), ('gb', gb), ('lr', lr)],
        voting='soft'
    )

    # Out-Of-Fold Stratified Cross-Validation Evaluation
    min_class_samples = int(y.value_counts().min())
    n_splits = max(2, min(5, min_class_samples))
    
    model_metrics = {
        "accuracy": 0.0,
        "precision": 0.0,
        "recall": 0.0,
        "f1": 0.0,
        "roc_auc": 0.5,
        "brier_score": 0.0,
        "cv_folds": n_splits,
        "sample_size": len(df),
        "calibration": {}
    }

    if min_class_samples >= 2:
        skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
        oof_probs = np.zeros(len(df))
        oof_preds = np.zeros(len(df))
        
        for train_idx, val_idx in skf.split(X, y):
            X_tr, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_tr, y_val = y.iloc[train_idx], y.iloc[val_idx]
            
            fold_model = VotingClassifier(
                estimators=[
                    ('rf', RandomForestClassifier(n_estimators=50, max_depth=4, class_weight="balanced", random_state=42)),
                    ('gb', GradientBoostingClassifier(n_estimators=40, max_depth=3, learning_rate=0.08, random_state=42)),
                    ('lr', Pipeline([("scaler", StandardScaler()), ("clf", LogisticRegression(C=1.0, class_weight="balanced", random_state=42, max_iter=1000))]))
                ],
                voting='soft'
            )
            fold_model.fit(X_tr, y_tr)
            probs = fold_model.predict_proba(X_val)[:, 1]
            oof_probs[val_idx] = probs
            oof_preds[val_idx] = (probs >= 0.5).astype(int)
            
        model_metrics["accuracy"] = float(round(accuracy_score(y, oof_preds), 4))
        model_metrics["precision"] = float(round(precision_score(y, oof_preds, zero_division=0), 4))
        model_metrics["recall"] = float(round(recall_score(y, oof_preds, zero_division=0), 4))
        model_metrics["f1"] = float(round(f1_score(y, oof_preds, zero_division=0), 4))
        try:
            model_metrics["roc_auc"] = float(round(roc_auc_score(y, oof_probs), 4))
        except Exception:
            model_metrics["roc_auc"] = 0.5
        model_metrics["brier_score"] = float(round(brier_score_loss(y, oof_probs), 4))
        
        # 2. Calibration Computation
        model_metrics["calibration"] = compute_calibration_metrics(y, oof_probs, n_bins=5)

    pipeline = Pipeline([("model", ensemble)])
    pipeline.fit(X, y)

    # 7. MLflow-Compatible Experiment Tracking
    try:
        from backend.experiment_tracker import EXPERIMENT_TRACKER
        tracker_metrics = {
            "accuracy": model_metrics["accuracy"],
            "precision": model_metrics["precision"],
            "recall": model_metrics["recall"],
            "f1": model_metrics["f1"],
            "roc_auc": model_metrics["roc_auc"],
            "brier_score": model_metrics["brier_score"],
            "ece": model_metrics.get("calibration", {}).get("ece", 0.0),
            "mce": model_metrics.get("calibration", {}).get("mce", 0.0),
        }
        tracker_params = {
            "sample_size": len(df),
            "n_features": len(FEATURE_COLS),
            "model_type": "VotingClassifier(RF+GB+LR)",
            "cv_folds": n_splits,
        }
        run_record = EXPERIMENT_TRACKER.log_run(
            run_name="override_risk_ensemble",
            metrics=tracker_metrics,
            params=tracker_params,
            tags={"environment": "offline", "dataset_size": str(len(df))}
        )
        model_metrics["experiment_run_id"] = run_record["run_id"]
    except Exception:
        pass

    return pipeline, model_metrics


def predict_with_ensemble_uncertainty(pipeline, X):
    """
    Computes ensemble mean predicted override probability and epistemic variance
    across sub-estimators (RF, GB, LR).
    """
    ensemble = pipeline.named_steps["model"]
    p_rf = ensemble.named_estimators_['rf'].predict_proba(X)[:, 1]
    p_gb = ensemble.named_estimators_['gb'].predict_proba(X)[:, 1]
    p_lr = ensemble.named_estimators_['lr'].predict_proba(X)[:, 1]
    
    # Sub-estimator matrix (N, 3)
    preds = np.column_stack([p_rf, p_gb, p_lr])
    mean_probs = np.mean(preds, axis=1)
    variance = np.var(preds, axis=1)
    std_dev = np.std(preds, axis=1)
    
    return mean_probs, variance, std_dev


def compute_confidence_routing(probs, std_devs, max_auto_uncertainty=0.08, high_uncertainty_threshold=0.18, high_risk_cutoff=0.40):
    """
    Confidence-Based Decision Routing based on epistemic ensemble uncertainty.
    Rules:
    - AUTO_APPROVE: Model is confident (low uncertainty <= max_auto_uncertainty) AND
      predicted risk is low (< high_risk_cutoff).
      Safety constraint: High-risk predictions (risk >= high_risk_cutoff) are NEVER auto-approved.
    - SENIOR_REVIEW: Disagreement/high epistemic uncertainty across ensemble (std_dev >= high_uncertainty_threshold)
      OR high override risk.
    - STANDARD_REVIEW: Cases in between requiring standard tier-1 analyst verification.
    """
    probs = np.asarray(probs, dtype=float)
    std_devs = np.asarray(std_devs, dtype=float)
    N = len(probs)
    
    decisions = []
    auto_count = 0
    standard_count = 0
    senior_count = 0

    for i in range(N):
        p = probs[i]
        u = std_devs[i]

        # Strict safety guard: High-risk decisions CANNOT be auto-approved
        if u <= max_auto_uncertainty and p < high_risk_cutoff:
            route = "AUTO_APPROVE"
            auto_count += 1
        elif u >= high_uncertainty_threshold or p >= 0.70:
            route = "SENIOR_REVIEW"
            senior_count += 1
        else:
            route = "STANDARD_REVIEW"
            standard_count += 1

        decisions.append({
            "route": route,
            "predicted_risk": round(float(p), 4),
            "ensemble_uncertainty": round(float(u), 4)
        })

    routing_summary = {
        "auto_approve_pct": round(auto_count / N * 100.0, 2) if N > 0 else 0.0,
        "standard_review_pct": round(standard_count / N * 100.0, 2) if N > 0 else 0.0,
        "senior_review_pct": round(senior_count / N * 100.0, 2) if N > 0 else 0.0,
        "counts": {
            "auto_approve": auto_count,
            "standard_review": standard_count,
            "senior_review": senior_count,
            "total": N
        },
        "thresholds": {
            "max_auto_uncertainty": max_auto_uncertainty,
            "high_uncertainty_threshold": high_uncertainty_threshold,
            "high_risk_cutoff": high_risk_cutoff
        }
    }
    return decisions, routing_summary


def explain_model(pipeline):
    if pipeline is None:
        empty = {
            "sentiment_weight": 0.0,
            "negativity_weight": 0.0,
            "skepticism_weight": 0.0,
            "note_length_weight": 0.0,
            "cognitive_uncertainty_weight": 0.0,
            "compliance_trigger_weight": 0.0,
            "dispute_intensity_weight": 0.0,
            "fatigue_rubberstamp_weight": 0.0,
            "department_context_weight": 0.0,
        }
        return empty, {}
    
    ensemble = pipeline.named_steps["model"]
    rf_imp = ensemble.named_estimators_['rf'].feature_importances_
    gb_imp = ensemble.named_estimators_['gb'].feature_importances_
    lr_coef = np.abs(ensemble.named_estimators_['lr'].named_steps['clf'].coef_[0])
    lr_imp = lr_coef / (lr_coef.sum() + 1e-9)
    
    importances = (rf_imp + gb_imp + lr_imp) / 3.0
    importances = importances / (importances.sum() + 1e-9)

    weight_dict = {col: float(importances[i]) for i, col in enumerate(FEATURE_COLS)}
    
    summary_weights = {
        "sentiment_weight": float(weight_dict.get("sentiment", 0.0)),
        "negativity_weight": float(weight_dict.get("negativity", 0.0)),
        "skepticism_weight": float(weight_dict.get("skepticism_flag", 0.0)),
        "note_length_weight": float(weight_dict.get("note_length", 0.0)),
        "cognitive_uncertainty_weight": float(weight_dict.get("cognitive_uncertainty", 0.0)),
        "compliance_trigger_weight": float(weight_dict.get("compliance_trigger", 0.0)),
        "dispute_intensity_weight": float(weight_dict.get("dispute_intensity", 0.0)),
        "fatigue_rubberstamp_weight": float(weight_dict.get("fatigue_rubberstamp", 0.0)),
        "department_context_weight": float(
            weight_dict.get("dept_underwriting", 0.0) +
            weight_dict.get("dept_fraud", 0.0) +
            weight_dict.get("dept_compliance", 0.0)
        ),
    }
    return summary_weights, weight_dict


def compute_shap_explanations(pipeline, X, top_k=3):
    """
    Computes local feature attribution / SHAP values for the ensemble.
    Attempts shap.TreeExplainer on tree components (RF + GB) and LinearExplainer on LR.
    If shap is unavailable or fails, uses an exact additive local linear-approximation
    attribution baseline (difference from mean baseline scaled by model weights) which works 100% offline.
    Returns a list of dicts for each row:
    [
      {
         "base_value": float,
         "predicted_risk": float,
         "top_features": [
             {"feature": str, "attribution": float, "value": float},
             ...
         ],
         "all_attributions": {feature_name: attribution_val}
      },
      ...
    ]
    """
    if pipeline is None or len(X) == 0:
        return []

    feature_names = list(X.columns)
    X_vals = np.asarray(X.fillna(0.0), dtype=float)
    N, D = X_vals.shape
    ensemble = pipeline.named_steps["model"]

    # Try SHAP library if installed
    shap_success = False
    all_shap_values = np.zeros((N, D), dtype=float)
    base_values = np.zeros(N, dtype=float)

    try:
        import shap
        rf = ensemble.named_estimators_['rf']
        gb = ensemble.named_estimators_['gb']

        # TreeExplainer for RF and GB
        rf_explainer = shap.TreeExplainer(rf)
        gb_explainer = shap.TreeExplainer(gb)

        rf_vals = rf_explainer.shap_values(X_vals)
        gb_vals = gb_explainer.shap_values(X_vals)

        # Handle binary classification 2D or 3D output
        if isinstance(rf_vals, list) and len(rf_vals) == 2:
            rf_shap = rf_vals[1]
        elif isinstance(rf_vals, np.ndarray) and rf_vals.ndim == 3:
            rf_shap = rf_vals[:, :, 1]
        else:
            rf_shap = rf_vals

        if isinstance(gb_vals, list) and len(gb_vals) == 2:
            gb_shap = gb_vals[1]
        elif isinstance(gb_vals, np.ndarray) and gb_vals.ndim == 3:
            gb_shap = gb_vals[:, :, 1]
        else:
            gb_shap = gb_vals

        # For LR: weight * (x - mean_x)
        lr = ensemble.named_estimators_['lr']
        scaler = lr.named_steps['scaler']
        clf = lr.named_steps['clf']
        scaled_X = scaler.transform(X_vals)
        lr_coef = clf.coef_[0]
        # Linear attribution in log-odds / probability space
        lr_shap = scaled_X * lr_coef

        # Ensemble average attribution
        all_shap_values = (rf_shap + gb_shap + lr_shap) / 3.0
        shap_success = True
    except Exception:
        shap_success = False

    # Fallback to model-consistent local attribution
    if not shap_success:
        rf_imp = ensemble.named_estimators_['rf'].feature_importances_
        gb_imp = ensemble.named_estimators_['gb'].feature_importances_
        lr_clf = ensemble.named_estimators_['lr'].named_steps['clf']
        lr_coef = np.abs(lr_clf.coef_[0])
        lr_imp = lr_coef / (lr_coef.sum() + 1e-9)

        w = (rf_imp + gb_imp + lr_imp) / 3.0
        w = w / (w.sum() + 1e-9)

        # Centered features deviation * feature weight
        mean_X = np.mean(X_vals, axis=0)
        std_X = np.std(X_vals, axis=0) + 1e-6
        z_scores = (X_vals - mean_X) / std_X
        all_shap_values = z_scores * w

    results = []
    for i in range(N):
        row_vals = X_vals[i]
        row_shap = all_shap_values[i]

        attributions = {feature_names[j]: float(round(row_shap[j], 4)) for j in range(D)}

        # Sort by absolute impact
        sorted_indices = np.argsort(np.abs(row_shap))[::-1][:top_k]
        top_features = [
            {
                "feature": feature_names[idx],
                "attribution": float(round(row_shap[idx], 4)),
                "value": float(round(row_vals[idx], 4))
            }
            for idx in sorted_indices
        ]

        results.append({
            "sample_index": i,
            "top_features": top_features,
            "all_attributions": attributions
        })

    return results

# -----------------------------
# 3. FAIRNESS & DISPARATE IMPACT AUDITING
# -----------------------------
def compute_fairness_metrics(df):
    """
    Evaluates Demographic Parity Difference (DPD) and Disparate Impact Ratio (DIR)
    across department subgroups.
    """
    if "department" not in df.columns:
        return {
            "demographic_parity_difference": 0.0,
            "disparate_impact_ratio": 1.0,
            "four_fifths_rule_violated": False,
            "department_breakdown": {},
            "sample_size_note": "Department column not present."
        }
        
    dept_stats = {}
    for dept, group in df.groupby("department"):
        n = len(group)
        actual_rate = float(group["override"].mean()) if "override" in group else 0.0
        pred_rate = float((group["override_risk"] >= 0.5).mean()) if "override_risk" in group else actual_rate
        mean_risk = float(group["override_risk"].mean()) if "override_risk" in group else actual_rate
            
        dept_stats[str(dept)] = {
            "sample_count": n,
            "actual_override_rate": round(actual_rate, 4),
            "predicted_selection_rate": round(pred_rate, 4),
            "mean_predicted_risk": round(mean_risk, 4),
        }
        
    pred_rates = [v["predicted_selection_rate"] for v in dept_stats.values()]
    max_rate = max(pred_rates) if pred_rates else 0.0
    min_rate = min(pred_rates) if pred_rates else 0.0
    
    dpd = round(max_rate - min_rate, 4)
    dir_ratio = round(min_rate / max_rate, 4) if max_rate > 0 else 1.0
    
    sample_sizes = [v["sample_count"] for v in dept_stats.values()]
    is_small_sample = any(s < 30 for s in sample_sizes)
    note = (
        f"Statistical caveat: Group sample sizes {sample_sizes} are below standard statistical power thresholds (n < 30). "
        "DIR should be considered indicative rather than legally definitive."
        if is_small_sample else "Sample size adequate for enterprise disparate impact auditing."
    )
    
    return {
        "demographic_parity_difference": dpd,
        "disparate_impact_ratio": dir_ratio,
        "four_fifths_rule_violated": bool(dir_ratio < 0.8),
        "department_breakdown": dept_stats,
        "sample_size_note": note
    }

# -----------------------------
# 5. CUSUM (Cumulative Sum) DRIFT DETECTION
# -----------------------------
def compute_cusum_drift(metrics, slack_k=0.05, threshold_h=0.15):
    """
    CUSUM control-chart implementation to detect statistically significant 
    temporal trust degradation points rather than simple standard deviation.
    """
    if len(metrics) < 2:
        return {
            "drift_detected": False,
            "baseline_mean": 0.0,
            "threshold_h": threshold_h,
            "slack_k": slack_k,
            "drift_weeks": [],
            "cusum_series": []
        }
        
    rates = metrics["override_rate"].values
    mu_0 = float(np.mean(rates))
    sigma_0 = float(np.std(rates))
    
    k = max(slack_k, 0.5 * sigma_0) if sigma_0 > 0 else slack_k
    h = max(threshold_h, 2.5 * sigma_0) if sigma_0 > 0 else threshold_h
    
    s_pos = 0.0
    s_neg = 0.0
    cusum_series = []
    drift_weeks = []
    
    for _, row in metrics.iterrows():
        y_t = float(row["override_rate"])
        week = str(row["week"])
        s_pos = max(0.0, s_pos + (y_t - mu_0 - k))
        s_neg = max(0.0, s_neg - (y_t - mu_0 + k))
        breached = bool(s_pos > h)
        if breached:
            drift_weeks.append(week)
            
        cusum_series.append({
            "week": week,
            "override_rate": round(y_t, 4),
            "cusum_pos": round(s_pos, 4),
            "cusum_neg": round(s_neg, 4),
            "drift_breached": breached
        })
        
    return {
        "drift_detected": len(drift_weeks) > 0,
        "baseline_mean": round(mu_0, 4),
        "threshold_h": round(h, 4),
        "slack_k": round(k, 4),
        "drift_weeks": drift_weeks,
        "cusum_series": cusum_series
    }

# -----------------------------
# 5b. FEATURE-LEVEL DRIFT (Population Stability Index - PSI)
# -----------------------------
def compute_psi_single_feature(expected_arr, actual_arr, n_bins=10, epsilon=1e-4):
    """
    Computes Population Stability Index (PSI) between baseline (expected) and current (actual) distributions.
    Rule of thumb:
      - PSI < 0.1: No significant change / stable
      - 0.1 <= PSI <= 0.2: Moderate change / monitor
      - PSI > 0.2: Significant drift / trigger retraining & alert
    """
    expected = np.asarray(expected_arr, dtype=float)
    actual = np.asarray(actual_arr, dtype=float)

    if len(expected) == 0 or len(actual) == 0:
        return 0.0

    # Determine quantile bins from expected distribution
    percentiles = np.linspace(0, 100, n_bins + 1)
    bin_edges = np.percentile(expected, percentiles)
    bin_edges = np.unique(bin_edges)

    # Fallback to linear bins if unique quantile values are insufficient
    if len(bin_edges) < 3:
        min_val = min(np.min(expected), np.min(actual))
        max_val = max(np.max(expected), np.max(actual))
        if min_val == max_val:
            return 0.0
        bin_edges = np.linspace(min_val, max_val, n_bins + 1)

    exp_counts, _ = np.histogram(expected, bins=bin_edges)
    act_counts, _ = np.histogram(actual, bins=bin_edges)

    # Convert to fractions with smoothing
    exp_pct = (exp_counts / len(expected)) + epsilon
    act_pct = (act_counts / len(actual)) + epsilon

    # Re-normalize
    exp_pct = exp_pct / np.sum(exp_pct)
    act_pct = act_pct / np.sum(act_pct)

    psi_val = np.sum((act_pct - exp_pct) * np.log(act_pct / exp_pct))
    return float(round(max(0.0, psi_val), 4))


def compute_feature_level_drift(df, feature_cols=FEATURE_COLS, split_ratio=0.5, psi_threshold=0.2):
    """
    Calculates PSI for each feature by comparing baseline (earlier half of time/data)
    with current (recent half). Returns list of drifted features, per-feature PSI, and overall drift status.
    """
    if len(df) < 10:
        return {
            "drift_detected": False,
            "drifted_features": [],
            "max_psi": 0.0,
            "feature_psi": {col: 0.0 for col in feature_cols},
            "psi_threshold": psi_threshold,
            "note": "Insufficient samples for robust PSI computation (n < 10)"
        }

    # Sort chronologically if date present
    if "date" in df.columns:
        df_sorted = df.sort_values("date").reset_index(drop=True)
    else:
        df_sorted = df

    split_idx = int(len(df_sorted) * split_ratio)
    baseline_df = df_sorted.iloc[:split_idx]
    current_df = df_sorted.iloc[split_idx:]

    feature_psi = {}
    drifted_features = []

    for col in feature_cols:
        if col in df.columns:
            exp = baseline_df[col].fillna(0.0)
            act = current_df[col].fillna(0.0)
            psi = compute_psi_single_feature(exp, act)
            feature_psi[col] = psi
            if psi >= psi_threshold:
                drifted_features.append({"feature": col, "psi": psi})

    sorted_drift = sorted(drifted_features, key=lambda x: x["psi"], reverse=True)
    max_psi = max(feature_psi.values()) if feature_psi else 0.0

    return {
        "drift_detected": len(sorted_drift) > 0,
        "drifted_features": sorted_drift,
        "max_psi": round(max_psi, 4),
        "feature_psi": feature_psi,
        "psi_threshold": psi_threshold,
        "baseline_sample_size": len(baseline_df),
        "current_sample_size": len(current_df)
    }

# -----------------------------
# 6. COST-WEIGHTED RISK & EXPECTED COST REDUCTION
# -----------------------------
def compute_cost_weighted_risk(df, cost_missed_override=500.0, cost_unjustified_override=50.0, cost_review=10.0):
    """
    Configurable asymmetric cost matrix evaluating expected financial risk reduction
    from the human-in-the-loop oversight model versus baseline alternatives.
    """
    if "ground_truth" not in df.columns:
        return None
        
    n_total = len(df)
    n_ai_errors = int((df["model_decision"] != df["ground_truth"]).sum())
    n_justified = int(df["justified_override"].sum())
    n_unjustified = int(df["unjustified_override"].sum())
    n_missed = int(df["missed_override"].sum())
    n_overrides = int(df["override"].sum())
    
    # Baseline 1: No human oversight (Blind AI deployment where all AI errors are missed)
    cost_no_oversight = float(n_ai_errors * cost_missed_override)
    
    # Baseline 2: Constant blanket manual override (100% human review)
    n_ai_correct = n_total - n_ai_errors
    cost_blanket_review = float(n_ai_correct * cost_unjustified_override + n_total * cost_review)
    
    # Current Human-in-the-Loop Architecture Cost
    current_cost = float(
        n_missed * cost_missed_override +
        n_unjustified * cost_unjustified_override +
        n_overrides * cost_review
    )
    
    cost_savings = float(cost_no_oversight - current_cost)
    pct_reduction = float(round((cost_savings / cost_no_oversight * 100.0), 2)) if cost_no_oversight > 0 else 0.0
    
    return {
        "cost_matrix": {
            "cost_missed_override": cost_missed_override,
            "cost_unjustified_override": cost_unjustified_override,
            "cost_review_overhead": cost_review
        },
        "cost_no_oversight_baseline": cost_no_oversight,
        "cost_blanket_review_baseline": cost_blanket_review,
        "current_governance_cost": current_cost,
        "expected_cost_savings": cost_savings,
        "expected_cost_reduction_pct": pct_reduction
    }

# -----------------------------
# 7. BAYESIAN TRUST SCORE (Beta-Bernoulli Updating)
# -----------------------------
def compute_bayesian_trust_score(df, prior_alpha=1.0, prior_beta=1.0):
    """
    Beta-Bernoulli conjugate Bayesian updating yielding a posterior trust distribution
    with a formal 95% Credible Interval.
    """
    n_total = len(df)
    # Use ground-truth-derived columns if already computed; otherwise fall back to raw override signal
    if "human_correct" in df.columns and "unjustified_override" in df.columns and "missed_override" in df.columns:
        successes = int(df["human_correct"].sum())
        failures = int(df["unjustified_override"].sum() + df["missed_override"].sum())
    else:
        successes = int((~df["override"]).sum())
        failures = int(df["override"].sum())
        
    alpha_post = prior_alpha + successes
    beta_post = prior_beta + failures
    
    posterior_mean = float(alpha_post / (alpha_post + beta_post))
    posterior_variance = float((alpha_post * beta_post) / (((alpha_post + beta_post) ** 2) * (alpha_post + beta_post + 1)))
    
    ci_lower = float(beta_dist.ppf(0.025, alpha_post, beta_post))
    ci_upper = float(beta_dist.ppf(0.975, alpha_post, beta_post))
    
    return {
        "posterior_mean": round(posterior_mean, 4),
        "ci_lower_95": round(ci_lower, 4),
        "ci_upper_95": round(ci_upper, 4),
        "credible_interval_width": round(ci_upper - ci_lower, 4),
        "posterior_variance": round(posterior_variance, 6),
        "posterior_alpha": round(alpha_post, 2),
        "posterior_beta": round(beta_post, 2),
        "prior": {"alpha": prior_alpha, "beta": prior_beta},
        "success_count": successes,
        "failure_count": failures,
        "sample_size": n_total
    }

# -----------------------------
# Temporal Trust Metrics
# -----------------------------
def calculate_metrics(df):
    df["date"] = pd.to_datetime(df["date"], errors="coerce", format="mixed").fillna(pd.Timestamp("today"))
    df["week"] = df["date"].dt.to_period("W").astype(str)

    grouped = (
        df.groupby("week")
        .agg(
            override_rate=("override", "mean"),
            trust_score=("override", lambda x: 1.0 - x.mean()),
            avg_sentiment=("sentiment", "mean"),
            skepticism_rate=("skepticism_flag", "mean"),
            complacency_risk=("is_complacent", "mean"),
            total_cases=("override", "count"),
        )
        .reset_index()
    )
    
    return grouped

def trust_volatility(metrics):
    val = metrics["trust_score"].std()
    if pd.isna(val) or np.isnan(val):
        return 0.0
    return float(val)

def trust_decay_rate(metrics):
    if len(metrics) < 2:
        return 0.0
    x = np.arange(len(metrics))
    y = metrics["trust_score"].values
    try:
        slope = float(np.polyfit(x, y, 1)[0])
        if pd.isna(slope) or np.isnan(slope):
            return 0.0
        return -slope
    except Exception:
        return 0.0

def human_ai_alignment_index(metrics):
    if metrics.empty:
        return 1.0
    avg_trust = float(metrics["trust_score"].mean())
    avg_sentiment_normalized = float((metrics["avg_sentiment"].mean() + 1) / 2)
    avg_skepticism = float(metrics["skepticism_rate"].mean())
    
    return float(
        0.5 * avg_trust
        + 0.3 * (1.0 - avg_skepticism)
        + 0.2 * avg_sentiment_normalized
    )

def system_health_label(score):
    if score > 0.7:
        return "HEALTHY"
    if score > 0.45:
        return "AT RISK"
    return "CRITICAL"

def intervention_priority(metrics):
    rows = []
    for _, r in metrics.iterrows():
        sentiment_penalty = (1.0 - r["avg_sentiment"]) / 2.0
        score = (
            r["override_rate"] * 0.5
            + r["skepticism_rate"] * 0.3
            + sentiment_penalty * 0.2
        )
        rows.append({"week": r["week"], "priority_score": round(score, 2)})
    return sorted(rows, key=lambda x: x["priority_score"], reverse=True)

# -----------------------------
# RAG-STYLE THEME ANALYSIS (LOCAL TF-IDF, 100% OFFLINE)
# -----------------------------
class TrustRAG:
    """
    Offline-only theme classifier using TF-IDF cosine similarity.
    No external API calls are made at any point (HIPAA/SOC-2/GDPR compliant).
    """
    _categories = []
    _tfidf_vectorizer = None
    _tfidf_vectors = None

    @classmethod
    def initialize(cls):
        if cls._tfidf_vectors is not None:
            return

        prototypes = {
            "Model Inaccuracy": [
                "wrong credit score", "incorrect risk assessment", "error in model",
                "false positive", "bad output", "wrong risk score", "inaccurate prediction"
            ],
            "Compliance Trigger": [
                "kyc failure", "ofac hit", "sanctions match", "regulatory violation",
                "aml flag", "adverse action required", "fair lending concern", "ecoa"
            ],
            "Underwriter Judgment Override": [
                "manual override", "human judgment", "loan officer decision",
                "personal assessment", "collateral context", "relationship banking"
            ],
            "General Skepticism": [
                "uncertain", "doubt", "not sure", "verify later", "skeptical", "suspicious",
                "hesitant", "conflicting signals", "borderline case"
            ]
        }

        cls._categories = []
        phrases = []
        for category, p_list in prototypes.items():
            for p in p_list:
                cls._categories.append(category)
                phrases.append(p)

        cls._tfidf_vectorizer = TfidfVectorizer(ngram_range=(1, 2))
        cls._tfidf_vectors = cls._tfidf_vectorizer.fit_transform(phrases)

    def __init__(self):
        if self._tfidf_vectors is None:
            self.initialize()

    def classify_batch(self, texts):
        if not texts:
            return []

        if self._tfidf_vectors is None:
            self.initialize()

        # Offline-only: TF-IDF cosine similarity (zero network calls)
        text_tfidf = self._tfidf_vectorizer.transform(texts)
        sims = cosine_similarity(text_tfidf, self._tfidf_vectors)
        results = []
        for i in range(len(texts)):
            best_idx = np.argmax(sims[i])
            if sims[i][best_idx] > 0.0:
                results.append(self._categories[best_idx])
            else:
                results.append("General Skepticism")
        return results

    def build(self, notes):
        if not notes:
            return []
            
        buckets = defaultdict(list)
        classifications = self.classify_batch(notes)
        
        for note, category in zip(notes, classifications):
            buckets[category].append(note)

        return [
            {"theme": k, "count": len(v), "example": v[0]}
            for k, v in sorted(buckets.items(), key=lambda x: len(x[1]), reverse=True)
            if v
        ]

# -----------------------------
# Executive Summary
# -----------------------------
def executive_summary(metrics, weights, rag, haai, complacency_risk=0.0, cusum=None):
    summary = []

    if not metrics.empty and metrics["trust_score"].min() < 0.5:
        summary.append("Trust declined during periods of elevated overrides.")

    if cusum and cusum.get("drift_detected"):
        weeks_str = ", ".join(cusum.get("drift_weeks", []))
        summary.append(f"Statistically significant CUSUM trust drift flagged in: {weeks_str}.")

    if rag:
        summary.append(f"Primary trust failure driver: {rag[0]['theme']}.")
    else:
        summary.append("No major trust failure drivers detected.")

    numeric_weights = {k: v for k, v in weights.items() if isinstance(v, (int, float))}
    if numeric_weights and any(w != 0.0 for w in numeric_weights.values()):
        strongest = max(numeric_weights, key=lambda k: abs(numeric_weights[k]))
        summary.append(f"ML attribution identifies '{strongest}' as the dominant predictor.")
    else:
        summary.append("ML attribution not available due to uniform alignment.")

    summary.append(f"Overall system health classified as {system_health_label(haai)}.")
    
    if complacency_risk > 0.1:
        summary.append(f"Warning: Complacency Risk is elevated ({complacency_risk:.1%}). Users may be rubber-stamping model outputs despite expressing reservations in their notes.")

    return " ".join(summary)

# -----------------------------
# Actionable Recommendations & Anomalies
# -----------------------------
def generate_recommendations(metrics, rag, haai, complacency_risk, cusum=None, fairness=None):
    recs = []
    
    if cusum and cusum.get("drift_detected"):
        recs.append({
            "title": "Mitigate CUSUM Trust Drift",
            "description": f"CUSUM control chart detected anomalous trust decay breaching statistical threshold h={cusum.get('threshold_h')}. Trigger operational review.",
            "type": "critical"
        })

    if fairness and fairness.get("four_fifths_rule_violated"):
        recs.append({
            "title": "Audit Departmental Disparate Impact",
            "description": f"Disparate impact ratio ({fairness.get('disparate_impact_ratio'):.2f}) violates the 80% rule across departments. Investigate systemic policy friction.",
            "type": "warning"
        })
    
    if haai < 0.6:
        recs.append({
            "title": "Investigate AI-Human Alignment",
            "description": f"The overall Human-AI Alignment Index is critical ({(haai*100):.1f}%). Initiate a full audit of recent model updates to identify performance degradation.",
            "type": "critical"
        })
        
    if complacency_risk > 0.1:
        recs.append({
            "title": "Address Operator Complacency",
            "description": "High rates of skepticism without corresponding overrides indicate operators may be rubber-stamping AI decisions. Mandate secondary reviews for high-risk predictions.",
            "type": "warning"
        })
        
    if rag:
        top_theme = rag[0]
        recs.append({
            "title": f"Mitigate '{top_theme['theme']}'",
            "description": f"This theme accounted for {top_theme['count']} recent trust failures. For example: '{top_theme['example']}'. Update training data to cover these edge cases.",
            "type": "action"
        })
        
    if not recs:
        recs.append({
            "title": "Maintain Current Governance",
            "description": "System health is stable. Continue monitoring operator notes and override rates for emerging trends.",
            "type": "success"
        })
        
    return recs

def detect_anomalies(df):
    if len(df) < 10:
        scatter_data = []
        for _, row in df.iterrows():
            scatter_data.append({
                "sentiment": float(row.get("sentiment", 0.0)),
                "note_length": float(row.get("note_length", 0.0)),
                "is_anomaly": False,
                "override": bool(row.get("override", False))
            })
        return {"list": [], "scatter": scatter_data}
    
    features = df[["sentiment", "negativity", "skepticism_flag", "note_length"]].fillna(0)
    
    iso_forest = IsolationForest(contamination=0.05, random_state=42)
    df["anomaly_score"] = iso_forest.fit_predict(features)
    
    anomalies = df[df["anomaly_score"] == -1].copy()
    anomalies["extremity"] = abs(anomalies["sentiment"]) + anomalies["note_length"]
    anomalies = anomalies.sort_values("extremity", ascending=False).head(10)
    
    results = []
    for _, row in anomalies.iterrows():
        results.append({
            "date": str(row["date"]),
            "note": row["confidence_note"],
            "sentiment": float(row["sentiment"]),
            "note_length": float(row["note_length"]),
            "override": bool(row["override"])
        })
        
    scatter_data = []
    for _, row in df.iterrows():
        scatter_data.append({
            "sentiment": float(row["sentiment"]),
            "note_length": float(row["note_length"]),
            "is_anomaly": bool(row["anomaly_score"] == -1),
            "override": bool(row["override"])
        })
        
    return {"list": results, "scatter": scatter_data}

# -----------------------------
# MAIN ENDPOINT
# -----------------------------
@app.post("/analyze")
async def analyze(file: UploadFile = File(...), response: Response = None):
    t0 = time.perf_counter()
    df = pd.read_csv(file.file)

    required = {"date", "model_decision", "human_decision", "confidence_note"}
    if not required.issubset(df.columns):
        raise HTTPException(
            status_code=400,
            detail=f"CSV must contain columns: {required}",
        )

    df["override"] = df["model_decision"] != df["human_decision"]
    df = extract_nlp_features(df)

    pipeline, model_metrics = train_trust_model(df)
    weights, detailed_weights = explain_model(pipeline)

    # 1. Prediction with Ensemble Epistemic Uncertainty & SHAP Feature Attribution
    shap_explanations = []
    if pipeline is not None:
        for col in FEATURE_COLS:
            if col not in df.columns:
                df[col] = 0.0
        X_features = df[FEATURE_COLS].fillna(0.0)
        probs, var, std_dev = predict_with_ensemble_uncertainty(pipeline, X_features)
        df["override_risk"] = probs
        df["ensemble_uncertainty"] = std_dev
        shap_explanations = compute_shap_explanations(pipeline, X_features, top_k=3)
    else:
        default_risk = 1.0 if df["override"].any() else 0.0
        df["override_risk"] = default_risk
        df["ensemble_uncertainty"] = 0.0

    df["risk_tier"] = pd.cut(
        df["override_risk"], [0, 0.4, 0.7, 1.0], labels=["LOW", "MEDIUM", "HIGH"], include_lowest=True
    ).fillna("LOW")

    # Attach SHAP explanations to df rows
    df["shap_top_features"] = [
        shap_explanations[i]["top_features"] if i < len(shap_explanations) else []
        for i in range(len(df))
    ]

    metrics = calculate_metrics(df)
    
    overridden_df = df[df["override"]]
    rag = TrustRAG().build(overridden_df["confidence_note"].dropna().tolist())
    
    haai = human_ai_alignment_index(metrics)
    avg_complacency = float(metrics["complacency_risk"].mean() if "complacency_risk" in metrics else 0.0)

    # 5. CUSUM Drift Detection
    cusum_analysis = compute_cusum_drift(metrics)

    # 3. Fairness & Disparate Impact Auditing
    fairness_audit = compute_fairness_metrics(df)

    exec_summary = executive_summary(metrics, weights, rag, haai, avg_complacency, cusum_analysis)

    # Ground Truth Evaluation, 6. Cost Matrix & 7. Bayesian Trust Score
    has_ground_truth = "ground_truth" in df.columns
    ground_truth_metrics = None
    adjusted_trust_score = float(1.0 - df["override"].mean())
    cost_analysis = None
    # Default Bayesian trust using raw override signal (no ground truth needed)
    bayesian_trust = compute_bayesian_trust_score(df)

    if has_ground_truth:
        df["ai_correct"] = df["model_decision"] == df["ground_truth"]
        df["human_correct"] = df["human_decision"] == df["ground_truth"]

        df["justified_override"] = df["override"] & df["human_correct"]
        df["unjustified_override"] = df["override"] & (~df["human_correct"])
        df["missed_override"] = (~df["override"]) & (~df["ai_correct"])

        justified_rate = float(df["justified_override"].mean())
        unjustified_rate = float(df["unjustified_override"].mean())
        missed_rate = float(df["missed_override"].mean())
        adjusted_trust_score = float(round(1.0 - unjustified_rate - missed_rate, 4))

        # Recompute Bayesian trust with full ground-truth signal now available
        bayesian_trust = compute_bayesian_trust_score(df)
        cost_analysis = compute_cost_weighted_risk(df)

        ground_truth_metrics = {
            "ai_accuracy": float(df["ai_correct"].mean()),
            "human_accuracy": float(df["human_correct"].mean()),
            "justified_override_rate": justified_rate,
            "unjustified_override_rate": unjustified_rate,
            "missed_override_rate": missed_rate,
            "adjusted_trust_score": adjusted_trust_score,
            "counts": {
                "justified": int(df["justified_override"].sum()),
                "unjustified": int(df["unjustified_override"].sum()),
                "missed": int(df["missed_override"].sum()),
                "total": len(df)
            },
            "cost_analysis": cost_analysis,
            "bayesian_trust": bayesian_trust,
        }

    # Department Breakdown for legacy frontend table
    fairness = []
    if "department" in df.columns:
        dept_grouped = df.groupby("department").agg(
            override_rate=("override", "mean"),
            total_cases=("override", "count"),
            avg_sentiment=("sentiment", "mean")
        ).reset_index()
        
        for _, row in dept_grouped.iterrows():
            fairness.append({
                "department": str(row["department"]),
                "override_rate": float(row["override_rate"]),
                "trust_score": float(1.0 - row["override_rate"]),
                "total_cases": int(row["total_cases"]),
                "avg_sentiment": float(row["avg_sentiment"])
            })

    # Anomalies
    anomaly_data = detect_anomalies(df)
    
    # Recommendations
    recs = generate_recommendations(metrics, rag, haai, avg_complacency, cusum_analysis, fairness_audit)

    # 4. Confidence-Based Decision Routing
    routing_decisions, routing_summary = compute_confidence_routing(
        probs=df["override_risk"].values,
        std_devs=df["ensemble_uncertainty"].values
    )
    df["confidence_route"] = [r["route"] for r in routing_decisions]

    # 5. Feature-Level Drift Auditing (PSI)
    feature_drift = compute_feature_level_drift(df, feature_cols=FEATURE_COLS)

    latency_ms = round((time.perf_counter() - t0) * 1000, 2)
    if response:
        response.headers["X-Process-Time-Ms"] = str(latency_ms)

    return {
        "metrics": metrics.to_dict("records"),
        "ml_weights": weights,
        "top_risks": df.sort_values("override_risk", ascending=False)
        .head(5)[["confidence_note", "override_risk", "risk_tier", "ensemble_uncertainty", "confidence_route", "shap_top_features"]]
        .to_dict("records"),
        "shap_explanations": shap_explanations,
        "confidence_routing": routing_summary,
        "feature_drift_psi": feature_drift,
        "rag_explanations": rag,
        "executive_summary": exec_summary,
        "advanced_analysis": {
            "trust_volatility": trust_volatility(metrics),
            "trust_decay_rate": trust_decay_rate(metrics),
            "human_ai_alignment_index": haai,
            "system_health": system_health_label(haai),
            "intervention_priority": intervention_priority(metrics),
            "avg_complacency_risk": avg_complacency,
            "adjusted_trust_score": adjusted_trust_score,
            "avg_ensemble_uncertainty": float(round(float(df["ensemble_uncertainty"].mean()), 4)),
            "max_ensemble_uncertainty": float(round(float(df["ensemble_uncertainty"].max()), 4)),
            "cusum_drift": cusum_analysis,
            "feature_level_drift": feature_drift,
            "confidence_routing": routing_summary,
            "fairness_audit": fairness_audit,
            "bayesian_trust": bayesian_trust,
        },
        "ground_truth_metrics": ground_truth_metrics,
        "fairness_metrics": fairness,
        "anomalies": anomaly_data,
        "recommendations": recs,
        "model_metrics": model_metrics,
        "detailed_feature_importances": detailed_weights,
        "latency_ms": latency_ms,
    }

# -----------------------------
# 6. STREAMING / LIVE SIMULATION ENDPOINT
# -----------------------------
class InteractionRecord(BaseModel):
    model_config = {"protected_namespaces": ()}
    date: Optional[str] = None
    department: Optional[str] = "Underwriting"
    model_decision: str
    human_decision: str
    ground_truth: Optional[str] = None
    confidence_note: str

class SimulationSession:
    """
    In-memory stateful streaming buffer simulating live human-AI event stream
    and yielding incremental governance metrics upon each arrival.
    """
    def __init__(self, max_buffer: int = 1000):
        self.max_buffer = max_buffer
        self.history = []
        self._pipeline = None

    def reset(self):
        self.history = []
        self._pipeline = None

    def add_interaction(self, item: InteractionRecord):
        rec = {
            "date": item.date or pd.Timestamp.now().strftime("%Y-%m-%d"),
            "department": item.department or "Underwriting",
            "model_decision": item.model_decision,
            "human_decision": item.human_decision,
            "ground_truth": item.ground_truth or item.human_decision,
            "confidence_note": item.confidence_note,
            "override": item.model_decision != item.human_decision
        }
        self.history.append(rec)
        if len(self.history) > self.max_buffer:
            self.history.pop(0)

        df_curr = pd.DataFrame(self.history)
        df_curr = extract_nlp_features(df_curr)

        # Single sample live inference
        single_row = df_curr.iloc[[-1]].copy()
        
        # Train or update pipeline if minimum variety available
        if len(df_curr) >= 4 and len(np.unique(df_curr["override"])) >= 2:
            self._pipeline, _ = train_trust_model(df_curr)

        if self._pipeline is not None:
            probs, _, std_dev = predict_with_ensemble_uncertainty(self._pipeline, single_row[FEATURE_COLS].fillna(0.0))
            override_risk = float(probs[0])
            uncertainty = float(std_dev[0])
            shap_exp = compute_shap_explanations(self._pipeline, single_row[FEATURE_COLS].fillna(0.0), top_k=3)
            top_feats = shap_exp[0]["top_features"] if shap_exp else []
        else:
            override_risk = 1.0 if single_row["override"].iloc[0] else 0.0
            uncertainty = 0.0
            top_feats = []

        # Confidence routing for incoming sample
        decisions, _ = compute_confidence_routing([override_risk], [uncertainty])
        route = decisions[0]["route"]

        # Incremental Bayesian Trust Update
        bayes = compute_bayesian_trust_score(df_curr)

        return {
            "total_streamed": len(self.history),
            "incoming_sample": {
                "confidence_note": rec["confidence_note"],
                "department": rec["department"],
                "model_decision": rec["model_decision"],
                "human_decision": rec["human_decision"],
                "is_override": rec["override"],
                "override_risk": round(override_risk, 4),
                "ensemble_uncertainty": round(uncertainty, 4),
                "confidence_route": route,
                "shap_top_features": top_feats
            },
            "cumulative_governance": {
                "rolling_override_rate": round(float(df_curr["override"].mean()), 4),
                "rolling_trust_score": round(float(1.0 - df_curr["override"].mean()), 4),
                "bayesian_trust_mean": bayes["posterior_mean"],
                "bayesian_ci_95": [bayes["ci_lower_95"], bayes["ci_upper_95"]]
            }
        }

STREAMING_SESSION = SimulationSession()

@app.post("/simulate")
async def simulate_stream_interaction(record: InteractionRecord):
    """
    Real-time streaming simulation endpoint for single-row event stream processing.
    """
    res = STREAMING_SESSION.add_interaction(record)
    return res

@app.post("/simulate/reset")
async def simulate_reset():
    """Resets the in-memory streaming session buffer."""
    STREAMING_SESSION.reset()
    return {"status": "ok", "message": "Streaming buffer cleared"}

# -----------------------------
# API Health Check & Static SPA
# -----------------------------
@app.get("/api/health")
def health_check():
    return {"status": "healthy", "message": "OverWatch AI API is live!"}

@app.get("/")
def root():
    return {"message": "OverWatch AI API is running. Frontend is deployed on Vercel."}
