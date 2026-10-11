import { motion } from "framer-motion";
import {
  Eye,
  Users,
  Scale,
  Lock,
  FileCheck,
  MessageSquare,
} from "lucide-react";

const principles = [
  {
    icon: Eye,
    title: "Transparency",
    description:
      "All trust calculations are explainable. No black-box scoring — every metric traces back to source data.",
  },
  {
    icon: Users,
    title: "Human-in-the-Loop",
    description:
      "Humans always retain final authority. The system supports judgment, not replacement.",
  },
  {
    icon: Scale,
    title: "Fairness",
    description:
      "Trust analytics surface bias signals and uneven performance across decision contexts.",
  },
  {
    icon: Lock,
    title: "Data Privacy",
    description:
      "Uploaded data is processed transiently. No long-term storage or third-party sharing.",
  },
  {
    icon: FileCheck,
    title: "Auditability",
    description:
      "Every insight can be traced to source signals for governance and compliance.",
  },
  {
    icon: MessageSquare,
    title: "Operator Feedback",
    description:
      "Human confidence notes are treated as first-class signals, not noise.",
  },
];

const EthicsGovernance = () => {
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
            Ethics & <span className="gradient-text">Governance</span>
          </h2>
          <p className="text-white/40 text-base max-w-xl mx-auto leading-relaxed">
            Built for ECOA/FCRA-compliant, transparent, human-centered credit AI
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {principles.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="card-surface rounded-xl p-5 group cursor-default"
            >
              <div className="flex items-start gap-4">
                <div
                  className="p-2.5 rounded-lg flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))",
                  }}
                >
                  <p.icon className="w-[18px] h-[18px] text-indigo-light" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold mb-1 text-white">
                    {p.title}
                  </h3>
                  <p className="text-[13px] text-white/40 leading-relaxed">
                    {p.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-xs text-white/25 text-center mt-14 max-w-xl mx-auto leading-relaxed">
          OverWatch AI provides decision support, not automated lending decisions.
          All insights are advisory and designed to support human oversight under ECOA and FCRA.
        </p>
      </div>
    </section>
  );
};

export default EthicsGovernance;
