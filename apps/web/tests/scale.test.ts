import { describe, expect, it } from "vitest";
import { commonScaleMax } from "@/lib/scale";

describe("commonScaleMax (REQ-FE-032)", () => {
  it("AC-FE-032-2: largest totals 7, 20, 120 and 0 give 10, 20, 200 and 10", () => {
    expect(commonScaleMax(7)).toBe(10);
    expect(commonScaleMax(20)).toBe(20);
    expect(commonScaleMax(120)).toBe(200);
    expect(commonScaleMax(0)).toBe(10);
  });

  it("REQ-FE-032: follows 1, 2, 2.5 and 5 × 10^k (k ≥ 1)", () => {
    const cases: [number, number][] = [
      [10, 10],
      [11, 20],
      [21, 25],
      [26, 50],
      [51, 100],
      [83, 100],
      [201, 250],
      [251, 500],
      [501, 1000],
      [2001, 2500],
      [4999, 5000],
      [5001, 10000],
    ];
    for (const [largest, scale] of cases) expect(commonScaleMax(largest), String(largest)).toBe(scale);
  });
});
