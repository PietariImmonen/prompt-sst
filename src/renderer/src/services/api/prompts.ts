import { supabase } from '../supabase/client'
import type { Prompt, SearchFilters, SavePromptPayload } from '../../types'
import { sanitizePromptContent, generatePromptTitle } from '../../../../shared/utils'

export class PromptsService {
  /**
   * Save a new prompt
   */
  static async savePrompt(payload: SavePromptPayload): Promise<Prompt> {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not authenticated')
      }

      const sanitizedContent = sanitizePromptContent(payload.content)
      const title = generatePromptTitle(sanitizedContent)

      const { data, error } = await supabase
        .from('prompts')
        .insert({
          user_id: user.id,
          content: sanitizedContent,
          title,
          source: payload.source,
          url: payload.url,
          created_at: payload.timestamp.toISOString()
        } as any)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return data as Prompt
    } catch (error) {
      console.error('Save prompt error:', error)
      throw error
    }
  }

  /**
   * Get all prompts for current user
   */
  static async getAllPrompts(): Promise<Prompt[]> {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      return data as Prompt[]
    } catch (error) {
      console.error('Get all prompts error:', error)
      throw error
    }
  }

  /**
   * Get prompt by ID
   */
  static async getPromptById(id: string): Promise<Prompt | null> {
    try {
      const { data, error } = await supabase.from('prompts').select('*').eq('id', id).single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No rows returned
        }
        throw new Error(error.message)
      }

      return data as Prompt
    } catch (error) {
      console.error('Get prompt by ID error:', error)
      throw error
    }
  }

  /**
   * Update prompt
   */
  static async updatePrompt(id: string, updates: Partial<Prompt>): Promise<Prompt> {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return data as Prompt
    } catch (error) {
      console.error('Update prompt error:', error)
      throw error
    }
  }

  /**
   * Delete prompt
   */
  static async deletePrompt(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('prompts').delete().eq('id', id)

      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('Delete prompt error:', error)
      throw error
    }
  }

  /**
   * Search prompts
   */
  static async searchPrompts(filters: SearchFilters): Promise<Prompt[]> {
    try {
      let query = supabase.from('prompts').select('*')

      // Apply filters
      if (filters.query) {
        query = query.or(`content.ilike.%${filters.query}%,title.ilike.%${filters.query}%`)
      }

      if (filters.category) {
        query = query.eq('category', filters.category)
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags)
      }

      // Apply sorting
      switch (filters.sortBy) {
        case 'recent':
          query = query.order('created_at', { ascending: false })
          break
        case 'popular':
          query = query.order('usage_count', { ascending: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      // Apply pagination
      query = query.range(filters.offset, filters.offset + filters.limit - 1)

      const { data, error } = await query

      if (error) {
        throw new Error(error.message)
      }

      return data as Prompt[]
    } catch (error) {
      console.error('Search prompts error:', error)
      throw error
    }
  }

  /**
   * Get public prompts
   */
  static async getPublicPrompts(filters: SearchFilters): Promise<Prompt[]> {
    try {
      let query = supabase.from('prompts').select('*').eq('is_public', true)

      // Apply filters (same as searchPrompts but for public prompts)
      if (filters.query) {
        query = query.or(`content.ilike.%${filters.query}%,title.ilike.%${filters.query}%`)
      }

      if (filters.category) {
        query = query.eq('category', filters.category)
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags)
      }

      // Apply sorting
      switch (filters.sortBy) {
        case 'recent':
          query = query.order('created_at', { ascending: false })
          break
        case 'popular':
          query = query.order('usage_count', { ascending: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      // Apply pagination
      query = query.range(filters.offset, filters.offset + filters.limit - 1)

      const { data, error } = await query

      if (error) {
        throw new Error(error.message)
      }

      return data as Prompt[]
    } catch (error) {
      console.error('Get public prompts error:', error)
      throw error
    }
  }

  /**
   * Make prompt public
   */
  static async makePromptPublic(id: string): Promise<Prompt> {
    return this.updatePrompt(id, { is_public: true })
  }

  /**
   * Make prompt private
   */
  static async makePromptPrivate(id: string): Promise<Prompt> {
    return this.updatePrompt(id, { is_public: false })
  }

  /**
   * Increment usage count
   */
  static async incrementUsageCount(id: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_usage_count', {
        prompt_id: id
      } as any)

      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('Increment usage count error:', error)
      // Don't throw - this is not critical
    }
  }

  /**
   * Get prompts by category
   */
  static async getPromptsByCategory(category: string): Promise<Prompt[]> {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      return data as Prompt[]
    } catch (error) {
      console.error('Get prompts by category error:', error)
      throw error
    }
  }

  /**
   * Get recent prompts
   */
  static async getRecentPrompts(limit: number = 10): Promise<Prompt[]> {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw new Error(error.message)
      }

      return data as Prompt[]
    } catch (error) {
      console.error('Get recent prompts error:', error)
      throw error
    }
  }
}
