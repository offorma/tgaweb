/**
 * Generic CRUD API route factory.
 * Reduces boilerplate — every content type gets the same:
 *  - GET (list all)
 *  - POST (create new, with Zod validation)
 *  - admin auth + role enforcement + rate limit + audit logging via adminHandler
 *  - Strict ID validation on every item route
 *
 * Security:
 *  - All schemas use .strict() (rejects unknown keys with 400)
 *  - Path-param IDs validated as cuid format before DB lookup
 *  - No user input ever reaches orderBy / select / include / model name
 *  - Prisma parameterizes all values — no SQL injection surface
 *  - Errors are caught centrally; raw Prisma errors never reach the client
 */

import { NextRequest, NextResponse } from "next/server";
import { adminHandler, parseJsonBody, isValidId } from "@/lib/admin-api";
import { invalidateCache } from "@/lib/content";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { z } from "zod";

type Delegate = {
  findMany: (args?: any) => Promise<any[]>;
  findUnique: (args: any) => Promise<any | null>;
  create: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
  count: (args?: any) => Promise<number>;
};

interface CrudConfig {
  model: keyof typeof db;
  schema: z.ZodType<any>;
  cacheKey: string;
  entityName: string;
  defaultOrderBy?: { order: "asc" } | Record<string, "asc" | "desc">;
  // Optional separate schema for updates (partial). Falls back to schema.partial().
  updateSchema?: z.ZodType<any>;
  // Required role to access these routes (default: ADMIN)
  requiredRole?: "ADMIN" | "EDITOR";
}

export function makeCrudRoutes(cfg: CrudConfig) {
  const delegate = db[cfg.model] as unknown as Delegate;
  const requiredRole = cfg.requiredRole ?? "ADMIN";

  // GET — list all (allowed for EDITOR since it's read-only)
  const GET = adminHandler(async () => {
    const items = await delegate.findMany({
      orderBy: cfg.defaultOrderBy ?? { order: "asc" },
    });
    return NextResponse.json({ items });
  }, { method: "GET", requiredRole: "EDITOR" });

  // POST — create
  const POST = adminHandler(async (req, user) => {
    const body = await parseJsonBody(req);
    const parsed = cfg.schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const created = await delegate.create({ data: parsed.data });
    invalidateCache(cfg.cacheKey);
    return NextResponse.json({ item: created }, { status: 201 });
  }, { method: "POST", requiredRole });

  return { GET, POST };
}

export function makeCrudItemRoutes(cfg: CrudConfig) {
  const delegate = db[cfg.model] as unknown as Delegate;
  const requiredRole = cfg.requiredRole ?? "ADMIN";
  const updateSchema = cfg.updateSchema ?? cfg.schema.partial();

  // GET — single by id
  const GET = adminHandler(async (req, user, ctx) => {
    const id = ctx.params?.id;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const item = await delegate.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item });
  }, { method: "GET", requiredRole: "EDITOR" });

  // PUT — update
  const PUT = adminHandler(async (req, user, ctx) => {
    const id = ctx.params?.id;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const rawBody = await parseJsonBody(req);
    // Strip DB-only fields the client sends back from the GET response
    const { id: _id, createdAt: _ca, updatedAt: _ua, ...body } = rawBody as Record<string, unknown>;
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const updated = await delegate.update({
      where: { id },
      data: parsed.data,
    });
    invalidateCache(cfg.cacheKey);
    return NextResponse.json({ item: updated });
  }, { method: "PUT", requiredRole });

  // DELETE
  const DELETE = adminHandler(async (req, user, ctx) => {
    const id = ctx.params?.id;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await delegate.delete({ where: { id } });
    invalidateCache(cfg.cacheKey);
    return NextResponse.json({ ok: true });
  }, { method: "DELETE", requiredRole });

  return { GET, PUT, DELETE };
}
