/** Parses the compact class/constructor format returned by OP.GG's MCP tool. */
export function parseCompactResponse(input: string): Record<string, unknown> {
  const separator = input.indexOf('\n\n')
  if (separator < 0) throw new Error('OP.GG returned an unknown response format')

  const classes = new Map<string, string[]>()
  for (const line of input.slice(0, separator).split('\n')) {
    const declaration = /^class ([A-Za-z][A-Za-z0-9_]*): (.+)$/.exec(line.trim())
    if (!declaration) throw new Error('OP.GG returned an invalid class declaration')
    classes.set(declaration[1], declaration[2].split(',').map((field) => field.trim()))
  }

  const source = input.slice(separator + 2).trim()
  let offset = 0
  const skipSpace = () => { while (/\s/.test(source[offset] ?? '')) offset++ }
  const expect = (character: string) => {
    skipSpace()
    if (source[offset] !== character) throw new Error('OP.GG returned malformed compact data')
    offset++
  }

  function readValue(): unknown {
    skipSpace()
    if (source[offset] === '[') {
      offset++
      const values: unknown[] = []
      skipSpace()
      while (source[offset] !== ']') {
        values.push(readValue())
        skipSpace()
        if (source[offset] !== ',') break
        offset++
      }
      expect(']')
      return values
    }

    if (source[offset] === '"') {
      const start = offset++
      while (offset < source.length) {
        if (source[offset] === '\\') { offset += 2; continue }
        if (source[offset++] === '"') return JSON.parse(source.slice(start, offset)) as string
      }
      throw new Error('OP.GG returned an unterminated string')
    }

    const number = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(source.slice(offset))
    if (number) {
      offset += number[0].length
      return Number(number[0])
    }

    const identifier = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(offset))
    if (!identifier) throw new Error('OP.GG returned malformed compact data')
    offset += identifier[0].length
    if (identifier[0] === 'None' || identifier[0] === 'null') return null
    if (identifier[0] === 'True' || identifier[0] === 'true') return true
    if (identifier[0] === 'False' || identifier[0] === 'false') return false

    expect('(')
    const values: unknown[] = []
    skipSpace()
    while (source[offset] !== ')') {
      values.push(readValue())
      skipSpace()
      if (source[offset] !== ',') break
      offset++
    }
    expect(')')

    const fields = classes.get(identifier[0])
    if (!fields || fields.length !== values.length) {
      throw new Error(`OP.GG returned an unexpected ${identifier[0]} shape`)
    }
    return Object.fromEntries(fields.map((field, index) => [field, values[index]]))
  }

  const result = readValue()
  skipSpace()
  if (offset !== source.length || !result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('OP.GG returned malformed compact data')
  }
  return result as Record<string, unknown>
}
