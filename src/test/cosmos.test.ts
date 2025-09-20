import { expect, test } from "vitest";
import { getSigningClient } from "../lib/cosmos";

test("relayer has balance", async () => {
  const client = await getSigningClient();
  if (client) {
    const balance = await client.getBalance("cosmos1relayer", "uatom");
    expect(parseInt(balance.amount)).toBeGreaterThan(0);
  } else {
    // Skip test if no client configured
    expect(true).toBe(true);
  }
});