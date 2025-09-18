import { z } from 'zod'

export const authUserSchema = z
  .object({
    id: z.string(),
    email: z.string().email().nullable().optional(),
    fullName: z.string().nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional()
  })
  .strict()

export const authSessionSchema = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string().nullable().optional(),
    expiresAt: z.number().nullable().optional(),
    tokenType: z.string().nullable().optional()
  })
  .strict()

export const authStateSchema = z.object({
  user: authUserSchema.nullable(),
  session: authSessionSchema.nullable(),
  loading: z.boolean()
})

export type AuthUser = z.infer<typeof authUserSchema>
export type AuthSession = z.infer<typeof authSessionSchema>
export type AuthState = z.infer<typeof authStateSchema>
