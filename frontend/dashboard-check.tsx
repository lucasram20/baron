import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { DashboardView } from "./src/components/views/SecondaryViews";

const html = renderToStaticMarkup(
  <DashboardView ddVersion="16.22.1" patch="16.22" onNavigate={() => {}} />,
);
assert.match(html, /Sample dashboard data/);
assert.equal((html.match(/aria-label="Open sample post-game"/g) ?? []).length, 1);
