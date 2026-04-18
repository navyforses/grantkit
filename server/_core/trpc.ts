import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

// Walk the cause chain to surface the root mysql2 / node error underneath
// Drizzle's DrizzleQueryError wrapper, so 500s are diagnosable from logs/response.
function extractCauseChain(err: unknown): Array<Record<string, unknown>> {
  const chain: Array<Record<string, unknown>> = [];
  let current: any = err;
  let depth = 0;
  while (current && depth < 6) {
    const node: Record<string, unknown> = {
      name: current?.constructor?.name ?? typeof current,
      message: typeof current?.message === "string" ? current.message.slice(0, 500) : undefined,
    };
    for (const k of ["code", "errno", "sqlState", "sqlMessage", "sql"]) {
      if (current?.[k] !== undefined) {
        const v = current[k];
        node[k] = typeof v === "string" ? v.slice(0, 300) : v;
      }
    }
    chain.push(node);
    if (!current.cause || current.cause === current) break;
    current = current.cause;
    depth++;
  }
  return chain;
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    try {
      console.error("[tRPC error]", {
        path: shape.data?.path,
        code: shape.data?.code,
        message: error.message,
        cause: extractCauseChain(error.cause ?? error),
      });
    } catch {
      // logging must never throw
    }
    return {
      ...shape,
      data: {
        ...shape.data,
        causeChain: extractCauseChain(error.cause ?? error),
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
