import { motion } from "framer-motion";
import { Upload, Cpu, BarChart3, FileText } from "lucide-react";

const steps = [
  {
    icon: Upload,
    number: "01",
    title: "Upload Decision Logs",
    description:
      "Drop your CSV of AI-assisted loan decisions — approval, rejection, and human override records — processed locally for full data privacy.",
  },
  {
    icon: Cpu,
    number: "02",
    title: "Ensemble ML Analysis",
    description:
      "NLP extracts sentiment and skepticism from underwriter notes. An ensemble model (RF + GB + LR) predicts override risk and calibration.",
  },
  {
    icon: BarChart3,
    number: "03",
    title: "Visualize Trust Trends",
    description:
      "Interactive dashboards surface override rates, Bayesian trust scores, CUSUM drift alerts, and disparate impact across departments.",
  },
  {
    icon: FileText,
    number: "04",
    title: "Act on Findings",
    description:
      "Executive summaries and prioritized recommendations guide corrective action before trust erodes or regulators notice.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-28 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(79,70,229,0.04), transparent 70%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-white">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-white/40 text-base max-w-xl mx-auto leading-relaxed">
            From raw underwriting logs to actionable trust intelligence in minutes
          </p>
        </motion.div>

        <div className="relative">
          <div className="hidden lg:block absolute top-1/2 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-y-1/2" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="relative"
              >
                <div className="card-surface rounded-xl p-6 h-full group cursor-default">
                  <div
                    className="absolute -top-3 -right-3 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    {step.number}
                  </div>

                  <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg mb-4"
                    style={{
                      background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(124,58,237,0.08))",
                    }}
                  >
                    <step.icon className="w-5 h-5 text-indigo-light" />
                  </div>

                  <h3 className="text-[15px] font-semibold mb-2 text-white">
                    {step.title}
                  </h3>
                  <p className="text-sm text-white/40 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
