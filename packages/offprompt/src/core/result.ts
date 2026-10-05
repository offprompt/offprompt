/** A success or a failure carrying a message already safe to show a human. */
export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly message: string }

export const ok = <T>(value: T): Result<T> => ({ ok: true, value })

export const fail = <T>(message: string): Result<T> => ({ ok: false, message })

/** Every value when all succeeded, or the first failure. */
export const allOk = <T>(results: readonly Result<T>[]): Result<readonly T[]> =>
  results.reduce<Result<readonly T[]>>(
    (carried, next) => {
      if (!carried.ok) return carried
      return next.ok ? ok([...carried.value, next.value]) : next
    },
    ok([]),
  )
