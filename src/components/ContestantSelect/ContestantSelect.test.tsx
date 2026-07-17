import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContestantSelect from "./ContestantSelect";
import type { Contestant } from "../../utils/Constants";

const contestants: Contestant[] = [
  { id: "c1", name: "Zed Zephyr", seasonId: "s1" },
  { id: "c2", name: "Amy Adams", seasonId: "s1" },
];

describe("ContestantSelect", () => {
  it("defaults the toggle to 'All Contestants' when nothing is selected", () => {
    render(<ContestantSelect contestants={contestants} selectedContestantId={null} onChange={() => {}} />);
    expect(screen.getByText("All Contestants")).toBeInTheDocument();
  });

  it("shows the selected contestant's first name", () => {
    render(<ContestantSelect contestants={contestants} selectedContestantId="c1" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Zed" })).toBeInTheDocument();
  });

  it("lists contestants alphabetically by name", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ContestantSelect contestants={contestants} selectedContestantId={null} onChange={() => {}} />
    );
    await user.click(screen.getByRole("button", { name: "All Contestants" }));
    await screen.findByText("Amy");
    const items = container.querySelectorAll(".dropdown-item");
    const labels = Array.from(items).map((el) => el.textContent);
    expect(labels).toEqual(["All Contestants", "Amy", "Zed"]);
  });

  it("calls onChange(null) when 'All Contestants' is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ContestantSelect contestants={contestants} selectedContestantId="c1" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Zed" }));
    await user.click(await screen.findByText("All Contestants"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("calls onChange with the clicked contestant's id", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ContestantSelect contestants={contestants} selectedContestantId={null} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "All Contestants" }));
    await user.click(await screen.findByText("Amy"));
    expect(onChange).toHaveBeenCalledWith("c2");
  });
});
