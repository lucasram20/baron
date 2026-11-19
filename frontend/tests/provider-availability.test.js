import { expect, test } from "bun:test";
import * as providers from "../src/lib/tauri";

test("only verified live tier-list providers (OP.GG, U.GG, LoLalytics) are selectable", () => {
  for (const id of ["opgg", "ugg", "lolalytics"]) {
    expect(providers.isProviderAvailable?.(id)).toBe(true);
  }
  for (const id of ["dpmlol", "metasrc", "merakicdn", "unknown"]) {
    expect(providers.isProviderAvailable?.(id)).toBe(false);
  }
});
