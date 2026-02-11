/**
 * Result pattern for error handling
 * Avoids throwing exceptions for expected business logic errors
 */

export type Result<T, E = Error> = Ok<T, E> | Err<T, E>;

export class Ok<T, E> {
  readonly success = true;
  constructor(readonly value: T) {}

  isOk(): this is Ok<T, E> {
    return true;
  }

  isErr(): this is Err<T, E> {
    return false;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return Result.ok(fn(this.value));
  }

  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return Result.ok(this.value);
  }

  unwrap(): T {
    return this.value;
  }

  unwrapOr(_default: T): T {
    return this.value;
  }
}

export class Err<T, E> {
  readonly success = false;
  constructor(readonly error: E) {}

  isOk(): this is Ok<T, E> {
    return false;
  }

  isErr(): this is Err<T, E> {
    return true;
  }

  map<U>(_fn: (value: T) => U): Result<U, E> {
    return Result.err(this.error);
  }

  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return Result.err(fn(this.error));
  }

  unwrap(): T {
    throw this.error;
  }

  unwrapOr(defaultValue: T): T {
    return defaultValue;
  }
}

export const Result = {
  ok: <T, E = Error>(value: T): Result<T, E> => {
    return new Ok(value);
  },

  err: <T, E = Error>(error: E): Result<T, E> => {
    return new Err(error);
  },

  fromPromise: async <T, E = Error>(
    promise: Promise<T>
  ): Promise<Result<T, E>> => {
    try {
      const value = await promise;
      return Result.ok(value);
    } catch (error) {
      return Result.err(error as E);
    }
  },
};

