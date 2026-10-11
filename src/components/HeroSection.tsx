import { motion } from "framer-motion";
import { ArrowDown, Sparkles } from "lucide-react";

interface HeroSectionProps {
  onUploadClick: () => void;
}

const HeroSection = ({ onUploadClick }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Atmospheric ambient light — very subtle */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 40%, rgba(79,70,229,0.08), transparent 70%)",
        }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-10"
          style={{
            background: "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-light" />
          <span className="text-[13px] font-medium text-white/60">
            AI Governance for Credit & Lending Teams
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7 }}
          className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold leading-[1.05] mb-7 tracking-tight"
        >
          <span className="text-white">Monitor </span>
          <span className="gradient-text">Override</span>
          <br />
          <span className="text-white/90">Risk in Real Time</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="text-lg md:text-xl text-white/45 max-w-2xl mx-auto mb-12 leading-relaxed font-light"
        >
          Detect when underwriters override AI decisions, predict trust failure,
          <br className="hidden sm:block" />
          and build accountability into every credit workflow.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={onUploadClick}
            className="btn-brand text-[15px] px-7 py-3.5 rounded-xl flex items-center gap-2.5 group"
          >
            Upload Underwriting Data
            <motion.span
              animate={{ y: [0, 3, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <ArrowDown className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
            </motion.span>
          </button>

          <button
            onClick={onUploadClick}
            className="text-[15px] px-7 py-3.5 rounded-xl font-medium text-white/60 hover:text-white/90 transition-colors duration-200"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            View Demo
          </button>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="flex items-center justify-center gap-8 mt-16 text-white/25 text-[13px] font-medium"
        >
          <span>ECOA / FCRA Ready</span>
          <span className="w-1 h-1 rounded-full bg-white/15" />
          <span>SOC 2 Compliant</span>
          <span className="w-1 h-1 rounded-full bg-white/15" />
          <span>GDPR Ready</span>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
