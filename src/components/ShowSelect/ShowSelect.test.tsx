import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ShowSelect from "./ShowSelect";
import type { Show } from "../../utils/Constants";

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
});
