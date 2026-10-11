import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Users,
  ShieldAlert,
  Activity,
} from "lucide-react";

interface AnalyticsDashboardProps {
  metrics: {
    week: string;
    override_rate: number;
    trust_score: number;
    total_cases: number;
    complacency_risk?: number;
  }[];
  advancedAnalysis?: {
    trust_volatility: number;
    trust_decay_rate: number;
    human_ai_alignment_index: number;
    system_health: string;
    avg_complacency_risk?: number;
  };
  groundTruthMetrics?: {
    ai_accuracy: number;
    human_accuracy: number;
    justified_override_rate: number;
    unjustified_override_rate: number;
    missed_override_rate: number;
    counts: {
      justified: number;
      unjustified: number;
      missed: number;
      total: number;
    };
  } | null;
}

/* ── Helpers ── */

const StatCard = ({
  title,
  value,
  suffix = "",
  icon: Icon,
  trend,
  accent,
  delay,
}: {
  title: string;
  value: number;
  suffix?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  accent: string;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.4 }}
    className="card-surface rounded-xl p-5 group"
  >
    <div className="flex items-start justify-between mb-3">
      <div
        className="p-2.5 rounded-lg"
        style={{
          background: `linear-gradient(135deg, ${accent}20, ${accent}08)`,
        }}
      >
        <Icon className="w-[18px] h-[18px]" style={{ color: accent }} />
      </div>
      {trend && trend !== "neutral" && (
        <div
          className="flex items-center gap-1 text-xs font-medium"
          style={{
            color: trend === "up" ? "#22C55E" : "#EF4444",
          }}
        >
          {trend === "up" ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )}
        </div>
      )}
    </div>
    <div className="text-2xl font-bold text-white stat-value mb-1">
      {value.toFixed(suffix === "%" ? 1 : 0)}
      <span className="text-lg text-white/40 font-medium ml-0.5">{suffix}</span>
    </div>
    <div className="text-xs text-white/35 font-medium">{title}</div>
  </motion.div>
);

