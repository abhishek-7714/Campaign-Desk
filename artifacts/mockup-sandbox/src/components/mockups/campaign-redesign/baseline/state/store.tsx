import { buildSeed } from '../domain/seed';
const seed = buildSeed();
export const useStore = () => ({ ...seed, search: '', openDialog: (_: unknown) => undefined });
