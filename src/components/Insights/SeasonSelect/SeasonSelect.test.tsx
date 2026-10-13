import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SeasonSelect from "./SeasonSelect";
import type { Season } from "../../../utils/Constants";

const makeSeason = (id: string, seasonNumber: number): Season => ({
  id,
  showId: "show1",
  isCurrent: false,
  contestants: [],
  seasonNumber,
});

describe("SeasonSelect", () => {
  it("renders nothing when the show has no seasons", () => {
    const { container } = render(<SeasonSelect seasons={[]} selectedSeasonId={null} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("still renders for a single-season show", () => {
    render(<SeasonSelect seasons={[makeSeason("a", 1)]} selectedSeasonId="a" currentSeasonId="a" onChange={() => {}} />);
    expect(screen.getByText("Season:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Season 1 (current)" })).toBeInTheDocument();
  });

  it("shows the selected season number", () => {
    const seasons = [makeSeason("a", 1), makeSeason("b", 2)];
    render(<SeasonSelect seasons={seasons} selectedSeasonId="b" onChange={() => {}} />);
    expect(screen.getByText("Season 2")).toBeInTheDocument();
  });

  it("marks the show's current season in the menu", async () => {
    const user = userEvent.setup();
    const seasons = [makeSeason("a", 1), makeSeason("b", 2)];
    render(<SeasonSelect seasons={seasons} selectedSeasonId="a" currentSeasonId="b" onChange={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Season 1" }));
    expect(await screen.findByText("Season 2 (current)")).toBeInTheDocument();
  });

  it("calls onChange with the clicked season's id", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const seasons = [makeSeason("a", 1), makeSeason("b", 2)];
    render(<SeasonSelect seasons={seasons} selectedSeasonId="a" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Season 1" }));
    await user.click(await screen.findByText("Season 2"));

    expect(onChange).toHaveBeenCalledWith("b");
  });
});
