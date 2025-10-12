import type { FieldError, FieldErrors, Resolver } from 'react-hook-form'
import type { z } from 'zod'

type AnyZodSchema = z.ZodTypeAny

type ResolverValues<TSchema extends AnyZodSchema> = z.infer<TSchema>

const setNestedError = (target: Record<string, unknown>, path: string, value: FieldError) => {
  const segments = path.split('.')
  let cursor = target

  for (let index = 0; index < segments.length; index += 1) {
    const key = segments[index]!
    if (index === segments.length - 1) {
      cursor[key] = value
      return
    }

    cursor[key] = cursor[key] ?? {}
    cursor = cursor[key] as Record<string, unknown>
  }
}

export const zodResolver = <TSchema extends AnyZodSchema>(schema: TSchema): Resolver<ResolverValues<TSchema>> =>
  async (values) => {
    const result = await schema.safeParseAsync(values)

    if (result.success) {
      return {
        values: result.data,
        errors: {} as FieldErrors<ResolverValues<TSchema>>
      }
    }

    const errors = {} as FieldErrors<ResolverValues<TSchema>>
    const writableErrors = errors as Record<string, unknown>

    for (const issue of result.error.issues) {
      const message = issue.message ?? 'Invalid value'

      if (!issue.path.length) {
        writableErrors.root = {
          type: issue.code,
          message
        } satisfies FieldError
        continue
      }

      const path = issue.path.join('.')
      setNestedError(writableErrors, path, {
        type: issue.code,
        message
      })
    }

    return {
      values: {} as ResolverValues<TSchema>,
      errors
    }
  }
