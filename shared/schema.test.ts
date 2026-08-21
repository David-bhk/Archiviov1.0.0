import { describe, expect, it } from "vitest";
import { accessLevelSchema } from "./schema";

describe("accessLevelSchema", () => {
  it.each([1, 2, 3, 4])("accepts classification level %i", (level) => {
    expect(accessLevelSchema.parse(level)).toBe(level);
  });

  it.each([0, 5, 1.5])("rejects invalid classification level %s", (level) => {
    expect(accessLevelSchema.safeParse(level).success).toBe(false);
  });
});
