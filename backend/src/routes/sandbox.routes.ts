import { Router, Request, Response } from 'express';

export const sandboxRouter = Router();

// POST /api/sandbox/execute — honest code-preview endpoint (no fake compile/test claims)
sandboxRouter.post('/execute', (req: Request, res: Response) => {
  const { code, language = 'cpp' } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'code parameter required' });
  }

  // This is NOT a live judge: nothing is compiled or executed server-side.
  // We show a truthful preview so students never see fabricated test results.
  const output = `[${language.toUpperCase()} solution preview]\n\nThe code above is displayed for study. A live compiler is not wired in yet,\nso nothing was compiled, executed, or verified here.\n\nReview the solution in your own editor or on an online judge such as LeetCode to confirm it passes.`;

  res.json({
    status: 'success',
    exit_code: 0,
    language,
    execution_time_ms: 0,
    output
  });
});
