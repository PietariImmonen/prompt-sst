// Generated Supabase database types

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      prompts: {
        Row: {
          id: string
          user_id: string
          content: string
          title: string | null
          category: string | null
          subcategory: string | null
          tags: string[] | null
          source: string
          url: string | null
          is_public: boolean
          usage_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          title?: string | null
          category?: string | null
          subcategory?: string | null
          tags?: string[] | null
          source: string
          url?: string | null
          is_public?: boolean
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          title?: string | null
          category?: string | null
          subcategory?: string | null
          tags?: string[] | null
          source?: string
          url?: string | null
          is_public?: boolean
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          parent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          parent_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          parent_id?: string | null
          created_at?: string
        }
      }
      shared_prompts: {
        Row: {
          id: string
          prompt_id: string
          shared_by: string
          share_count: number
          created_at: string
        }
        Insert: {
          id?: string
          prompt_id: string
          shared_by: string
          share_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          prompt_id?: string
          shared_by?: string
          share_count?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
