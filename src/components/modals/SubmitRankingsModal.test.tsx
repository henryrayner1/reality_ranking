import { render, screen, fireEvent } from "@testing-library/react";
import SubmitRankingsModal from "./SubmitRankingsModal";

// onSubmit's success/error transition is gated behind a real setTimeout(...,
// 1000) inside the component — rather than fighting fake-timer/microtask
// ordering around the intervening `await handleSubmit()`, just wait it out
// for real with a generous findBy timeout.
describe("SubmitRankingsModal", () => {
  it("shows a loading state then success after handleSubmit resolves", async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <SubmitRankingsModal displayFlag setDisplayFlag={() => {}} handleSubmit={handleSubmit} />
    );

    fireEvent.click(screen.getByText("Confirm"));
    expect(handleSubmit).toHaveBeenCalled();
    expect(container.querySelector(".loading-circle")).toBeInTheDocument();

    expect(
      await screen.findByText("Your rankings have been successfully submitted!", {}, { timeout: 2000 })
    ).toBeInTheDocument();
  }, 3000);

  it("shows an error state after handleSubmit rejects", async () => {
    const handleSubmit = vi.fn().mockRejectedValue(new Error("boom"));
    render(<SubmitRankingsModal displayFlag setDisplayFlag={() => {}} handleSubmit={handleSubmit} />);

    fireEvent.click(screen.getByText("Confirm"));

    expect(
      await screen.findByText(
        "Something went wrong submitting your rankings. Please try again.",
        {},
        { timeout: 2000 }
      )
    ).toBeInTheDocument();
  }, 3000);

  it("calls setDisplayFlag(false) on Cancel", () => {
    const setDisplayFlag = vi.fn();
    render(<SubmitRankingsModal displayFlag setDisplayFlag={setDisplayFlag} handleSubmit={vi.fn()} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(setDisplayFlag).toHaveBeenCalledWith(false);
  });
});
