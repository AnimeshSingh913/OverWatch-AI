import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Send,
  RefreshCcw,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/analyze", "")
  : import.meta.env.DEV
    ? "http://127.0.0.1:8000"
    : "";

interface StreamEntry {
  id: number;
  note: string;
  department: string;
  modelDecision: string;
  humanDecision: string;
  isOverride: boolean;
  overrideRisk: number;
  uncertainity: number;
  route: string;
}

interface CumulativeStats {
  rolling_override_rate: number;
  rolling_trust_score: number;
  bayesian_trust_mean: number;
  bayesian_ci_95: [number, number];
}

const DEPARTMENTS = ["Underwriting", "Fraud", "Compliance", "Risk Management"];
const DECISIONS = ["approve", "reject"];

const PRESET_SCENARIOS = [
  {
    label: "Compliant Approval",
    data: { model_decision: "approve", human_decision: "approve", confidence_note: "Strong repayment history, income well-documented. Trusting model output.", department: "Underwriting" },
  },
  {
    label: "Override — Income Fraud",
    data: { model_decision: "approve", human_decision: "reject", confidence_note: "Overriding — applicant income appears overstated. Payslip inconsistency detected.", department: "Fraud" },
  },
  {
    label: "Compliance Flag",
    data: { model_decision: "approve", human_decision: "reject", confidence_note: "OFAC sanctions match on applicant name. KYC failure — cannot approve.", department: "Compliance" },
  },
  {
    label: "Rubber Stamp",
    data: { model_decision: "reject", human_decision: "reject", confidence_note: "ok", department: "Underwriting" },
  },
  {
    label: "Contextual Override",
    data: { model_decision: "reject", human_decision: "approve", confidence_note: "AI missed that the loan is fully secured by property. Human judgment override.", department: "Underwriting" },
  },
];

