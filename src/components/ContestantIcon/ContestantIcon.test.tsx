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

  it("shows a pending label for a finalist awaiting the finale's result", () => {
    const { container } = renderIcon({ placementPending: true });
    expect(container.querySelector(".contestant-icon")).toHaveClass("contestant-icon-pending");
    expect(screen.getByText("Pending")).toHaveClass("placement-label");
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

describe("ContestantIcon label fitting", () => {
  // jsdom has no layout, so fake each label's text width from its length.
  const fakeLayout = (iconWidth: number, pxPerChar: number) => {
    const scroll = vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (this: HTMLElement) {
      return (this.textContent?.length ?? 0) * pxPerChar;
    });
    const client = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(iconWidth);
    return () => { scroll.mockRestore(); client.mockRestore(); };
  };

  it("shrinks a label that is wider than the icon", () => {
    const restore = fakeLayout(40, 5);
    renderIcon({ name: "Guillermo Rodriguez" }); // 9 chars = 45px > 40px
    const label = screen.getByText("GUILLERMO");
    const scale = parseFloat(label.style.getPropertyValue("--label-scale"));
    restore();
    // The strip keeps the normal size's line height so it lines up with the others.
    expect(label.style.lineHeight).toBe("0.6rem");
    // 40/45, less a small safety margin
    expect(scale).toBeGreaterThan(0.8);
    expect(scale).toBeLessThan(40 / 45);
  });

  it("never shrinks below 70% however long the name", () => {
    const restore = fakeLayout(40, 5);
    renderIcon({ name: "Bartholomewsworthington Smith" }); // 22 chars = 110px
    const scale = parseFloat(screen.getByText("BARTHOLOMEWSWORTHINGTON").style.getPropertyValue("--label-scale"));
    restore();
    expect(scale).toBe(0.7);
  });

  it("leaves a label that fits at its normal size", () => {
    const restore = fakeLayout(40, 5);
    renderIcon({ name: "Ana Sani" });
    const scale = screen.getByText("ANA").style.getPropertyValue("--label-scale");
    restore();
    expect(scale).toBe("");
  });
});
