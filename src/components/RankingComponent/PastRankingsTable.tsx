import { type Elimination, type Ranking, type Season, type Show, type Week } from "../../utils/Constants";
import { buildPastRankingColumn } from "../../utils/util";
import ContestantIcon from "../ContestantIcon/ContestantIcon";
import './PastRankingsTable.css';

interface PastRankingsTableProps {
  weeks: Week[];
  rankings: Ranking[];
  eliminations: Elimination[];
  season: Season;
  show?: Show;
}

const PastRankingsTable = ({ weeks, rankings, eliminations, season, show }: PastRankingsTableProps) => {
  if (weeks.length === 0) return null;

  const columns = weeks.map((week) => {
    const ranking = rankings.find((r) => r.week_id === week.id);
    return {
      week,
      entries: ranking ? buildPastRankingColumn(ranking, week.weekNumber, eliminations, season.contestants) : [],
    };
  });

  const rowCount = season?.contestants?.length ?? 0;

  return (
    <div className="past-rankings-wrapper">
      <h2 className="past-rankings-heading">Past Rankings</h2>
      <div className="past-rankings-scroll">
        <table className="past-rankings-table">
          <thead>
            <tr>
              <th className="rank-header-cell">Rank</th>
              {columns.map(({ week }) => (
                <th key={week.id} className="week-header-cell">{week.weekNumber}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                <td className="rank-cell">{rowIndex + 1}</td>
                {columns.map(({ week, entries }) => {
                  const entry = entries[rowIndex];
                  return (
                    <td key={week.id} className="ranking-cell">
                      {entry && (
                        <ContestantIcon
                          name={entry.contestantId}
                          id={entry.contestantId}
                          isActive={false}
                          isEliminated={entry.eliminated}
                          season={season}
                          show={show}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PastRankingsTable;
