import { expect, test } from "bun:test";
import * as providers from "../src/lib/tauri";

test("only the verified OP.GG tier provider is selectable", () => {
  expect(providers.isProviderAvailable?.("opgg")).toBe(true);
  for (const id of ["ugg", "dpmlol", "lolalytics", "metasrc", "merakicdn", "unknown"]) {
    expect(providers.isProviderAvailable?.(id)).toBe(false);
  }
});
