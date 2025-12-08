import type { PostgrestError } from '@supabase/supabase-js';

export type VideoStatus = 'draft' | 'scheduled' | 'pending' | 'processing' | 'posted' | 'failed';

export type PostStatus = 'pending' | 'uploading' | 'posted' | 'failed';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  aiContext: string | null;
  aiAutoGenerate: boolean;
  geminiApiKey: string | null;
  openaiApiKey: string | null;
  createdAt: string;
}

export interface NewUser {
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface UpdateUser {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  aiContext?: string | null;
  aiAutoGenerate?: boolean;
  geminiApiKey?: string | null;
  openaiApiKey?: string | null;
}

export interface Video {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  urlDrive: string;
  scheduledDate: string | null;
  status: VideoStatus;
  selectedPlatformIds?: string[] | null; // IDs das plataformas selecionadas para publicação
  mediaType?: string | null; // Tipo de mídia principal (ex: instagram-reels, youtube-shorts)
  platformMediaTypes?: Record<string, string> | null; // Mapeamento de tipo de mídia por plataforma (ex: {youtube: "youtube-shorts", instagram: "instagram-reels"})
  platformHashtags?: Record<string, string[]> | null; // Hashtags por plataforma (ex: {tiktok: ["#tag1"], "youtube": ["#tag2"]})
  createdAt: string;
  updatedAt: string;
}

export interface NewVideo {
  userId: string;
  title: string;
  description?: string | null;
  urlDrive: string;
  scheduledDate?: string | null;
  status?: VideoStatus;
  selectedPlatformIds?: string[] | null;
  mediaType?: string | null;
  platformMediaTypes?: Record<string, string> | null;
  platformHashtags?: Record<string, string[]> | null;
}

export interface UpdateVideo {
  title?: string;
  description?: string | null;
  urlDrive?: string;
  scheduledDate?: string | null;
  status?: VideoStatus;
  selectedPlatformIds?: string[] | null;
  mediaType?: string | null;
  platformMediaTypes?: Record<string, string> | null;
  platformHashtags?: Record<string, string[]> | null;
}

export interface Platform {
  id: string;
  userId: string;
  name: string;
  apiToken: string | null;
  createdAt: string;
}

export interface NewPlatform {
  userId: string;
  name: string;
  apiToken?: string | null;
}

export interface UpdatePlatform {
  name?: string;
  apiToken?: string | null;
}

export interface Post {
  id: string;
  videoId: string;
  platformId: string;
  status: PostStatus;
  postedAt: string | null;
  errorMessage: string | null;
  platformVideoId: string | null; // ID do vídeo na plataforma (ex: TikTok publish_id, YouTube video_id)
  createdAt: string;
}

export interface NewPost {
  videoId: string;
  platformId: string;
  status?: PostStatus;
  postedAt?: string | null;
  errorMessage?: string | null;
  platformVideoId?: string | null;
}

export interface UpdatePost {
  status?: PostStatus;
  postedAt?: string | null;
  errorMessage?: string | null;
  platformVideoId?: string | null;
}

export class SupabaseRepositoryError extends Error {
  public readonly cause?: PostgrestError;

  constructor(message: string, cause?: PostgrestError) {
    super(message);
    this.name = 'SupabaseRepositoryError';
    this.cause = cause;
  }
}

export interface UserHashtag {
  id: string;
  userId: string;
  hashtag: string;
  useCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewUserHashtag {
  userId: string;
  hashtag: string;
}

export interface UpdateUserHashtag {
  hashtag?: string;
  useCount?: number;
}

export interface AIGenerationHistory {
  id: string;
  userId: string;
  prompt: string;
  geminiResult: {
    title: string;
    description: string;
    hashtags: string[];
  } | null;
  openaiResult: {
    title: string;
    description: string;
    hashtags: string[];
  } | null;
  chosenProvider: 'gemini' | 'openai' | null;
  chosenResult: {
    title: string;
    description: string;
    hashtags: string[];
  } | null;
  createdAt: string;
}

export interface NewAIGenerationHistory {
  userId: string;
  prompt: string;
  geminiResult?: {
    title: string;
    description: string;
    hashtags: string[];
  } | null;
  openaiResult?: {
    title: string;
    description: string;
    hashtags: string[];
  } | null;
}

export interface UpdateAIGenerationHistory {
  chosenProvider?: 'gemini' | 'openai' | null;
  chosenResult?: {
    title: string;
    description: string;
    hashtags: string[];
  } | null;
}

export type RepositoryResult<T> = Promise<T>;
