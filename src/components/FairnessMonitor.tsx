import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Users, AlertTriangle } from "lucide-react";

interface FairnessMonitorProps {
  data: {
    department: string;
    override_rate: number;
    trust_score: number;
    total_cases: number;
    avg_sentiment: number;
  }[];
}

const tooltipStyle = {
  backgroundColor: "#0a1128",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "8px",
  padding: "10px 14px",
  fontSize: "12px",
};

export const FairnessMonitor = ({ data }: FairnessMonitorProps) => {
  if (!data || data.length === 0) return null;

  // Format data for charts
  const chartData = data.map((d) => ({
    ...d,
    trustScore: d.trust_score * 100,
    overrideRate: d.override_rate * 100,
  }));

  // Identify high discrepancy (if variance is high)
  const trustScores = chartData.map((d) => d.trustScore);
  const minTrust = Math.min(...trustScores);
  const maxTrust = Math.max(...trustScores);
  const variance = maxTrust - minTrust;
  const isHighVariance = variance > 20;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="card-surface rounded-xl p-6"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-[15px] font-semibold flex items-center gap-2.5 text-white mb-1.5">
            <Users className="w-[18px] h-[18px] text-cyan" />
            Fairness & Bias Monitor
          </h3>
          <p className="text-[13px] text-white/40">
            Trust alignment broken down by operational cohorts
          </p>
        </div>
        {isHighVariance && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-red/10 border border-red/20 text-red text-[11px] font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            High Trust Discrepancy Detected
          </div>
        )}
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              type="number"
              domain={[0, 100]}
              stroke="rgba(255,255,255,0.2)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              unit="%"
            />
            <YAxis
              dataKey="department"
              type="category"
              stroke="rgba(255,255,255,0.6)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "rgba(255,255,255,0.02)" }}
            />
            <Bar
              dataKey="trustScore"
              name="Trust Score"
              radius={[0, 4, 4, 0]}
              barSize={24}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.trustScore < 50
                      ? "#EF4444"
                      : entry.trustScore < 70
                      ? "#F59E0B"
                      : "#22C55E"
                  }
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};
