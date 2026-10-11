import { motion } from "framer-motion";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Cell,
} from "recharts";
import { Target, AlertCircle } from "lucide-react";

interface AnomalyDetectorProps {
  data: {
    list: {
      date: string;
      note: string;
      sentiment: number;
      note_length: number;
      override: boolean;
    }[];
    scatter: {
      sentiment: number;
      note_length: number;
      is_anomaly: boolean;
      override: boolean;
    }[];
  };
}

const tooltipStyle = {
  backgroundColor: "#0a1128",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "8px",
  padding: "10px 14px",
  fontSize: "12px",
};

export const AnomalyDetector = ({ data }: AnomalyDetectorProps) => {
  if (!data || !data.scatter || data.scatter.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="card-surface rounded-xl p-6"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-[15px] font-semibold flex items-center gap-2.5 text-white mb-1.5">
            <Target className="w-[18px] h-[18px] text-purple" />
            Decision Anomalies
          </h3>
          <p className="text-[13px] text-white/40">
            Isolation Forest detecting irrational human-AI interaction patterns
          </p>
        </div>
      </div>

      <div className="h-[280px] w-full mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
            />
            <XAxis
              type="number"
              dataKey="note_length"
              name="Note Length"
              stroke="rgba(255,255,255,0.2)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[0, 1]}
              label={{
                value: "Confidence Note Detail →",
                position: "insideBottom",
                fill: "rgba(255,255,255,0.3)",
                fontSize: 10,
                offset: -5,
              }}
            />
            <YAxis
              type="number"
              dataKey="sentiment"
              name="Sentiment"
              stroke="rgba(255,255,255,0.2)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[-1, 1]}
              label={{
                value: "Negative ← Sentiment → Positive",
                angle: -90,
                position: "insideLeft",
                fill: "rgba(255,255,255,0.3)",
                fontSize: 10,
              }}
            />
            <ZAxis type="number" range={[40, 40]} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ strokeDasharray: "3 3" }}
            />
            <Scatter name="Decisions" data={data.scatter}>
              {data.scatter.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.is_anomaly ? "#EF4444" : "#6366F1"}
                  fillOpacity={entry.is_anomaly ? 1 : 0.3}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {data.list.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-white/50 mb-2">
            Top Anomalies
          </h4>
          {data.list.slice(0, 2).map((anomaly, i) => (
            <div
              key={i}
              className="p-3 rounded-lg"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red" />
                <span className="text-[11px] font-mono text-white/50">
                  {anomaly.date}
                </span>
                <span
                  className={`ml-auto text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${
                    anomaly.override
                      ? "bg-red/10 text-red"
                      : "bg-emerald/10 text-emerald-bright"
                  }`}
                >
                  {anomaly.override ? "Override" : "Accepted"}
                </span>
              </div>
              <p className="text-[12px] text-white/70 leading-relaxed italic">
                "{anomaly.note}"
              </p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
