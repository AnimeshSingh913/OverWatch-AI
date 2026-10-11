import { useState, useRef } from "react";
import { HeroSection } from "@/components/HeroSection";
import { CSVUploader, TrustData } from "@/components/CSVUploader";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import { ExecutiveSummary } from "@/components/ExecutiveSummary";
import { HowItWorks } from "@/components/HowItWorks";
import { Capabilities } from "@/components/Capabilities";
import { ProductStory } from "@/components/ProductStory";
import { EthicsGovernance } from "@/components/EthicsGovernance";
import { Footer } from "@/components/Footer";

const Index = () => {
  const [data, setData] = useState<TrustData[] | null>(null);
  const uploadRef = useRef<HTMLDivElement>(null);

  const scrollToUpload = () => {
    uploadRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <HeroSection onUploadClick={scrollToUpload} />
      
      {/* How It Works */}
      <HowItWorks />
      
      {/* CSV Uploader */}
      <CSVUploader onDataLoaded={setData} uploadRef={uploadRef} />
      
      {/* Analytics Dashboard - shown after data upload */}
      {data && (
        <>
          <AnalyticsDashboard data={data} />
          <AIInsightsPanel data={data} />
          <ExecutiveSummary data={data} />
        </>
      )}
      
      {/* Capabilities */}
      <Capabilities />
      
      {/* Product Story */}
      <ProductStory />
      
      {/* Ethics & Governance */}
      <EthicsGovernance />
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
