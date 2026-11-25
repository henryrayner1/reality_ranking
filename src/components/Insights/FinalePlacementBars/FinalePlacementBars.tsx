import { formatAveragePlacement, formatPercent } from "../../../utils/predictions";
import "./FinalePlacementBars.css";

export interface FinalePlacementBar {
  id: string;
  name: string;
  // 1-based position in the consensus order.
  position: number;
  averagePlacement: number | null;
  // Share of predictors (0-1) who put them 1st, 2nd, 3rd, 4th or lower.
  shares: [number, number, number, number];
}

const SEGMENTS = [
  { key: "first", label: "Winner" },
  { key: "second", label: "2nd" },
  { key: "third", label: "3rd" },
  { key: "rest", label: "4th+" },
] as const;

// A finale's consensus predicted order: each contestant's average predicted
// placement, and one bar split by how often they were picked for each spot.
const FinalePlacementBars = ({ bars }: { bars: FinalePlacementBar[] }) => (
  <div className="finale-bars-wrap">
    <ul className="finale-bars">
      {bars.map((bar) => {
        const summary = SEGMENTS.map((seg, i) => `${seg.label} ${formatPercent(bar.shares[i])}`).join(", ");
        return (
          <li key={bar.id} className="finale-bar">
            <div className="finale-bar-label">
              <span className="finale-bar-name">{bar.position}. {bar.name}</span>
              <span className="finale-bar-avg">
                {bar.averagePlacement === null ? "Not placed" : `avg ${formatAveragePlacement(bar.averagePlacement)}`}
              </span>
            </div>
            <div className="finale-bar-track" role="img" aria-label={`${bar.name}: ${summary}`} title={summary}>
              {SEGMENTS.map((seg, i) =>
                bar.shares[i] > 0 ? (
                  <div
                    key={seg.key}
                    className={`finale-bar-segment finale-bar-${seg.key}`}
                    style={{ width: `${Math.min(100, bar.shares[i] * 100)}%` }}
                  />
                ) : null
              )}
            </div>
          </li>
        );
      })}
    </ul>
    <ul className="finale-bars-legend" aria-hidden="true">
      {SEGMENTS.map((seg) => (
        <li key={seg.key}>
          <span className={`finale-bars-swatch finale-bar-${seg.key}`} />
          {seg.label}
        </li>
      ))}
    </ul>
  </div>
);

export default FinalePlacementBars;
