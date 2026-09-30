import { LandingHero } from "./LandingHero";
import { ThreatTicker } from "./ThreatTicker";
import { StatsBar } from "./StatsBar";
import { PipelineSection } from "./PipelineSection";
import { FeatureGroups } from "./FeatureGroups";
import { TreeVisual } from "./TreeVisual";
import { ComparisonTable } from "./ComparisonTable";
import { HistoryPreview } from "./HistoryPreview";
import { CliProof } from "./CliProof";
import { TiersTeaser } from "./TiersTeaser";
import { FinalCta } from "./FinalCta";

/* Landing page assembly (marketing only — the scanner lives on its
   own full page). Page-level order: HERO → TICKER → STATS →
   PIPELINE → DETAIL (features, tree, comparison, history, CLI,
   tiers) → FINAL VERDICT. Sections spaced --s7 (48px) apart. */

interface Props {
  onRunScan: () => void;
}

export function LandingPage({ onRunScan }: Props) {
  return (
    <div>
      {/* HERO */}
      <LandingHero onRunScan={onRunScan} />
      <div style={{ height: "32px" }} />

      {/* ADVISORY TICKER */}
      <ThreatTicker />
      <div style={{ height: "48px" }} />

      {/* STATS */}
      <StatsBar />
      <div style={{ height: "48px" }} />

      {/* PIPELINE */}
      <PipelineSection />
      <div style={{ height: "48px" }} />

      {/* DETAIL */}
      <FeatureGroups />
      <div style={{ height: "48px" }} />
      <TreeVisual />
      <div style={{ height: "48px" }} />
      <ComparisonTable />
      <div style={{ height: "48px" }} />
      <HistoryPreview />
      <div style={{ height: "48px" }} />
      <CliProof />
      <div style={{ height: "48px" }} />
      <TiersTeaser />
      <div style={{ height: "48px" }} />

      {/* FINAL VERDICT */}
      <FinalCta onRunScan={onRunScan} />
    </div>
  );
}
