/**
 * Convert a string to a hex string
 */
function toHex(str: string) {
  let result = ''
  for (let i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString(10)
  }
  return result
}

/**
 * Creates a deterministic color based on a seed string
 */
export function randomColor(seed: string, rangeSize = 100) {
  const base10Str = toHex(seed.slice(-6))
  const [num0, num1, num2, num3] = base10Str.split('').map((n) => parseInt(n, 10) / 10)

  const parts = [
    Math.floor(num0 * 256),
    Math.floor(num1 * rangeSize),
    Math.floor(num2 * rangeSize) + 256 - rangeSize
  ].sort(() => num3 % 2)

  return '#' + parts.map((p) => p.toString(16).padStart(2, '0')).join('')
}
