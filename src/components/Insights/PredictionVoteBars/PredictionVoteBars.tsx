import { formatPercent } from "../../../utils/predictions";
import "./PredictionVoteBars.css";

export interface VoteBar {
  id: string;
  name: string;
  // Share of predictors, 0-1.
  percent: number;
}

// Names with a thin bar filled to each one's share of predictors, label and
// percentage on one line above the bar.
const PredictionVoteBars = ({ bars }: { bars: VoteBar[] }) => (
  <ul className="vote-bars">
    {bars.map((bar) => (
      <li key={bar.id} className="vote-bar">
        <div className="vote-bar-label">
          <span className="vote-bar-name">{bar.name}</span>
          <span className="vote-bar-percent">{formatPercent(bar.percent)}</span>
        </div>
        <div
          className="vote-bar-track"
          role="meter"
          aria-label={`${bar.name}: ${formatPercent(bar.percent)}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(bar.percent * 100)}
        >
          <div className="vote-bar-fill" style={{ width: `${Math.min(100, bar.percent * 100)}%` }} />
        </div>
      </li>
    ))}
  </ul>
);

export default PredictionVoteBars;
