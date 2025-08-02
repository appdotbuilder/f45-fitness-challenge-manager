
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Schema imports
import { 
  createUserInputSchema, 
  updateUserInputSchema,
  createCompetitionInputSchema,
  updateCompetitionInputSchema,
  createCompetitionEntryInputSchema,
  updateCompetitionEntryInputSchema,
  loginInputSchema
} from './schema';

// Handler imports
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { updateUser } from './handlers/update_user';
import { createCompetition } from './handlers/create_competition';
import { getCompetitions } from './handlers/get_competitions';
import { updateCompetition } from './handlers/update_competition';
import { deleteCompetition } from './handlers/delete_competition';
import { createCompetitionEntry } from './handlers/create_competition_entry';
import { getCompetitionEntries } from './handlers/get_competition_entries';
import { updateCompetitionEntry } from './handlers/update_competition_entry';
import { getUserStats } from './handlers/get_user_stats';
import { getAuditLogs } from './handlers/get_audit_logs';
import { impersonateUser } from './handlers/impersonate_user';
import { authenticateUser } from './handlers/authenticate_user';

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

  // Authentication
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => authenticateUser(input)),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUsers: publicProcedure
    .query(() => getUsers()),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Competition management
  createCompetition: publicProcedure
    .input(createCompetitionInputSchema)
    .mutation(({ input }) => createCompetition(input, 1)), // TODO: Get actual user ID from context

  getCompetitions: publicProcedure
    .query(() => getCompetitions()),

  updateCompetition: publicProcedure
    .input(updateCompetitionInputSchema)
    .mutation(({ input }) => updateCompetition(input, 1, 'administrator')), // TODO: Get actual user context

  deleteCompetition: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteCompetition(input.id, 1)), // TODO: Get actual user ID

  // Competition entries
  createCompetitionEntry: publicProcedure
    .input(createCompetitionEntryInputSchema)
    .mutation(({ input }) => createCompetitionEntry(input, 1)), // TODO: Get actual user ID

  getCompetitionEntries: publicProcedure
    .input(z.object({ competitionId: z.number() }))
    .query(({ input }) => getCompetitionEntries(input.competitionId)),

  updateCompetitionEntry: publicProcedure
    .input(updateCompetitionEntryInputSchema)
    .mutation(({ input }) => updateCompetitionEntry(input, 1, 'member')), // TODO: Get actual user context

  // User statistics
  getUserStats: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserStats(input.userId, 1, 'member')), // TODO: Get actual requesting user context

  // Admin functions
  getAuditLogs: publicProcedure
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
    .query(({ input }) => getAuditLogs(input.limit, input.offset)),

  impersonateUser: publicProcedure
    .input(z.object({ targetUserId: z.number() }))
    .mutation(({ input }) => impersonateUser(input.targetUserId, 1)), // TODO: Get actual admin user ID
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
