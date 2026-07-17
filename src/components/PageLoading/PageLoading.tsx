// Full-page loading state — renders in place of a page's entire body
// (below the Navbar and page-header, if the page has one) while its data is
// still in flight, instead of letting a query's default-empty value
// (`data = []`/`null` before it resolves) render as if it were real empty
// data.
const PageLoading = () => (
  <div className="page-loading">
    <div className="loading-circle" />
  </div>
);

export default PageLoading;
