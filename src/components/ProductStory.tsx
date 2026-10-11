import { motion } from "framer-motion";
import { AlertTriangle, TrendingDown, Eye } from "lucide-react";

const reasons = [
  {
    icon: AlertTriangle,
    title: "Silent Overrides Carry Hidden Risk",
    description:
      "When loan officers quietly reverse AI approval recommendations without documenting reasons, institutions lose visibility into systemic model failures — until a regulator or audit surfaces them.",
    accent: "#6366F1",
  },
  {
    icon: TrendingDown,
    title: "Trust Erodes Before Accuracy Does",
    description:
      "A model can still be statistically accurate while underwriter trust collapses. Override rates rise, decisions slow, and ROI from AI investment evaporates — often invisibly.",
    accent: "#7C3AED",
  },
  {
    icon: Eye,
    title: "Trust Must Be a Tracked KPI",
    description:
      "You monitor model AUC, latency, and approval rates. Human trust in those decisions deserves the same rigor — with dashboards, drift alerts, and fairness audits built in.",
    accent: "#06B6D4",
  },
];

const ProductStory = () => {
  return (
    <section className="py-28 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-white">
            Why Override Intelligence <span className="gradient-text">Matters</span>
          </h2>
          <p className="text-white/40 text-base max-w-xl mx-auto leading-relaxed">
            The missing governance layer in AI-assisted credit decisions
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reasons.map((reason, i) => (
            <motion.div
              key={reason.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="card-surface rounded-xl p-7 group cursor-default"
            >
              <div
                className="inline-flex items-center justify-center w-11 h-11 rounded-lg mb-5"
                style={{
                  background: `linear-gradient(135deg, ${reason.accent}20, ${reason.accent}08)`,
                }}
              >
                <reason.icon
                  className="w-5 h-5"
                  style={{ color: reason.accent }}
                />
              </div>
              <h3 className="text-[15px] font-semibold mb-2.5 text-white">
                {reason.title}
              </h3>
              <p className="text-sm text-white/40 leading-relaxed">
                {reason.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductStory;
