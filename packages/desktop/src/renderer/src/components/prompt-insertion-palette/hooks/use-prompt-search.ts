import { useMemo } from 'react'
import { Prompt, PromptSearchResult } from '../types'

interface UsePromptSearchOptions {
  maxResults?: number
}

export function usePromptSearch(
  prompts: Prompt[],
  query: string,
  options: UsePromptSearchOptions = {}
) {
  const { maxResults = 10 } = options

  const filteredPrompts = useMemo(() => {
    if (!query.trim()) {
      return prompts.slice(0, maxResults)
    }

    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean)

    const isSubsequence = (needle: string, haystack: string): boolean => {
      if (!needle) return true
      let index = 0
      for (let i = 0; i < needle.length; i++) {
        const position = haystack.indexOf(needle[i]!, index)
        if (position === -1) {
          return false
        }
        index = position + 1
      }
      return true
    }

    const scored = prompts
      .map((prompt, rank) => {
        const title = prompt.title.toLowerCase()
        const content = prompt.content.toLowerCase()

        let score = prompt.isFavorite ? 150 : 0
        let matched = false

        for (const token of tokens) {
          let tokenMatched = false

          if (title === token) {
            score += 600
            tokenMatched = true
          }
          if (title.startsWith(token)) {
            score += 450
            tokenMatched = true
          }
          if (title.includes(token)) {
            score += 240
            tokenMatched = true
          }
          if (content.includes(token)) {
            score += 160
            tokenMatched = true
          }
          if (!tokenMatched) {
            if (isSubsequence(token, title)) {
              score += 120
              tokenMatched = true
            } else if (isSubsequence(token, content)) {
              score += 60
              tokenMatched = true
            }
          }

          if (!tokenMatched) {
            return null
          }

          matched = matched || tokenMatched
        }

        if (!matched && tokens.length > 0) {
          return null
        }

        const recencyBoost = prompts.length - rank
        score += recencyBoost * 0.5

        return { prompt, score, rank }
      })
      .filter((entry): entry is PromptSearchResult => Boolean(entry))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.rank - b.rank
      })

    return scored.slice(0, maxResults).map((entry) => entry.prompt)
  }, [query, prompts, maxResults])

  return filteredPrompts
}