import { afterEach, describe, expect, it } from "vitest";
import { getDashboardSummary } from "@/lib/services/dashboard";

const previousDriver = process.env.DATA_DRIVER;

afterEach(() => {
  if (previousDriver === undefined) delete process.env.DATA_DRIVER;
  else process.env.DATA_DRIVER = previousDriver;
});

describe("dashboard mock driver", () => {
  it("builds the overview without requiring DATABASE_URL", async () => {
    process.env.DATA_DRIVER = "mock";
    const summary = await getDashboardSummary();

    expect(summary.activeLeads).toBeGreaterThanOrEqual(0);
    expect(summary.tasksToday).toBeGreaterThanOrEqual(0);
    expect(summary.countsByStatus).toBeDefined();
    expect(Array.isArray(summary.needsAttention)).toBe(true);
  });
});
