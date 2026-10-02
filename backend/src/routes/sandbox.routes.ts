import { Router, Request, Response } from 'express';
import { rateLimit } from '../middleware/auth';

export const sandboxRouter = Router();

// POST /api/sandbox/execute — honest code-preview endpoint.
//
// This does NOT compile or execute anything. It returns a fixed string that says
// so. There is therefore no code-execution risk here — the risk is that an
// unauthenticated endpoint reflected arbitrary request bodies, which is both an
// unauthenticated write path and an easy abuse vector. `requireAuth` (applied at
// the mount point in server.ts) plus a rate limit closes that.
sandboxRouter.post(
  '/execute',
  rateLimit(30),
  (req: Request, res: Response) => {
    const { code, language = 'cpp' } = req.body || {};

    if (!code) {
      return res.status(400).json({ error: 'code parameter required' });
    }

    // This is NOT a live judge: nothing is compiled or executed server-side.
    // We show a truthful preview so students never see fabricated test results.
    const output = `[${String(language).toUpperCase()} solution preview]\n\nThe code above is displayed for study. A live compiler is not wired in yet,\nso nothing was compiled, executed, or verified here.\n\nReview the solution in your own editor or on an online judge such as LeetCode to confirm it passes.`;

    res.json({
      status: 'success',
      exit_code: 0,
      language,
      execution_time_ms: 0,
      output,
    });
  }
);
