import { render, screen } from "@testing-library/react";
import RankingCountdown from "./RankingCountdown";
import type { Episode } from "../../utils/Constants";

describe("RankingCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows 'no upcoming episodes' when there are none with an airDate", () => {
    render(<RankingCountdown episodes={[]} />);
    expect(screen.getByText("No upcoming episodes scheduled.")).toBeInTheDocument();
  });

  it("shows time until the episode airs when it hasn't aired yet", () => {
    const episodes: Episode[] = [
      { id: "e1", episodeNumber: 3, seasonId: "s1", airDate: "2026-01-01T02:00:00.000Z" },
    ];
    render(<RankingCountdown episodes={episodes} />);
    expect(screen.getByText(/Episode 3 airs in 2h 0m/)).toBeInTheDocument();
    expect(screen.getByText(/Ranking opens in 3h 0m/)).toBeInTheDocument();
  });

  it("only shows 'ranking opens in' once the episode has aired but ranking isn't open yet", () => {
    const episodes: Episode[] = [
      { id: "e1", episodeNumber: 3, seasonId: "s1", airDate: "2025-12-31T23:30:00.000Z" },
    ];
    render(<RankingCountdown episodes={episodes} />);
    expect(screen.queryByText(/airs in/)).not.toBeInTheDocument();
    expect(screen.getByText(/Ranking opens in 30m/)).toBeInTheDocument();
  });

  it("DAILY mode with no premiere date announced yet", () => {
    render(<RankingCountdown episodes={[]} rankingMode="DAILY" premiereDate={null} />);
    expect(screen.getByText("Season premiere date not yet announced.")).toBeInTheDocument();
  });

  it("DAILY mode counts down to the premiere before it airs", () => {
    render(<RankingCountdown episodes={[]} rankingMode="DAILY" premiereDate="2026-01-02T00:00:00.000Z" />);
    expect(screen.getByText(/Season premieres in 1d 0h/)).toBeInTheDocument();
  });

  it("DAILY mode counts down to the next daily reset once premiered", () => {
    render(<RankingCountdown episodes={[]} rankingMode="DAILY" premiereDate="2025-12-01T00:00:00.000Z" />);
    expect(screen.getByText(/Next ranking opens in/)).toBeInTheDocument();
  });
});
