import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface ExecutiveSummaryProps {
  text: string;
}

export const ExecutiveSummary = ({ text }: ExecutiveSummaryProps) => {
  const insights = text
    .split(". ")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.endsWith(".") ? s : `${s}.`));

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
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5"
            style={{
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-light" />
            <span className="text-[12px] font-medium text-white/50">
              AI-Generated Analysis
            </span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white">
            Executive Summary
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="max-w-3xl"
        >
          <div
            className="relative p-7 md:p-10 rounded-xl overflow-hidden"
            style={{
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Subtle inner glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 60% 60% at 20% 30%, rgba(99,102,241,0.06), transparent 70%)",
              }}
            />

            <div className="relative z-10 space-y-4">
              {insights.map((insight, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
                  className="text-[15px] leading-[1.7] text-white/55"
                >
                  {insight}
                </motion.p>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
