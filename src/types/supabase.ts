export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      videos: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          url_drive: string;
          scheduled_date: string | null;
          status: Database['public']['Enums']['video_status'];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          url_drive: string;
          scheduled_date?: string | null;
          status?: Database['public']['Enums']['video_status'];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          url_drive?: string;
          scheduled_date?: string | null;
          status?: Database['public']['Enums']['video_status'];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'videos_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      platforms: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          api_token: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          api_token?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          api_token?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'platforms_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      posts: {
        Row: {
          id: string;
          video_id: string;
          platform_id: string;
          status: Database['public']['Enums']['post_status'];
          posted_at: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          platform_id: string;
          status?: Database['public']['Enums']['post_status'];
          posted_at?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          video_id?: string;
          platform_id?: string;
          status?: Database['public']['Enums']['post_status'];
          posted_at?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'posts_platform_id_fkey';
            columns: ['platform_id'];
            referencedRelation: 'platforms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'posts_video_id_fkey';
            columns: ['video_id'];
            referencedRelation: 'videos';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      video_post_status: {
        Row: {
          video_id: string;
          title: string;
          video_status: Database['public']['Enums']['video_status'];
          posts: Json | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      video_status: 'draft' | 'scheduled' | 'pending' | 'processing' | 'posted' | 'failed';
      post_status: 'pending' | 'uploading' | 'posted' | 'failed';
    };
    CompositeTypes: Record<string, never>;
  };
}
