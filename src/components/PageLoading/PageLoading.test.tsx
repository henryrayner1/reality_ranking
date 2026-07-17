import { render } from "@testing-library/react";
import PageLoading from "./PageLoading";

describe("PageLoading", () => {
  it("renders a loading circle", () => {
    const { container } = render(<PageLoading />);
    expect(container.querySelector(".page-loading")).toBeInTheDocument();
    expect(container.querySelector(".loading-circle")).toBeInTheDocument();
  });
});
