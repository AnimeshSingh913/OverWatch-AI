import { useRef, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { motion, AnimatePresence } from "framer-motion";
import Simulate from "./pages/Simulate";

/* ===============================
   CORE ANALYTICS (NAMED EXPORTS)
================================ */
import { CSVUploader } from "./components/CSVUploader";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { AIInsightsPanel } from "./components/AIInsightsPanel";
import { ExecutiveSummary } from "./components/ExecutiveSummary";
import { FairnessMonitor } from "./components/FairnessMonitor";
import { AnomalyDetector } from "./components/AnomalyDetector";
import { RecommendationsEngine } from "./components/RecommendationsEngine";

/* ===============================
   LANDING SECTIONS (DEFAULT EXPORTS)
================================ */
import HeroSection from "./components/HeroSection";
import ProductStory from "./components/ProductStory";
import HowItWorks from "./components/HowItWorks";
import Capabilities from "./components/Capabilities";
import EthicsGovernance from "./components/EthicsGovernance";
import Footer from "./components/Footer";

const queryClient = new QueryClient();

const MainApp = ({ simulateOnly = false }: { simulateOnly?: boolean }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const uploadRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [scrolled, setScrolled] = useState(false);

  // Track scroll for navbar transparency
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll to results dashboard when data loads
  useEffect(() => {
    if (analysisData) {
      const timer = setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [analysisData]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        {/* ── Top Bar ── */}
        <header
          className={`
            fixed top-0 left-0 right-0 z-50 transition-all duration-300
            ${scrolled ? "topbar shadow-md" : "bg-transparent"}
          `}
        >
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white"
                style={{ background: "var(--gradient-brand)" }}
              >
                O
              </div>
              <span className="font-display font-bold text-lg tracking-tight text-white">
                OverWatch AI
              </span>
              <span className="hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-light/15 text-indigo-light border border-indigo-light/20 ml-1">
                Enterprise
              </span>
            </div>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
              <button
                onClick={() => { navigate("/"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className={`transition-colors duration-200 ${location.pathname === "/" ? "text-white" : "text-white/60 hover:text-white"}`}
              >
                Home
              </button>
              <button
                onClick={() => {
                  if (location.pathname !== "/") { navigate("/"); setTimeout(() => uploadRef.current?.scrollIntoView({ behavior: "smooth" }), 300); }
                  else uploadRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-white/60 hover:text-white transition-colors duration-200"
              >
                Upload
              </button>
              <button
                onClick={() => navigate("/simulate")}
                className={`transition-colors duration-200 flex items-center gap-1.5 ${location.pathname === "/simulate" ? "text-indigo-light font-semibold" : "text-white/60 hover:text-white"}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-light animate-pulse-soft" />
                Live Sim
              </button>
              {analysisData && (
                <button
                  onClick={() => resultsRef.current?.scrollIntoView({ behavior: "smooth" })}
                  className="text-indigo-light font-semibold flex items-center gap-2 transition-colors duration-200"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-bright animate-pulse-soft" />
                  Dashboard
                </button>
              )}
            </nav>

            {/* Status */}
            <div className="flex items-center gap-2.5">
              <span className="w-[6px] h-[6px] rounded-full bg-emerald-bright animate-pulse-soft" />
              <span className="text-xs text-white/40 font-mono tracking-wide">
                v2.0
              </span>
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <main>
          {simulateOnly ? <Simulate /> : <>
          {/* HERO */}
          <HeroSection
            onUploadClick={() =>
              uploadRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          />

          {/* MARKETING SECTIONS */}
          <ProductStory />
          <HowItWorks />
          <Capabilities />
          <EthicsGovernance />

          {/* CSV UPLOAD */}
          <CSVUploader uploadRef={uploadRef} onDataLoaded={setAnalysisData} />

          {/* RESULTS */}
          <AnimatePresence>
            {analysisData && (
              <motion.div
                ref={resultsRef}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="scroll-mt-20"
              >
                <AnalyticsDashboard
                  metrics={analysisData.metrics}
                  advancedAnalysis={analysisData.advanced_analysis}
                  groundTruthMetrics={analysisData.ground_truth_metrics}
                />

                {/* NEW ENTERPRISE FEATURES */}
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-5 mb-20 -mt-10">
                  {analysisData.fairness_metrics && (
                    <FairnessMonitor data={analysisData.fairness_metrics} />
                  )}
                  {analysisData.anomalies && (
                    <AnomalyDetector data={analysisData.anomalies} />
                  )}
                </div>

                <AIInsightsPanel
                  mlWeights={analysisData.ml_weights}
                  rag={analysisData.rag_explanations}
                  topRisks={analysisData.top_risks}
                />

                <div className="max-w-7xl mx-auto px-6 mb-10 mt-10">
                   {analysisData.recommendations && (
                     <RecommendationsEngine recommendations={analysisData.recommendations} />
                   )}
                </div>

                <ExecutiveSummary text={analysisData.executive_summary} />
              </motion.div>
            )}
          </AnimatePresence>
          </>}
        </main>

        <Footer />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/simulate" element={<MainApp simulateOnly />} />
          <Route path="*" element={<MainApp />} />
        </Routes>
      </TooltipProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;
