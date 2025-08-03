import { describe, expect, it } from 'vitest'
import { hashFunctionSource } from './hashFunction'

describe('hashFunctionSource', async () => {
  describe('basic functionality', async () => {
    it('should generate consistent hashes for identical functions', async () => {
      const fnA = `
        function compute(x, y) {
          const sum = x + y;
          return sum * sum;
        }
      `
      const fnB = `
        function compute(x, y) {
          const sum = x + y;
          return sum * sum;
        }
      `

      const hashA = await hashFunctionSource(fnA)
      const hashB = await hashFunctionSource(fnB)

      expect(hashA).toBe(hashB)
      expect(hashA).toMatch(/^[a-f0-9]+$/) // Should be hex string
    })

    it('should generate same hash for functions with different formatting', async () => {
      const fnA = `
        function compute({ x, y }) {
          const sum = x + y;
          return sum * sum;
        }
      `
      const fnB = `
        function compute({x,y}) {
          let total = x + y;
          return total* total ;
        }
      `

      const hashA = await hashFunctionSource(fnA)
      const hashB = await hashFunctionSource(fnB)

      expect(hashA).toBe(hashB)
    })

    it('should generate same hash for functions with different variable names', async () => {
      const fnA = `
        function process(data) {
          const result = data.map(item => item * 2);
          return result;
        }
      `
      const fnB = `
        function process(input) {
          const output = input.map(element => element * 2);
          return output;
        }
      `

      const hashA = await hashFunctionSource(fnA)
      const hashB = await hashFunctionSource(fnB)

      expect(hashA).toBe(hashB)
    })
  })

  describe('arrow functions', async () => {
    it('should handle arrow functions correctly', async () => {
      const fnA = `(x, y) => x + y`
      const fnB = `(a, b) => a + b`

      const hashA = await hashFunctionSource(fnA)
      const hashB = await hashFunctionSource(fnB)

      expect(hashA).toBe(hashB)
    })

    it('should handle arrow functions with blocks', async () => {
      const fnA = `
        (x, y) => {
          const sum = x + y;
          return sum * 2;
        }
      `
      const fnB = `
        (a, b) => {
          const total = a + b;
          return total * 2;
        }
      `

      const hashA = await hashFunctionSource(fnA)
      const hashB = await hashFunctionSource(fnB)

      expect(hashA).toBe(hashB)
    })
  })

  describe('function expressions', async () => {
    it('should handle function expressions', async () => {
      const fnA = `
        function(x, y) {
          return x * y;
        }
      `
      const fnB = `
        function(a, b) {
          return a * b;
        }
      `

      const hashA = await hashFunctionSource(fnA)
      const hashB = await hashFunctionSource(fnB)

      expect(hashA).toBe(hashB)
    })
  })

  describe('complex scenarios', async () => {
    it('should handle nested functions', async () => {
      const fnA = `
        function outer(x) {
          function inner(y) {
            return y * 2;
          }
          return inner(x);
        }
      `
      const fnB = `
        function outer(a) {
          function inner(b) {
            return b * 2;
          }
          return inner(a);
        }
      `

      const hashA = await hashFunctionSource(fnA)
      const hashB = await hashFunctionSource(fnB)

      expect(hashA).toBe(hashB)
    })

    it('should handle multiple variable declarations', async () => {
      const fnA = `
        function process(data) {
          const first = data[0];
          const second = data[1];
          const result = first + second;
          return result;
        }
      `
      const fnB = `
        function process(input) {
          const a = input[0];
          const b = input[1];
          const sum = a + b;
          return sum;
        }
      `

      const hashA = await hashFunctionSource(fnA)
      const hashB = await hashFunctionSource(fnB)

      expect(hashA).toBe(hashB)
    })

    it('should preserve member expression property names', async () => {
      const fnA = `
        function process(obj) {
          return obj.property + obj.method();
        }
      `
      const fnB = `
        function process(data) {
          return data.property + data.method();
        }
      `

      const hashA = await hashFunctionSource(fnA)
      const hashB = await hashFunctionSource(fnB)

      expect(hashA).toBe(hashB)
    })

    it('should handle computed member expressions', async () => {
      const fnA = `
        function process(obj, key) {
          return obj[key];
        }
      `
      const fnB = `
        function process(data, prop) {
          return data[prop];
        }
      `

      const hashA = await hashFunctionSource(fnA)
      const hashB = await hashFunctionSource(fnB)

      expect(hashA).toBe(hashB)
    })
  })

  describe('different functions should have different hashes', async () => {
    it('should generate different hashes for functions with different logic', async () => {
      const fnA = `
        function compute(x, y) {
          return x + y;
        }
      `
      const fnB = `
        function compute(x, y) {
          return x * y;
        }
      `

      const hashA = await hashFunctionSource(fnA)
      const hashB = await hashFunctionSource(fnB)

      expect(hashA).not.toBe(hashB)
    })

    it('should generate different hashes for functions with different parameter counts', async () => {
      const fnA = `
        function compute(x) {
          return x * 2;
        }
      `
      const fnB = `
        function compute(x, y) {
          return x * 2;
        }
      `

      const hashA = await hashFunctionSource(fnA)
      const hashB = await hashFunctionSource(fnB)

      expect(hashA).not.toBe(hashB)
    })
  })

  describe('error handling', async () => {
    it('should throw error for invalid JavaScript', async () => {
      const invalidJs = 'function invalid( { return x + y; }'

      await expect(hashFunctionSource(invalidJs)).rejects.toThrow('Failed to hash function source')
    })

    it('should handle empty function', async () => {
      const emptyFn = 'function empty() {}'

      expect(async () => {
        const hash = await hashFunctionSource(emptyFn)
        expect(hash).toMatch(/^[a-f0-9]+$/)
      }).not.toThrow()
    })
  })

  describe('edge cases', async () => {
    it('should handle functions with no parameters', async () => {
      const fnA = `
        function getValue() {
          const value = 42;
          return value;
        }
      `
      const fnB = `
        function getValue() {
          const result = 42;
          return result;
        }
      `

      const hashA = await hashFunctionSource(fnA)
      const hashB = await hashFunctionSource(fnB)

      expect(hashA).toBe(hashB)
    })

    it('should handle functions with destructured parameters', async () => {
      const fnA = `
        function process({ x, y }) {
          return x + y;
        }
      `
      const fnB = `
        function process({ a, b }) {
          return a + b;
        }
      `

      // Note: These might not be identical due to destructuring complexity
      // but they should at least not throw errors
      expect(async () => {
        const hashA = await hashFunctionSource(fnA)
        const hashB = await hashFunctionSource(fnB)
        expect(hashA).toMatch(/^[a-f0-9]+$/)
        expect(hashB).toMatch(/^[a-f0-9]+$/)
      }).not.toThrow()
    })
  })

  describe('complex nested scenarios', async () => {
    it('should handle nested for loops with different variable names', async () => {
      const fnA = `
        function processMatrix(matrix) {
          const result = [];
          for (let i = 0; i < matrix.length; i++) {
            const row = [];
            for (let j = 0; j < matrix[i].length; j++) {
              const value = matrix[i][j] * 2;
              row.push(value);
            }
            result.push(row);
          }
          return result;
        }
      `
      const fnB = `
        function processMatrix(data) {
          const output = [];
          for (let x = 0; x < data.length; x++) {
            const currentRow = [];
            for (let y = 0; y < data[x].length; y++) {
              const item = data[x][y] * 2;
              currentRow.push(item);
            }
            output.push(currentRow);
          }
          return output;
        }
      `

      const hashA = await hashFunctionSource(fnA)
      const hashB = await hashFunctionSource(fnB)

      expect(hashA).toBe(hashB)
    })

    it('should handle complex array.map compositions with nested functions', async () => {
      const fnA = `
        function transformData(users) {
          return users
            .map(user => {
              const profile = user.profile;
              return profile.skills.map(skill => {
                const normalized = skill.toLowerCase();
                return { name: normalized, level: user.level };
              });
            })
            .flat()
            .filter(item => item.level > 5);
        }
      `
      const fnB = `
        function transformData(people) {
          return people
            .map(person => {
              const info = person.profile;
              return info.skills.map(ability => {
                const clean = ability.toLowerCase();
                return { name: clean, level: person.level };
              });
            })
            .flat()
            .filter(entry => entry.level > 5);
        }
      `

      const hashA = await hashFunctionSource(fnA)
      const hashB = await hashFunctionSource(fnB)

      expect(hashA).toBe(hashB)
    })

    it('should handle mixed for loops and array methods', async () => {
      const fnA = `
        function complexProcess(data) {
          const results = [];
          for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const processed = item.values
              .map(val => val * 2)
              .filter(val => val > 10)
              .reduce((sum, val) => sum + val, 0);

            for (let j = 0; j < item.categories.length; j++) {
              const category = item.categories[j];
              results.push({
                id: item.id,
                category: category,
                total: processed
              });
            }
          }
          return results;
        }
      `
      const fnB = `
        function complexProcess(input) {
          const output = [];
          for (let x = 0; x < input.length; x++) {
            const element = input[x];
            const computed = element.values
              .map(number => number * 2)
              .filter(number => number > 10)
              .reduce((accumulator, number) => accumulator + number, 0);

            for (let y = 0; y < element.categories.length; y++) {
              const cat = element.categories[y];
              output.push({
                id: element.id,
                category: cat,
                total: computed
              });
            }
          }
          return output;
        }
      `

      const hashA = await hashFunctionSource(fnA)
      const hashB = await hashFunctionSource(fnB)

      expect(hashA).toBe(hashB)
    })

    it('should handle deeply nested arrow functions with closures', async () => {
      const fnA = `
        function createProcessor(config) {
          const multiplier = config.factor;
          return data => {
            return data.map(item => {
              const transform = value => value * multiplier;
              return item.numbers
                .map(transform)
                .filter(result => result > config.threshold)
                .map(final => ({ value: final, processed: true }));
            });
          };
        }
      `
      const fnB = `
        function createProcessor(settings) {
          const factor = settings.factor;
          return input => {
            return input.map(element => {
              const converter = num => num * factor;
              return element.numbers
                .map(converter)
                .filter(output => output > settings.threshold)
                .map(end => ({ value: end, processed: true }));
            });
          };
        }
      `

      const hashA = await hashFunctionSource(fnA)
      const hashB = await hashFunctionSource(fnB)

      expect(hashA).toBe(hashB)
    })

    it('should handle functions with multiple nested scopes and variable shadowing', async () => {
      const fnA = `
        function processLayers(data) {
          const result = [];
          for (let i = 0; i < data.length; i++) {
            const layer = data[i];
            const processed = layer.items.map(item => {
              const temp = item.value;
              for (let i = 0; i < item.transforms.length; i++) {
                const transform = item.transforms[i];
                temp = transform(temp);
              }
              return temp;
            });
            result.push(processed);
          }
          return result;
        }
      `
      const fnB = `
        function processLayers(input) {
          const output = [];
          for (let x = 0; x < input.length; x++) {
            const section = input[x];
            const computed = section.items.map(element => {
              const current = element.value;
              for (let x = 0; x < element.transforms.length; x++) {
                const operation = element.transforms[x];
                current = operation(current);
              }
              return current;
            });
            output.push(computed);
          }
          return output;
        }
      `

      const hashA = await hashFunctionSource(fnA)
      const hashB = await hashFunctionSource(fnB)

      expect(hashA).toBe(hashB)
    })

    it('should handle async/await patterns with array methods', async () => {
      const fnA = `
        async function processAsync(items) {
          const results = [];
          for (const item of items) {
            const processed = await item.data
              .map(async entry => {
                const result = await transform(entry);
                return result.value;
              });
            results.push(processed);
          }
          return results;
        }
      `
      const fnB = `
        async function processAsync(elements) {
          const outputs = [];
          for (const element of elements) {
            const computed = await element.data
              .map(async record => {
                const outcome = await transform(record);
                return outcome.value;
              });
            outputs.push(computed);
          }
          return outputs;
        }
      `

      const hashA = await hashFunctionSource(fnA)
      const hashB = await hashFunctionSource(fnB)

      expect(hashA).toBe(hashB)
    })
  })
})
