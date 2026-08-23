import { describe, expect, it } from "vitest";
import { classifyLoginError } from "./AuthContext";

describe("login error classification", () => {
  it("identifies an unreachable server", () => {
    expect(classifyLoginError(new TypeError("Failed to fetch")).reason).toBe("network");
  });

  it("identifies rejected credentials without exposing account details", () => {
    expect(classifyLoginError(new Error('401: {"message":"Invalid credentials"}')).reason).toBe(
      "invalidCredentials",
    );
  });

  it("keeps other HTTP errors generic", () => {
    expect(classifyLoginError(new Error('500: {"message":"Internal error"}')).reason).toBe(
      "unexpected",
    );
  });

  it("keeps unknown failures generic", () => {
    expect(classifyLoginError({ status: 401 }).reason).toBe("unexpected");
  });
});
