import { motion } from "framer-motion";
import {
  MessageSquare,
  Brain,
  Layers,
  AlertCircle,
  TrendingDown,
  Zap,
} from "lucide-react";

interface AIInsightsPanelProps {
  mlWeights: {
    sentiment_weight: number;
    negativity_weight?: number;
    skepticism_weight: number;
    note_length_weight?: number;
  };
  topRisks: {
    confidence_note: string;
    override_risk: number;
    shap_top_features?: {
      feature: string;
      attribution: number;
      value: number;
    }[];
  }[];
  rag: {
    theme: string;
    count: number;
    example: string;
  }[];
}

/* ── Sub Components ── */

const InsightCard = ({
  icon: Icon,
  title,
  accent,
  children,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  accent: string;
  children: React.ReactNode;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    className="card-surface rounded-xl p-6 h-full"
  >
    <div
      className="inline-flex items-center justify-center w-10 h-10 rounded-lg mb-4"
      style={{
        background: `linear-gradient(135deg, ${accent}20, ${accent}08)`,
      }}
    >
      <Icon className="w-[18px] h-[18px]" style={{ color: accent }} />
    </div>
    <h3 className="text-[15px] font-semibold mb-4 text-white">{title}</h3>
    {children}
  </motion.div>
);

const RiskMeter = ({ value }: { value: number }) => {
  const color =
    value > 60 ? "#EF4444" : value > 30 ? "#F59E0B" : "#22C55E";

  return (
    <div
      className="relative w-full h-2 rounded-full overflow-hidden"
      style={{ background: "rgba(255,255,255,0.05)" }}
    >
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${value}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
};

const WeightRow = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) => (
  <div
    className="flex items-center gap-3 p-3 rounded-lg"
    style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.04)",
    }}
  >
    <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
    <span className="text-[13px] text-white/60 flex-1">{label}</span>
    <span className="text-[13px] font-semibold text-white/80 font-mono tabular-nums">
      {value.toFixed(3)}
    </span>
  </div>
);

/* ── MAIN ── */
export const AIInsightsPanel = ({
  mlWeights,
  topRisks,
  rag,
}: AIInsightsPanelProps) => {
  const riskScore = Math.round(
    Math.max(
      topRisks.reduce((acc, r) => acc + r.override_risk, 0) /
        Math.max(topRisks.length, 1),
      0
    ) * 100
  );

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-2">
            AI <span className="gradient-text-ai">Intelligence</span>
          </h2>
          <p className="text-white/35 text-sm">
            ML predictions and retrieval-based explanations
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* RAG Themes */}
          <InsightCard
            icon={MessageSquare}
            title="Language & RAG Insights"
            accent="#7C3AED"
            delay={0.05}
          >
            <div className="space-y-2.5">
              {rag.map((r) => (
                <div
                  key={r.theme}
                  className="p-3 rounded-lg"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-3.5 h-3.5 text-indigo-light" />
                    <span className="text-[13px] font-medium text-white/70">
                      {r.theme}
                    </span>
                    <span
                      className="ml-auto text-[11px] px-2 py-0.5 rounded-md font-mono text-white/30"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    >
                      {r.count}
                    </span>
                  </div>
                  <p className="text-[12px] text-white/30 leading-relaxed">
                    "{r.example}"
                  </p>
                </div>
              ))}
            </div>
          </InsightCard>

          {/* ML Weights */}
          <InsightCard
            icon={Brain}
            title="Ensemble Model Weights"
            accent="#6366F1"
            delay={0.1}
          >
            <div className="space-y-4">
              {/* Risk meter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] text-white/50">
                    Trust Failure Risk
                  </span>
                  <span
                    className="text-[13px] font-semibold"
                    style={{
                      color:
                        riskScore > 60
                          ? "#EF4444"
                          : riskScore > 30
                          ? "#F59E0B"
                          : "#22C55E",
                    }}
                  >
                    {riskScore > 60 ? "High" : riskScore > 30 ? "Medium" : "Low"}
                  </span>
                </div>
                <RiskMeter value={riskScore} />
              </div>

              {/* Weight rows */}
              <div className="space-y-2">
                <WeightRow
                  icon={TrendingDown}
                  label="Skepticism"
                  value={mlWeights.skepticism_weight}
                  color="#EF4444"
                />
                <WeightRow
                  icon={Zap}
                  label="Sentiment"
                  value={mlWeights.sentiment_weight}
                  color="#06B6D4"
                />
                {mlWeights.negativity_weight !== undefined && (
                  <WeightRow
                    icon={AlertCircle}
                    label="Negativity"
                    value={mlWeights.negativity_weight}
                    color="#F59E0B"
                  />
                )}
                {mlWeights.note_length_weight !== undefined && (
                  <WeightRow
                    icon={MessageSquare}
                    label="Note Length"
                    value={mlWeights.note_length_weight}
                    color="#A855F7"
                  />
                )}
              </div>
            </div>
          </InsightCard>

          {/* High-Risk Cases */}
          <InsightCard
            icon={Layers}
            title="High-Risk Decisions"
            accent="#06B6D4"
            delay={0.15}
          >
            <div className="space-y-2.5">
              {topRisks.map((r, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <p className="text-[12px] text-white/40 leading-relaxed mb-1.5">
                    "{r.confidence_note}"
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="h-1 flex-1 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${r.override_risk * 100}%`,
                          background:
                            r.override_risk > 0.6
                              ? "#EF4444"
                              : r.override_risk > 0.3
                              ? "#F59E0B"
                              : "#22C55E",
                        }}
                      />
                    </div>
                    <span
                      className="text-[11px] font-mono font-medium tabular-nums"
                      style={{
                        color:
                          r.override_risk > 0.6
                            ? "#EF4444"
                            : r.override_risk > 0.3
                            ? "#F59E0B"
                            : "#22C55E",
                      }}
                    >
                      {(r.override_risk * 100).toFixed(0)}%
                    </span>
                  </div>
                  {/* SHAP Feature Contribution Bars */}
                  {(r as any).shap_top_features && (r as any).shap_top_features.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                      <div className="text-[10px] text-white/40 uppercase tracking-wider font-mono">
                        SHAP Attributions
                      </div>
                      {(r as any).shap_top_features.map((feat: any, idx: number) => {
                        const isPositive = feat.attribution >= 0;
                        const widthPct = Math.min(100, Math.round(Math.abs(feat.attribution) * 100 * 2));
                        return (
                          <div key={idx} className="flex items-center text-[10px] text-white/60 gap-1.5">
                            <span className="w-24 truncate font-mono">{feat.feature.replace(/_/g, ' ')}</span>
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${widthPct}%`,
                                  background: isPositive ? '#EF4444' : '#22C55E',
                                }}
                              />
                            </div>
                            <span className={`font-mono ${isPositive ? 'text-rose-400' : 'text-emerald-400'} tabular-nums`}>
                              {isPositive ? '+' : ''}{feat.attribution.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </InsightCard>
        </div>
      </div>
    </section>
  );
};
