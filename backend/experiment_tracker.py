"""
Experiment Tracker for OverWatch AI ML Models.
Logs model version, dataset metadata, feature sets, hyperparameters, and cross-validated metrics
to structured JSON and CSV run logs (mimicking MLflow run artifacts for full offline compliance).
"""

import os
import json
import csv
import time
from datetime import datetime

class ExperimentTracker:
    def __init__(self, log_dir="experiment_logs"):
        self.log_dir = log_dir
        os.makedirs(self.log_dir, exist_ok=True)
        self.csv_path = os.path.join(self.log_dir, "runs.csv")

    def log_run(self, run_name: str, metrics: dict, params: dict, tags: dict = None):
        run_id = f"run_{int(time.time())}_{run_name}"
        timestamp = datetime.now().isoformat()

        run_record = {
            "run_id": run_id,
            "run_name": run_name,
            "timestamp": timestamp,
            "params": params,
            "metrics": metrics,
            "tags": tags or {}
        }

        # 1. Save detailed JSON artifact
        json_file = os.path.join(self.log_dir, f"{run_id}.json")
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(run_record, f, indent=2)

        # 2. Append to summary CSV
        flat_row = {
            "run_id": run_id,
            "run_name": run_name,
            "timestamp": timestamp,
            "sample_size": params.get("sample_size", 0),
            "n_features": params.get("n_features", 0),
            "model_type": params.get("model_type", "VotingClassifier(RF+GB+LR)"),
            "accuracy": metrics.get("accuracy", 0.0),
            "precision": metrics.get("precision", 0.0),
            "recall": metrics.get("recall", 0.0),
            "f1": metrics.get("f1", 0.0),
            "roc_auc": metrics.get("roc_auc", 0.0),
            "brier_score": metrics.get("brier_score", 0.0),
            "ece": metrics.get("ece", 0.0),
            "mce": metrics.get("mce", 0.0),
            "dataset": tags.get("dataset", "sample_data.csv") if tags else "sample_data.csv"
        }

        file_exists = os.path.isfile(self.csv_path)
        with open(self.csv_path, "a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(flat_row.keys()))
            if not file_exists:
                writer.writeheader()
            writer.writerow(flat_row)

        return run_record

EXPERIMENT_TRACKER = ExperimentTracker()