function routeBadge(route: string) {
  if (route === "AUTO_APPROVE") return { label: "Auto Approve", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" };
  if (route === "SENIOR_REVIEW") return { label: "Senior Review", color: "text-red-400 bg-red-400/10 border-red-400/20" };
  return { label: "Standard Review", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" };
}

function riskColor(risk: number) {
  if (risk < 0.4) return "text-emerald-400";
  if (risk < 0.7) return "text-amber-400";
  return "text-red-400";
}

const Simulate = () => {
  const navigate = useNavigate();
  const feedRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    model_decision: "approve",
    human_decision: "approve",
    confidence_note: "",
    department: "Underwriting",
  });
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feed, setFeed] = useState<StreamEntry[]>([]);
  const [stats, setStats] = useState<CumulativeStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (overrideData?: typeof form) => {
    const payload = overrideData ?? form;
    if (!payload.confidence_note.trim()) {
      setError("Please enter a confidence note before submitting.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Backend error");
      const data = await res.json();
      const incoming = data.incoming_sample;
      const newEntry: StreamEntry = {
        id: Date.now(),
        note: incoming.confidence_note,
        department: incoming.department,
        modelDecision: incoming.model_decision,
        humanDecision: incoming.human_decision,
        isOverride: incoming.is_override,
        overrideRisk: incoming.override_risk,
        uncertainity: incoming.ensemble_uncertainty,
        route: incoming.confidence_route,
      };
      setFeed((prev) => [newEntry, ...prev]);
      setStats(data.cumulative_governance);
      setTimeout(() => feedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch {
      setError("Failed to reach the backend. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    setResetting(true);
    try {
      await fetch(`${API_URL}/simulate/reset`, { method: "POST" });
      setFeed([]);
      setStats(null);
    } finally {
      setResetting(false);
    }
  };

  const loadPreset = (preset: typeof PRESET_SCENARIOS[0]) => {
    setForm(preset.data as typeof form);
    submit(preset.data as typeof form);
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      {/* Back button */}
      <div className="max-w-7xl mx-auto px-6 mb-8">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-white/40 hover:text-white/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(124,58,237,0.1))" }}
            >
              <Activity className="w-5 h-5 text-indigo-light" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white">Live Event Simulation</h1>
              <p className="text-sm text-white/40">Stream individual credit decisions and watch trust metrics update in real time</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Input Panel */}
          <div className="lg:col-span-1 space-y-5">
            {/* Preset scenarios */}
            <div className="card-surface rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white/80 mb-3">Quick Scenarios</h3>
              <div className="space-y-2">
                {PRESET_SCENARIOS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => loadPreset(s)}
                    disabled={loading}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all border border-white/5"
                  >
                    <span>{s.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                  </button>
                ))}
              </div>
            </div>

            {/* Manual form */}
            <div className="card-surface rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white/80 mb-4">Manual Entry</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/40 mb-1.5 block">AI Decision</label>
                    <select
                      value={form.model_decision}
                      onChange={(e) => setForm((f) => ({ ...f, model_decision: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-light/50"
                    >
                      {DECISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1.5 block">Human Decision</label>
                    <select
                      value={form.human_decision}
                      onChange={(e) => setForm((f) => ({ ...f, human_decision: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-light/50"
                    >
                      {DECISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Department</label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-light/50"
                  >
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Confidence Note</label>
                  <textarea
                    value={form.confidence_note}
                    onChange={(e) => setForm((f) => ({ ...f, confidence_note: e.target.value }))}
                    placeholder="Underwriter's comment or override reason…"
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-indigo-light/50 resize-none"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {error}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => submit()}
                    disabled={loading}
                    className="flex-1 btn-brand py-2.5 rounded-lg text-sm flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span className="animate-pulse">Sending…</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Submit Event
                      </>
                    )}
                  </button>
                  <button
                    onClick={reset}
                    disabled={resetting || feed.length === 0}
                    title="Reset session"
                    className="px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-white/80 border border-white/10 hover:border-white/20 transition-all"
                  >
                    <RefreshCcw className={`w-4 h-4 ${resetting ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Stats + Feed */}
          <div className="lg:col-span-2 space-y-5">
            {/* Cumulative stats */}
            <AnimatePresence>
              {stats && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                >
                  {[
                    { label: "Override Rate", value: `${(stats.rolling_override_rate * 100).toFixed(1)}%`, icon: TrendingUp, color: stats.rolling_override_rate > 0.4 ? "text-red-400" : "text-emerald-400" },
                    { label: "Trust Score", value: `${(stats.rolling_trust_score * 100).toFixed(1)}%`, icon: CheckCircle, color: stats.rolling_trust_score > 0.6 ? "text-emerald-400" : "text-amber-400" },
                    { label: "Bayesian Trust", value: `${(stats.bayesian_trust_mean * 100).toFixed(1)}%`, icon: Activity, color: "text-indigo-light" },
                    { label: "95% CI", value: `${(stats.bayesian_ci_95[0] * 100).toFixed(0)}–${(stats.bayesian_ci_95[1] * 100).toFixed(0)}%`, icon: Clock, color: "text-white/60" },
                  ].map((stat) => (
                    <div key={stat.label} className="card-surface rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <stat.icon className={`w-4 h-4 ${stat.color}`} />
                        <span className="text-xs text-white/40">{stat.label}</span>
                      </div>
                      <div className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Event feed */}
            <div ref={feedRef} className="card-surface rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${feed.length > 0 ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`} />
                  Live Event Stream
                </h3>
                <span className="text-xs text-white/30 font-mono">{feed.length} events</span>
              </div>

              {feed.length === 0 ? (
                <div className="py-16 text-center text-white/20 text-sm">
                  Submit an event to start the stream
                </div>
              ) : (
                <div className="divide-y divide-white/5 max-h-[520px] overflow-y-auto">
                  <AnimatePresence>
                    {feed.map((entry) => {
                      const badge = routeBadge(entry.route);
                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="px-5 py-4 hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] px-2 py-0.5 rounded bg-white/5 text-white/50 font-mono">
                                {entry.department}
                              </span>
                              <span className={`text-[11px] px-2 py-0.5 rounded border font-medium ${badge.color}`}>
                                {badge.label}
                              </span>
                              {entry.isOverride && (
                                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 font-medium">
                                  Override
                                </span>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className={`text-sm font-mono font-bold ${riskColor(entry.overrideRisk)}`}>
                                {(entry.overrideRisk * 100).toFixed(0)}%
                              </span>
                              <span className="text-[10px] text-white/30 block">risk</span>
                            </div>
                          </div>

                          <p className="text-sm text-white/60 leading-relaxed mb-2">{entry.note}</p>

                          <div className="flex items-center gap-4 text-[11px] text-white/30 font-mono">
                            <span>AI: <span className={entry.modelDecision === "approve" ? "text-emerald-400/70" : "text-red-400/70"}>{entry.modelDecision}</span></span>
                            <span>Human: <span className={entry.humanDecision === "approve" ? "text-emerald-400/70" : "text-red-400/70"}>{entry.humanDecision}</span></span>
                            <span>unc: {(entry.uncertainity * 100).toFixed(1)}%</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Simulate;
