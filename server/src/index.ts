import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  loginInputSchema,
  createInkTypeInputSchema,
  updateInkTypeInputSchema,
  updateInkStockInputSchema,
  createUserInkAssignmentInputSchema,
  createInkRequestInputSchema,
  reviewInkRequestInputSchema
} from './schema';

// Import handlers
import { registerUser, loginUser, getCurrentUser } from './handlers/auth';
import { createInkType, getInkTypes, getInkTypeById, updateInkType, deleteInkType } from './handlers/ink_types';
import { getInkStockLevels, getInkStockByType, updateInkStock, getLowStockAlerts } from './handlers/ink_stock';
import { 
  createUserInkAssignment, 
  getAllUserInkAssignments, 
  getUserInkAssignments, 
  removeUserInkAssignment,
  updateUserInkAssignment 
} from './handlers/user_assignments';
import { 
  createInkRequest, 
  getAllInkRequests, 
  getUserInkRequests, 
  getPendingInkRequests,
  reviewInkRequest,
  getInkRequestById 
} from './handlers/ink_requests';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  register: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => registerUser(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  getCurrentUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getCurrentUser(input.userId)),

  // Ink type management routes (Admin only)
  createInkType: publicProcedure
    .input(createInkTypeInputSchema)
    .mutation(({ input }) => createInkType(input)),

  getInkTypes: publicProcedure
    .query(() => getInkTypes()),

  getInkTypeById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getInkTypeById(input.id)),

  updateInkType: publicProcedure
    .input(updateInkTypeInputSchema)
    .mutation(({ input }) => updateInkType(input)),

  deleteInkType: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteInkType(input.id)),

  // Stock management routes (Admin only)
  getInkStockLevels: publicProcedure
    .query(() => getInkStockLevels()),

  getInkStockByType: publicProcedure
    .input(z.object({ inkTypeId: z.number() }))
    .query(({ input }) => getInkStockByType(input.inkTypeId)),

  updateInkStock: publicProcedure
    .input(updateInkStockInputSchema)
    .mutation(({ input }) => updateInkStock(input)),

  getLowStockAlerts: publicProcedure
    .query(() => getLowStockAlerts()),

  // User ink assignment routes (Admin only)
  createUserInkAssignment: publicProcedure
    .input(createUserInkAssignmentInputSchema)
    .mutation(({ input }) => createUserInkAssignment(input)),

  getAllUserInkAssignments: publicProcedure
    .query(() => getAllUserInkAssignments()),

  getUserInkAssignments: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserInkAssignments(input.userId)),

  removeUserInkAssignment: publicProcedure
    .input(z.object({ assignmentId: z.number() }))
    .mutation(({ input }) => removeUserInkAssignment(input.assignmentId)),

  updateUserInkAssignment: publicProcedure
    .input(z.object({ assignmentId: z.number(), maxQuantity: z.number().int().positive() }))
    .mutation(({ input }) => updateUserInkAssignment(input.assignmentId, input.maxQuantity)),

  // Ink request routes
  createInkRequest: publicProcedure
    .input(z.object({ userId: z.number() }).merge(createInkRequestInputSchema))
    .mutation(({ input }) => {
      const { userId, ...requestInput } = input;
      return createInkRequest(userId, requestInput);
    }),

  getAllInkRequests: publicProcedure
    .query(() => getAllInkRequests()),

  getUserInkRequests: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserInkRequests(input.userId)),

  getPendingInkRequests: publicProcedure
    .query(() => getPendingInkRequests()),

  reviewInkRequest: publicProcedure
    .input(z.object({ adminId: z.number() }).merge(reviewInkRequestInputSchema))
    .mutation(({ input }) => {
      const { adminId, ...reviewInput } = input;
      return reviewInkRequest(adminId, reviewInput);
    }),

  getInkRequestById: publicProcedure
    .input(z.object({ requestId: z.number() }))
    .query(({ input }) => getInkRequestById(input.requestId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();