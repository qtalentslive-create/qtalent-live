import { useState } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { TalentGrid } from "@/components/TalentGrid";
import { Footer } from "@/components/Footer";
import { useLocationDetection } from "@/hooks/useLocationDetection";
import PullToRefresh from "react-simple-pull-to-refresh";

const Index = () => {
  const { userLocation } = useLocationDetection();
  const [refreshKey, setRefreshKey] = useState(0);
  
  const handleRefresh = async () => {
    setRefreshKey(prev => prev + 1);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <div className="page-wrapper min-h-screen">
      <Header />
      <PullToRefresh onRefresh={handleRefresh}>
        <main className="main-content">
          <HeroSection />
          <TalentGrid key={refreshKey} />
        </main>
      </PullToRefresh>
      <Footer />
      {/* Native app sticky footer bar for safe area */}
      <div className="native-footer-bar" />
    </div>
  );
};

export default Index;
