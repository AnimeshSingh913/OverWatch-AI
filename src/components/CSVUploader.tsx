import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, CheckCircle, AlertCircle, X, Database, Shield, Info, Copy, Check, ChevronDown, FileCode } from "lucide-react";

interface CSVUploaderProps {
  onDataLoaded: (data: any) => void;
  uploadRef: React.RefObject<HTMLDivElement>;
}

const REQUIRED_COLUMNS = [
  "date",
  "model_decision",
  "human_decision",
  "confidence_note",
];

export const CSVUploader = ({ onDataLoaded, uploadRef }: CSVUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyTemplate = () => {
    const csvString = `date,model_decision,human_decision,confidence_note,ground_truth,department
2024-01-01,approve,approve,Model correctly assessed repayment capacity,approve,Underwriting
2024-01-02,approve,reject,Overriding — applicant income appears overstated on documentation,reject,Underwriting
2024-01-03,reject,reject,AI correctly flagged prior default history,reject,Compliance`;

    navigator.clipboard.writeText(csvString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Upload CSV → Backend ──
  const uploadToBackend = async (file: File) => {
    setUploadState("loading");
    setProgress(0);
    setError(null);
    setFileName(file.name);

    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 12;
      setProgress(Math.min(current, 95));
    }, 120);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Use the environment variable if provided (for Vercel), otherwise fallback to local/relative
      const apiUrl = import.meta.env.VITE_API_URL 
        ? import.meta.env.VITE_API_URL
        : import.meta.env.DEV 
          ? "http://127.0.0.1:8000/analyze" 
          : "/analyze";

      const res = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || "Backend analysis failed");
      }

      const data = await res.json();

      clearInterval(interval);
      setProgress(100);
      setUploadState("success");

      setTimeout(() => {
        onDataLoaded(data);
      }, 600);

      // Auto-reset state back to idle after 4 seconds
      setTimeout(() => {
        reset();
      }, 4000);
    } catch (err: any) {
      clearInterval(interval);
      setError(err.message || "Failed to connect to backend. Is the server running?");
      setUploadState("error");
    }
  };

  // ── File Handling ──
  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a CSV file");
      setUploadState("error");
      return;
    }
    uploadToBackend(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const reset = () => {
    setUploadState("idle");
    setProgress(0);
    setError(null);
    setFileName(null);
  };

  const loadDemoData = (withGroundTruth: boolean) => {
    let csvContent = "";
    if (withGroundTruth) {
      csvContent =
`date,model_decision,human_decision,confidence_note,ground_truth,department
2024-01-01,approve,approve,Model correctly assessed repayment capacity,approve,Underwriting
2024-01-02,approve,reject,Overriding — applicant income appears overstated on documentation,reject,Underwriting
2024-01-03,reject,reject,AI correctly flagged prior default history,reject,Compliance
2024-01-04,approve,approve,Trusting model output — strong credit history confirmed,approve,Underwriting
2024-01-05,approve,reject,Model missed red flags in employment verification,reject,Fraud
2024-01-06,reject,approve,Using human judgment — loan purpose is legitimate and secured,approve,Underwriting
2024-01-07,approve,approve,Decision aligns with risk appetite guidelines,approve,Underwriting
2024-01-08,reject,reject,Model recommendation seems correct — debt-to-income too high,reject,Compliance
2024-01-09,approve,reject,Not fully convinced by AI — collateral valuation seems off,reject,Fraud
2024-01-10,approve,reject,Model seems wrong based on recent payment history pattern,reject,Underwriting
2024-01-11,reject,reject,Clear mismatch — applicant has active sanctions match,reject,Compliance
2024-01-12,approve,approve,AI assessment appears correct — strong income documentation,approve,Risk Management
2024-01-13,approve,reject,Manual review required — synthetic identity pattern detected,reject,Fraud
2024-01-14,reject,approve,Context mismatch — AI missed the secured asset backing this loan,approve,Underwriting
2024-01-15,approve,reject,Prefer human judgment — applicant is in a recent dispute,reject,Compliance
2024-01-16,approve,approve,Strong alignment — model and human both confident,approve,Underwriting
2024-01-17,reject,reject,Low confidence in applicant — correctly identified by model,reject,Risk Management
2024-01-18,approve,reject,Recommendation not aligned — recent bankruptcy in business history,reject,Fraud
2024-01-19,reject,approve,AI confidence seems low here — applicant recovered financially,approve,Underwriting
2024-01-20,approve,approve,Trusting model output for efficiency — straightforward profile,approve,Risk Management`;
    } else {
      csvContent =
`date,model_decision,human_decision,confidence_note,department
2024-01-01,approve,approve,Model correctly assessed repayment capacity,Underwriting
2024-01-02,approve,reject,Overriding — applicant income appears overstated on documentation,Underwriting
2024-01-03,reject,reject,AI correctly flagged prior default history,Compliance
2024-01-04,approve,approve,Trusting model output — strong credit history confirmed,Underwriting
2024-01-05,approve,reject,Model missed red flags in employment verification,Fraud
2024-01-06,reject,approve,Using human judgment — loan purpose is legitimate and secured,Underwriting
2024-01-07,approve,approve,Decision aligns with risk appetite guidelines,Underwriting
2024-01-08,reject,reject,Model recommendation seems correct — debt-to-income too high,Compliance
2024-01-09,approve,reject,Not fully convinced by AI — collateral valuation seems off,Fraud
2024-01-10,approve,reject,Model seems wrong based on recent payment history pattern,Underwriting
2024-01-11,reject,reject,Clear mismatch — applicant has active sanctions match,Compliance
2024-01-12,approve,approve,AI assessment appears correct — strong income documentation,Risk Management
2024-01-13,approve,reject,Manual review required — synthetic identity pattern detected,Fraud
2024-01-14,reject,approve,Context mismatch — AI missed the secured asset backing this loan,Underwriting
2024-01-15,approve,reject,Prefer human judgment — applicant is in a recent dispute,Compliance
2024-01-16,approve,approve,Strong alignment — model and human both confident,Underwriting
2024-01-17,reject,reject,Low confidence in applicant — correctly identified by model,Risk Management
2024-01-18,approve,reject,Recommendation not aligned — recent bankruptcy in business history,Fraud
2024-01-19,reject,approve,AI confidence seems low here — applicant recovered financially,Underwriting
2024-01-20,approve,approve,Trusting model output for efficiency — straightforward profile,Risk Management`;
    }

    const filename = withGroundTruth ? "overwatch_demo_ground_truth.csv" : "overwatch_demo_standard.csv";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const file = new File([blob], filename, { type: "text/csv" });
    uploadToBackend(file);
  };

  const loadInvalidDemoData = () => {
    // Generate a CSV that is missing the required columns (e.g. date)
    const csvContent = `incorrect_column1,incorrect_column2
value1,value2
value3,value4`;

    const filename = "overwatch_demo_invalid.csv";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const file = new File([blob], filename, { type: "text/csv" });
    uploadToBackend(file);
  };

  // ── UI ──
  return (
    <section ref={uploadRef} className="relative py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-white">
            Upload <span className="gradient-text">Underwriting Data</span>
          </h2>
          <p className="text-white/40 text-base max-w-xl mx-auto leading-relaxed">
            Drop a CSV of credit decisions or load a demo dataset
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="max-w-xl mx-auto"
        >
          {/* Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
              relative rounded-xl transition-all duration-200
              ${isDragging
                ? "border-indigo-light/50 shadow-glow-indigo"
                : "hover:border-white/12"
              }
              ${uploadState === "success" ? "border-emerald/30" : ""}
              ${uploadState === "error" ? "border-red/30" : ""}
            `}
            style={{
              background: isDragging
                ? "linear-gradient(145deg, rgba(99,102,241,0.1), rgba(99,102,241,0.03))"
                : "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              border: `1px solid ${
                isDragging ? "rgba(99,102,241,0.4)" :
                uploadState === "success" ? "rgba(34,197,94,0.3)" :
                uploadState === "error" ? "rgba(239,68,68,0.3)" :
                "rgba(255,255,255,0.06)"
              }`,
              padding: "3rem 2rem",
            }}
          >
            <AnimatePresence mode="wait">
              {uploadState === "idle" && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <div
                    className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-5"
                    style={{
                      background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(124,58,237,0.08))",
                    }}
                  >
                    <Upload className="w-6 h-6 text-indigo-light" />
                  </div>
                  <h3 className="text-base font-semibold mb-1.5 text-white">
                    Drop your CSV file here
                  </h3>
                  <p className="text-sm text-white/35 mb-5">
                    or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-wrap justify-center gap-2">
                    {REQUIRED_COLUMNS.map((c) => (
                      <span
                        key={c}
                        className="text-[11px] px-2.5 py-1 rounded-md text-white/30 font-mono"
                        style={{ background: "rgba(255,255,255,0.04)" }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {uploadState === "loading" && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <div
                    className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-5"
                    style={{
                      background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(124,58,237,0.08))",
                    }}
                  >
                    <FileText className="w-6 h-6 text-indigo-light animate-pulse" />
                  </div>
                  <h3 className="text-base font-semibold mb-1 text-white">
                    {fileName}
                  </h3>
                  <p className="text-sm text-white/35 mb-5">
                    Running ensemble analysis…
                  </p>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: `${progress}%` }}
                      className="h-full rounded-full"
                      style={{ background: "var(--gradient-brand)" }}
                    />
                  </div>
                  <p className="mt-2.5 text-xs text-white/30 font-mono tabular-nums">
                    {Math.round(progress)}%
                  </p>
                </motion.div>
              )}

              {uploadState === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-5"
                    style={{ background: "rgba(34,197,94,0.12)" }}
                  >
                    <CheckCircle className="w-6 h-6 text-emerald-bright" />
                  </div>
                  <h3 className="text-base font-semibold mb-1 text-emerald-bright">
                    Analysis Complete
                  </h3>
                  <p className="text-sm text-white/35 mb-4">
                    Scroll down for your dashboard
                  </p>
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    Upload Another File
                  </button>
                </motion.div>
              )}

              {uploadState === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-5"
                    style={{ background: "rgba(239,68,68,0.12)" }}
                  >
                    <AlertCircle className="w-6 h-6 text-red" />
                  </div>
                  <h3 className="text-base font-semibold mb-1 text-red">
                    Upload Failed
                  </h3>
                  <p className="text-sm text-white/35 mb-4">{error}</p>
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                    Try Again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Demo buttons */}
          {uploadState === "idle" && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="flex flex-wrap items-center justify-center gap-3 mt-6"
              >
                <button
                  onClick={() => loadDemoData(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-[13px] font-medium text-white/60 hover:text-white transition-all duration-200 flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <Database className="w-3.5 h-3.5" />
                  Standard Demo
                </button>
                <button
                  onClick={() => loadDemoData(true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-[13px] font-medium text-white/60 hover:text-white transition-all duration-200 flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <Shield className="w-3.5 h-3.5" />
                  Ground Truth Demo
                </button>
                <button
                  onClick={loadInvalidDemoData}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-[13px] font-medium text-white/60 hover:text-white transition-all duration-200 flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-red-dark" />
                  Invalid Demo
                </button>
              </motion.div>

              {/* CSV Format Guidelines Toggle */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="mt-6"
              >
                <button
                  onClick={() => setIsGuideOpen(!isGuideOpen)}
                  className="w-full py-3 px-4 rounded-xl flex items-center justify-between text-sm font-medium transition-all duration-200"
                  style={{
                    background: "linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                    <Info className="w-4 h-4 text-indigo-light" />
                    <span>CSV Data Format Guidelines</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-white/40 transition-transform duration-200 ${
                      isGuideOpen ? "rotate-180 text-indigo-light" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isGuideOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div
                        className="rounded-xl p-5 text-left border border-white/5 space-y-5"
                        style={{
                          background: "linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
                          backdropFilter: "blur(10px)",
                        }}
                      >
                        <div>
                          <h4 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-light" />
                            Required Columns
                          </h4>
                          <div className="grid grid-cols-1 gap-2.5">
                            {[
                              { name: "date", desc: "Date of the credit decision event (e.g. YYYY-MM-DD)", type: "Date" },
                              { name: "model_decision", desc: "The AI model's credit recommendation", type: "approve | reject" },
                              { name: "human_decision", desc: "The final decision made by the loan officer / underwriter", type: "approve | reject" },
                              { name: "confidence_note", desc: "Underwriter comments, reasoning, or override justification", type: "Text (String)" },
                            ].map((col) => (
                              <div key={col.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border border-white/5 bg-white/[0.01] gap-2">
                                <div className="flex items-center gap-2">
                                  <code className="text-xs text-indigo-light font-mono font-bold bg-indigo-light/10 px-2 py-0.5 rounded">
                                    {col.name}
                                  </code>
                                  <span className="text-[10px] text-white/40 font-mono">({col.type})</span>
                                </div>
                                <span className="text-xs text-white/50">{col.desc}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-bright" />
                            Optional Columns (Unlocks Advanced Analytics)
                          </h4>
                          <div className="grid grid-cols-1 gap-2.5">
                            {[
                              { name: "ground_truth", desc: "The verified correct outcome. Unlocks Accuracy, Justified/Unjustified Override, and Missed Override metrics.", type: "approve | reject" },
                              { name: "department", desc: "The team or desk tag. Unlocks Fairness Monitor & Department-wise Trust Score analysis.", type: "Underwriting | Fraud | Compliance | Risk Management" },
                            ].map((col) => (
                              <div key={col.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border border-white/5 bg-white/[0.01] gap-2">
                                <div className="flex items-center gap-2">
                                  <code className="text-xs text-emerald-bright font-mono font-bold bg-emerald-bright/10 px-2 py-0.5 rounded">
                                    {col.name}
                                  </code>
                                  <span className="text-[10px] text-white/40 font-mono">({col.type})</span>
                                </div>
                                <span className="text-xs text-white/50">{col.desc}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                              <FileCode className="w-4 h-4 text-indigo-light" />
                              Sample CSV Template
                            </h4>
                            <button
                              onClick={copyTemplate}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-white/60 hover:text-white border border-white/5 bg-white/[0.02] active:scale-95 transition-all duration-200"
                            >
                              {copied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-bright" />
                                  <span className="text-emerald-bright font-medium">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy CSV</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="text-xs text-white/60 font-mono p-3.5 rounded-lg bg-black/40 border border-white/5 overflow-x-auto whitespace-pre leading-relaxed select-all">
{`date,model_decision,human_decision,confidence_note,ground_truth,department
2024-01-01,approve,approve,Model correctly assessed repayment capacity,approve,Underwriting
2024-01-02,approve,reject,Overriding — applicant income appears overstated,reject,Underwriting
2024-01-03,reject,reject,AI correctly flagged prior default history,reject,Compliance`}
                          </pre>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
};
