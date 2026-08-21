import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { describe, expect, it, vi } from "vitest";
import {
  generateToken,
  requireAuth,
  requireRole,
  requireSelfOrAdmin,
  type AuthRequest,
} from "./auth";

const JWT_SECRET = process.env.JWT_SECRET || "your-fallback-secret-key";

function createResponse() {
  const status = vi.fn();
  const json = vi.fn();
  const response = { status, json } as unknown as Response;
  status.mockReturnValue(response);
  return { response, status, json };
}

describe("authentication middleware", () => {
  it("rejects a token forged with the public fallback secret", () => {
    const token = jwt.sign(
      { id: 1, role: "SUPERUSER", department: "Administration" },
      "your-fallback-secret-key",
    );
    const request = {
      headers: { authorization: `Bearer ${token}` },
    } as Request;
    const { response, status } = createResponse();
    const next = vi.fn() as NextFunction;

    requireAuth(request as AuthRequest, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(401);
  });

  it("generates and accepts a token with a canonical role", () => {
    const token = generateToken({
      id: 7,
      role: "ADMIN",
      department: "Comptabilité",
    });
    const request = {
      headers: { authorization: `Bearer ${token}` },
    } as Request;
    const { response, status } = createResponse();
    const next = vi.fn() as NextFunction;

    requireAuth(request as AuthRequest, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(status).not.toHaveBeenCalled();
    expect((request as AuthRequest).user).toEqual({
      id: 7,
      role: "ADMIN",
      department: "Comptabilité",
    });
  });

  it("rejects a token containing a non-canonical role", () => {
    const token = jwt.sign(
      { id: 7, role: "admin", department: "Comptabilité" },
      JWT_SECRET,
    );
    const request = {
      headers: { authorization: `Bearer ${token}` },
    } as Request;
    const { response, status } = createResponse();
    const next = vi.fn() as NextFunction;

    requireAuth(request as AuthRequest, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(401);
  });

  it("allows only roles explicitly accepted by the route", () => {
    const middleware = requireRole("ADMIN", "SUPERUSER");
    const request = { user: { id: 3, role: "USER", department: "IT" } } as AuthRequest;
    const { response, status } = createResponse();
    const next = vi.fn() as NextFunction;

    middleware(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
  });

  it("allows an administrator to access another user's file listing", () => {
    const request = {
      user: { id: 2, role: "ADMIN", department: "IT" },
      params: { userId: "9" },
    } as unknown as AuthRequest;
    const { response, status } = createResponse();
    const next = vi.fn() as NextFunction;

    requireSelfOrAdmin(request, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(status).not.toHaveBeenCalled();
  });
});
