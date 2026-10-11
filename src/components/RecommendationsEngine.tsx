import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, ShieldAlert } from "lucide-react";

interface RecommendationsEngineProps {
  recommendations: {
    title: string;
    description: string;
    type: "critical" | "warning" | "action" | "success";
  }[];
}

export const RecommendationsEngine = ({
  recommendations,
}: RecommendationsEngineProps) => {
  if (!recommendations || recommendations.length === 0) return null;

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "critical":
        return {
          icon: ShieldAlert,
          color: "#EF4444",
          bg: "rgba(239,68,68,0.1)",
          border: "rgba(239,68,68,0.2)",
        };
      case "warning":
        return {
          icon: AlertTriangle,
          color: "#F59E0B",
          bg: "rgba(245,158,11,0.1)",
          border: "rgba(245,158,11,0.2)",
        };
      case "action":
        return {
          icon: Info,
          color: "#06B6D4",
          bg: "rgba(6,182,212,0.1)",
          border: "rgba(6,182,212,0.2)",
        };
      case "success":
      default:
        return {
          icon: CheckCircle2,
          color: "#22C55E",
          bg: "rgba(34,197,94,0.1)",
          border: "rgba(34,197,94,0.2)",
        };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="card-surface rounded-xl p-6 h-full flex flex-col"
    >
      <div className="mb-6">
        <h3 className="text-[15px] font-semibold flex items-center gap-2.5 text-white mb-1.5">
          <CheckCircle2 className="w-[18px] h-[18px] text-emerald-bright" />
          Actionable Interventions
        </h3>
        <p className="text-[13px] text-white/40">
          Algorithmic recommendations to restore trust alignment
        </p>
      </div>

      <div className="flex-1 space-y-3">
        {recommendations.map((rec, i) => {
          const styles = getTypeStyles(rec.type);
          const Icon = styles.icon;
          return (
            <div
              key={i}
              className="p-4 rounded-lg flex gap-4 items-start transition-colors duration-200"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${styles.border}`,
              }}
            >
              <div
                className="p-2 rounded-md shrink-0 mt-0.5"
                style={{ background: styles.bg }}
              >
                <Icon className="w-4 h-4" style={{ color: styles.color }} />
              </div>
              <div>
                <h4
                  className="text-[13px] font-semibold mb-1"
                  style={{ color: styles.color }}
                >
                  {rec.title}
                </h4>
                <p className="text-[12px] text-white/60 leading-relaxed">
                  {rec.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
