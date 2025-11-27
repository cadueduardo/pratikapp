import type { PostgrestError } from '@supabase/supabase-js';

import { SupabaseRepositoryError } from './types';

export const ensureNoError = (error: PostgrestError | null, message: string) => {
  if (error) {
    throw new SupabaseRepositoryError(message, error);
  }
};

export const assertData = <T>(data: T | null, error: PostgrestError | null, message: string): T => {
  ensureNoError(error, message);
  if (data === null) {
    throw new SupabaseRepositoryError(message);
  }
  return data;
};
