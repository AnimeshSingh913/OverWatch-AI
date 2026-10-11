# OverWatch AI — Credit Decision Trust Intelligence

![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)
![React](https://img.shields.io/badge/React-18-61DAFB.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

> **OverWatch AI** is an end-to-end **human–AI trust monitoring system for credit and lending teams**.
> It analyzes loan officer overrides and underwriter notes to quantify trust,
> detect model drift, and explain *why humans stop relying on AI credit models*.
>
> Built for **ECOA/FCRA-compliant AI governance**, **human-in-the-loop underwriting**,
> and **responsible lending deployments**.

## Key Features

- CSV upload of AI-assisted credit decision logs (approve/reject)
- NLP-driven sentiment and skepticism analysis (VADER)
- Offline TF-IDF semantic exemplar matching (compliance, dispute, uncertainty)
- Ensemble ML override risk prediction (Random Forest + Gradient Boosting + Logistic Regression)
- Bayesian trust scoring with 95% credible intervals (Beta-Bernoulli)
- CUSUM statistical drift detection on trust time series
- Population Stability Index (PSI) per-feature drift auditing
- Fairness & disparate impact audit (Demographic Parity, 80% Rule) across Underwriting/Fraud/Compliance
- SHAP-style local feature attribution (fully offline)
- Confidence-based decision routing: AUTO_APPROVE / STANDARD_REVIEW / SENIOR_REVIEW
- Anomaly detection (IsolationForest)
- **Live streaming simulation** — submit decisions one-by-one and watch trust metrics update in real time
- Executive summary with prioritized actionable recommendations

## Architecture

```
Loan Officer Decision Logs (CSV)
↓
NLP Feature Extraction (VADER + TF-IDF Exemplar Matching)
↓
Ensemble Override Risk Model (RF + GB + LR)
↓
Temporal Trust Metrics + CUSUM Drift Detection
↓
Fairness Audit (DPD / DIR / 80% Rule)
↓
Bayesian Trust Posterior + SHAP Attribution
↓
Confidence Routing + Executive Insights
```

## Input Data Format

| Column | Description | Values |
|--------|-------------|--------|
| `date` | Decision date | YYYY-MM-DD |
| `model_decision` | AI credit recommendation | `approve` / `reject` |
| `human_decision` | Final loan officer decision | `approve` / `reject` |
| `confidence_note` | Underwriter reasoning / override note | Free text |
| `ground_truth` | *(optional)* Verified outcome | `approve` / `reject` |
| `department` | *(optional)* Desk/team tag | `Underwriting` / `Fraud` / `Compliance` / `Risk Management` |

Override is detected when: `model_decision != human_decision`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze` | Upload CSV → full trust analysis |
| POST | `/simulate` | Stream a single decision event |
| POST | `/simulate/reset` | Clear the streaming session buffer |
| GET | `/api/health` | Health check |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Shadcn/UI, Recharts, Framer Motion |
| Backend | FastAPI, Python 3.11 |
| ML | scikit-learn (RF, GB, LR, IsolationForest) |
| NLP | NLTK VADER + TF-IDF cosine similarity |
| Statistics | scipy (Beta distribution, CUSUM) |
| Deployment | Vercel (frontend) + Render (backend) |

## Running Locally

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

**Frontend:**
```bash
npm install
npm run dev
```

Set `VITE_API_URL=http://127.0.0.1:8000/analyze` in `.env.local` for local dev.

## Deployment

- Frontend: Deploy to Vercel — set `VITE_API_URL` to your backend URL
- Backend: Deploy to Render using `render.yaml` — set `FRONTEND_URL` env var to your Vercel URL

---

*OverWatch AI provides decision support, not automated lending decisions.
All insights are advisory and designed to support human oversight under ECOA and FCRA.*
