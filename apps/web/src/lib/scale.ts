/**
 * The common scale of the active-survey small multiples (REQ-FE-032): the
 * smallest value of 10, 20, 25, 50, 100, 200, 250, 500, 1000 …
 * (1, 2, 2.5 and 5 × 10^k, k ≥ 1) that is greater than or equal to `largest`.
 */
export function commonScaleMax(largest: number): number {
  for (let magnitude = 10; ; magnitude *= 10) {
    for (const step of [1, 2, 2.5, 5]) {
      const value = step * magnitude;
      if (value >= largest) return value;
    }
  }
}
