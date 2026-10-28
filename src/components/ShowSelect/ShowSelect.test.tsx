import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ShowSelect from "./ShowSelect";
import type { Season, Show } from "../../utils/Constants";

const shows: Show[] = [
  { id: "s1", name: "Drag Race", currSeason: 1 },
  { id: "s2", name: "Survivor", currSeason: 3 },
];

describe("ShowSelect", () => {
  it("shows the current show's name in the toggle", () => {
    render(<ShowSelect shows={shows} currShowId="s2" onSelectShow={() => {}} />);
    expect(screen.getByText("Survivor")).toBeInTheDocument();
  });

  it("shows a placeholder when no show is selected", () => {
    render(<ShowSelect shows={shows} onSelectShow={() => {}} />);
    expect(screen.getByText("Select a Show")).toBeInTheDocument();
  });

  it("lists every show and calls onSelectShow with its id when clicked", async () => {
    const user = userEvent.setup();
    const onSelectShow = vi.fn();
    render(<ShowSelect shows={shows} currShowId="s1" onSelectShow={onSelectShow} />);

    await user.click(screen.getByRole("button", { name: "Drag Race" }));
    const item = await screen.findByText("Survivor", { selector: "a" });
    await user.click(item);

    expect(onSelectShow).toHaveBeenCalledWith("s2");
  });

  it("lists shows alphabetically regardless of the order they're passed in", async () => {
    const user = userEvent.setup();
    const unsorted: Show[] = [
      { id: "a", name: "Survivor", currSeason: 1 },
      { id: "b", name: "Big Brother", currSeason: 1 },
      { id: "c", name: "Drag Race", currSeason: 1 },
    ];
    render(<ShowSelect shows={unsorted} onSelectShow={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Select a Show" }));
    const items = await screen.findAllByRole("button", { name: /Survivor|Big Brother|Drag Race/ });
    expect(items.map((el) => el.textContent)).toEqual(["Big Brother", "Drag Race", "Survivor"]);
  });

  it("lists currently airing shows first, then the rest, each alphabetically", async () => {
    const user = userEvent.setup();
    const season = (endDate: string | null) => [{ id: "x", showId: "x", isCurrent: true, seasonNumber: 1, contestants: [], endDate } as Season];
    const grouped: Show[] = [
      { id: "a", name: "Survivor", currSeason: 1, seasons: season(null) },
      { id: "b", name: "Big Brother", currSeason: 1, seasons: season("2020-01-01T00:00:00.000Z") },
      { id: "c", name: "Amazing Race", currSeason: 1, seasons: season(null) },
      { id: "d", name: "All Stars", currSeason: 1, seasons: season("2020-01-01T00:00:00.000Z") },
    ];
    render(<ShowSelect shows={grouped} onSelectShow={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Select a Show" }));
    const namesIn = (group: string) =>
      Array.from(screen.getByRole("group", { name: group }).querySelectorAll(".dropdown-item")).map((el) => el.textContent);
    expect(namesIn("Currently airing")).toEqual(["Amazing Race", "Survivor"]);
    expect(namesIn("Not currently airing")).toEqual(["All Stars", "Big Brother"]);
    // Airing group comes first in the menu.
    const headers = screen.getAllByText(/currently airing/i).map((el) => el.textContent);
    expect(headers).toEqual(["Currently airing", "Not currently airing"]);
  });
});
