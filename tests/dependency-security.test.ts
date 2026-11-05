import { createRequire } from 'node:module';
import { describe, expect, it } from '@jest/globals';

// WHY: Exercise the patched copy used by Jest without adding a direct dependency.
const require = createRequire(import.meta.url);
const jestRequire = createRequire(require.resolve('jest'));
const jestConfigRequire = createRequire(jestRequire.resolve('jest-config'));
const deepmerge = jestConfigRequire('deepmerge') as (
  target: object,
  source: object,
) => Record<string, unknown>;

describe('deepmerge security patch', () => {
  it('does not copy dangerous keys from either input or nested values', () => {
    const poisoned = JSON.parse(
      '{"__proto__":{"isAdmin":true},"constructor":{"prototype":{"isAdmin":true}},"prototype":{"isAdmin":true},"safe":1}',
    ) as object;
    const results = [
      deepmerge(Object.create(null) as object, poisoned),
      deepmerge(poisoned, {}),
      deepmerge({ nested: null }, { nested: poisoned }).nested as Record<
        string,
        unknown
      >,
    ];

    for (const result of results) {
      expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
      expect(result.isAdmin).toBeUndefined();
      expect(Object.hasOwn(result, '__proto__')).toBe(false);
      expect(Object.hasOwn(result, 'constructor')).toBe(false);
      expect(Object.hasOwn(result, 'prototype')).toBe(false);
      expect(result.safe).toBe(1);
    }
  });
});