const ChartCard = ({
  title,
  children,
  delay,
}: {
  title: string;
  children: React.ReactNode;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    className="card-surface rounded-xl p-6"
  >
    <h3 className="text-[14px] font-semibold mb-5 text-white/80">{title}</h3>
    {children}
  </motion.div>
);

/* ── Tooltip Style ── */
const tooltipStyle = {
  backgroundColor: "#0a1128",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "8px",
  padding: "10px 14px",
  fontSize: "12px",
};

/* ── MAIN COMPONENT ── */
export const AnalyticsDashboard = ({
  metrics,
  advancedAnalysis,
  groundTruthMetrics,
}: AnalyticsDashboardProps) => {
  const avgTrust =
    metrics.reduce((acc, m) => acc + m.trust_score, 0) /
    Math.max(metrics.length, 1);

  const avgOverride =
    metrics.reduce((acc, m) => acc + m.override_rate, 0) /
    Math.max(metrics.length, 1);

  const totalCases = metrics.reduce((acc, m) => acc + m.total_cases, 0);

  const chartData = metrics.map((m) => ({
    week: m.week,
    trustScore: m.trust_score * 100,
    overrideRate: m.override_rate * 100,
  }));

  const showComplacency = advancedAnalysis?.avg_complacency_risk !== undefined;

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-2">
            Trust Analytics
          </h2>
          <p className="text-white/35 text-sm">
            System-level trust trends derived from human–AI interactions
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 ${
            showComplacency ? "lg:grid-cols-4" : "lg:grid-cols-3"
          } gap-4 mb-10`}
        >
          <StatCard
            title="Average Trust Score"
            value={avgTrust * 100}
            suffix="%"
            icon={Shield}
            trend={avgTrust > 0.6 ? "up" : "down"}
            accent="#6366F1"
            delay={0.05}
          />
          <StatCard
            title="Override Rate"
            value={avgOverride * 100}
            suffix="%"
            icon={Users}
            trend={avgOverride < 0.3 ? "up" : "down"}
            accent="#7C3AED"
            delay={0.1}
          />
          <StatCard
            title="Total Decisions"
            value={totalCases}
            icon={Activity}
            trend="neutral"
            accent="#06B6D4"
            delay={0.15}
          />
          {showComplacency && (
            <StatCard
              title="Complacency Risk"
              value={(advancedAnalysis?.avg_complacency_risk || 0) * 100}
              suffix="%"
              icon={ShieldAlert}
              trend={
                (advancedAnalysis?.avg_complacency_risk || 0) > 0.1
                  ? "down"
                  : "up"
              }
              accent="#F59E0B"
              delay={0.2}
            />
          )}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="Trust Score Over Time" delay={0.2}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="trustGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#6366F1"
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="95%"
                      stopColor="#6366F1"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                  vertical={false}
                />
                <XAxis
                  dataKey="week"
                  stroke="rgba(255,255,255,0.2)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.2)"
                  fontSize={11}
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="trustScore"
                  stroke="#6366F1"
                  strokeWidth={2}
                  fill="url(#trustGradient)"
                  name="Trust Score"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Override Rate vs Trust" delay={0.25}>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                  vertical={false}
                />
                <XAxis
                  dataKey="week"
                  stroke="rgba(255,255,255,0.2)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="left"
                  stroke="rgba(255,255,255,0.2)"
                  fontSize={11}
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="rgba(255,255,255,0.2)"
                  fontSize={11}
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="trustScore"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  dot={false}
                  name="Trust Score"
                />
                <Bar
                  yAxisId="right"
                  dataKey="overrideRate"
                  fill="#7C3AED"
                  opacity={0.5}
                  radius={[4, 4, 0, 0]}
                  name="Override Rate"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Ground Truth Audit */}
        {groundTruthMetrics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-8 card-surface rounded-xl p-6 md:p-8"
          >
            <h3 className="text-base font-semibold mb-6 flex items-center gap-2.5 text-white">
              <Shield className="w-[18px] h-[18px] text-indigo-light" />
              Ground Truth Alignment Audit
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              {[
                {
                  label: "AI Accuracy",
                  val: groundTruthMetrics.ai_accuracy,
                  color: "#6366F1",
                },
                {
                  label: "Human Accuracy",
                  val: groundTruthMetrics.human_accuracy,
                  color: "#06B6D4",
                },
                {
                  label: "Justified Overrides",
                  val: groundTruthMetrics.justified_override_rate,
                  color: "#22C55E",
                },
                {
                  label: "Unjustified Overrides",
                  val: groundTruthMetrics.unjustified_override_rate,
                  color: "#EF4444",
                },
                {
                  label: "Missed Overrides",
                  val: groundTruthMetrics.missed_override_rate,
                  color: "#F59E0B",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-4 rounded-lg text-center"
                  style={{
                    background:
                      "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    className="text-xl font-bold stat-value mb-1"
                    style={{ color: item.color }}
                  >
                    {(item.val * 100).toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-white/30 font-medium">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="p-4 rounded-lg"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <h4 className="text-xs font-semibold mb-2.5 text-white/50">
                Interpreting the Audit
              </h4>
              <ul className="text-[12px] text-white/30 space-y-2 leading-relaxed">
                <li>
                  <strong style={{ color: "#22C55E" }}>
                    Justified Overrides:
                  </strong>{" "}
                  The AI predicted incorrectly, and the human successfully
                  corrected it. This indicates healthy, collaborative trust.
                </li>
                <li>
                  <strong style={{ color: "#EF4444" }}>
                    Unjustified Overrides:
                  </strong>{" "}
                  The AI predicted correctly, but the human overrode it
                  anyway. This indicates skepticism bias.
                </li>
                <li>
                  <strong style={{ color: "#F59E0B" }}>
                    Missed Overrides:
                  </strong>{" "}
                  The AI made a mistake, but the human blindly accepted it.
                  This is a critical complacency indicator.
                </li>
              </ul>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};
