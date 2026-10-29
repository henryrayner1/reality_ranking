import { render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import ContestantIcon from "./ContestantIcon";
import type { Season } from "../../utils/Constants";

const season: Season = {
  id: "s1",
  showId: "show1",
  isCurrent: true,
  contestants: [],
  seasonNumber: 2,
};

const renderIcon = (props: Partial<React.ComponentProps<typeof ContestantIcon>> = {}) =>
  render(
    <DndContext>
      <SortableContext items={["c1"]}>
        <ContestantIcon id="c1" name="Jane Doe" season={season} photoUrl="/uploads/foo/photo.png" {...props} />
      </SortableContext>
    </DndContext>
  );

describe("ContestantIcon", () => {
  it("renders the uppercased first-word name", () => {
    renderIcon();
    expect(screen.getByText("JANE")).toBeInTheDocument();
  });

  it("shows the first two words when the season roster marks the first name as having a space", () => {
    const flaggedSeason: Season = {
      ...season,
      contestants: [{ id: "c1", name: "Thien An Nguyen", seasonId: "s1", firstNameHasSpace: true }],
    };
    renderIcon({ name: "Thien An Nguyen", season: flaggedSeason });
    expect(screen.getByText("THIEN AN")).toBeInTheDocument();
  });

  it("builds the image src from an explicit photoUrl", () => {
    renderIcon({ photoUrl: "/uploads/foo/photo.png" });
    const img = screen.getByAltText("Jane Doe") as HTMLImageElement;
    expect(img.src).toContain("/uploads/foo/photo.png");
  });

  it("falls back to a computed path from show/season/name when no photoUrl is set", () => {
    renderIcon({ photoUrl: undefined, show: { id: "show1", name: "Drag Race", currSeason: 2 } });
    const img = screen.getByAltText("Jane Doe") as HTMLImageElement;
    expect(img.src).toContain("/uploads/drag-race/season_2/contestants/jane_doe.png");
  });

  it("applies grayscale filter when eliminated", () => {
    renderIcon({ isEliminated: true });
    const img = screen.getByAltText("Jane Doe") as HTMLImageElement;
    expect(img.style.filter).toBe("grayscale(100%)");
  });

  it("applies reduced opacity when dimmed", () => {
    renderIcon({ dimmed: true });
    const img = screen.getByAltText("Jane Doe") as HTMLImageElement;
    expect(img.style.opacity).toBe("0.25");
  });

  it("shows a medal border class and label for a placed finalist", () => {
    const { container } = renderIcon({ placement: 1 });
    expect(container.querySelector(".contestant-icon")).toHaveClass("contestant-icon-placed", "placement-gold");
    expect(screen.getByText("Winner")).toHaveClass("placement-label");
  });

  it("uses bronze for 3rd and the purple tier below that", () => {
    const { container, rerender } = renderIcon({ placement: 3 });
    expect(container.querySelector(".contestant-icon")).toHaveClass("placement-bronze");
    rerender(
      <DndContext>
        <SortableContext items={["c1"]}>
          <ContestantIcon id="c1" name="Jane Doe" season={season} placement={5} />
        </SortableContext>
      </DndContext>
    );
    expect(container.querySelector(".contestant-icon")).toHaveClass("placement-other");
    expect(screen.getByText("5th")).toBeInTheDocument();
  });

  it("has no placement label for an ordinary contestant", () => {
    const { container } = renderIcon();
    expect(container.querySelector(".placement-label")).not.toBeInTheDocument();
  });

  it("renders without crashing when neither photoUrl nor show is set", () => {
    renderIcon({ photoUrl: undefined, show: undefined });
    const img = screen.getByAltText("Jane Doe") as HTMLImageElement;
    expect(img.getAttribute("src")).toBeNull();
  });
});
