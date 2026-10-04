// Shared seed-question shape used by ./questions/*.ts
// [topic, difficulty, type, question, options, correctIndexes, explanation]
export type SeedDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type SeedQType = 'single_choice' | 'multiple_choice' | 'true_false';
export type SeedQ = [string, SeedDifficulty, SeedQType, string, string[], number[], string];
export type QuestionBank = Record<string, SeedQ[]>;
