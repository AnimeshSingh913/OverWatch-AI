import { motion } from "framer-motion";
import { Shield, Brain, Layers, Activity, Scale, Zap } from "lucide-react";

const capabilities = [
  {
    icon: Brain,
    title: "Ensemble Override Prediction",
    description:
      "RF + Gradient Boosting + Logistic Regression voting ensemble predicts when underwriters are likely to override AI credit decisions.",
    accent: "#6366F1",
  },
  {
    icon: Scale,
    title: "Fairness & Disparate Impact",
    description:
      "Automatically audits Demographic Parity Difference and 80% rule compliance across Underwriting, Fraud, and Compliance departments.",
    accent: "#7C3AED",
  },
  {
    icon: Activity,
    title: "CUSUM Trust Drift Detection",
    description:
      "Statistical control-chart alerts when trust decay crosses significance thresholds — catch degradation before it becomes a regulatory event.",
    accent: "#06B6D4",
  },
  {
    icon: Layers,
    title: "Offline RAG Theme Analysis",
    description:
      "TF-IDF cosine similarity clusters underwriter notes into themes — Model Inaccuracy, Compliance Trigger, Context Failure — with zero API calls.",
    accent: "#F59E0B",
  },
  {
    icon: Shield,
    title: "Bayesian Trust Scoring",
    description:
      "Beta-Bernoulli conjugate updating yields a posterior trust distribution with formal 95% credible intervals updated on every new decision.",
    accent: "#10B981",
  },
  {
    icon: Zap,
    title: "Confidence-Based Routing",
    description:
      "Routes each decision to AUTO_APPROVE, STANDARD_REVIEW, or SENIOR_REVIEW based on ensemble epistemic uncertainty and risk score.",
    accent: "#EF4444",
  },
];

const Capabilities = () => {
  return (
    <section className="py-28 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-white">
            Core <span className="gradient-text">Capabilities</span>
          </h2>
          <p className="text-white/40 text-base max-w-xl mx-auto leading-relaxed">
            ML, NLP, and statistical governance built specifically for credit teams
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((capability, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.07, duration: 0.5 }}
              className="card-surface rounded-xl p-6 group cursor-default"
            >
              <div
                className="inline-flex items-center justify-center w-11 h-11 rounded-lg mb-4"
                style={{
                  background: `linear-gradient(135deg, ${capability.accent}20, ${capability.accent}08)`,
                }}
              >
                <capability.icon
                  className="w-5 h-5"
                  style={{ color: capability.accent }}
                />
              </div>

              <h3 className="text-[15px] font-semibold mb-2 text-white">
                {capability.title}
              </h3>

              <p className="text-sm text-white/40 leading-relaxed">
                {capability.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Capabilities;
