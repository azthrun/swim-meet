import { describe, expect, it } from 'vitest'
import { en } from './en'
import { zh } from './zh'

type Tree = { [key: string]: string | Tree }

/** Every message as "path.to.key" -> text. */
function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const flat = new Map<string, string>()
  for (const [key, value] of Object.entries(tree)) {
    if (typeof value === 'string') flat.set(prefix + key, value)
    else for (const [path, text] of flatten(value, `${prefix}${key}.`)) flat.set(path, text)
  }
  return flat
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()

const english = flatten(en)
const chinese = flatten(zh)

describe('en and zh messages', () => {
  it('have the same keys', () => {
    expect([...chinese.keys()].sort()).toEqual([...english.keys()].sort())
  })

  it('have no empty message', () => {
    for (const [path, text] of [...english, ...chinese]) expect(text.trim(), path).not.toBe('')
  })

  it('fill the same placeholders', () => {
    for (const [path, text] of english) expect(placeholders(chinese.get(path) ?? ''), path).toEqual(placeholders(text))
  })

  it('leave no English sentence untranslated', () => {
    // Proper nouns and examples that read the same in both languages.
    const same = new Set(['appName', 'emailPlaceholder'])
    for (const [path, text] of chinese) {
      if (same.has(path)) continue
      expect(/[一-鿿]/.test(text) || !/[A-Za-z]{2,}/.test(text.replace(/\{\w+\}/g, '')), `${path}: ${text}`).toBe(
        true,
      )
    }
  })

  it('keep the fixed vocabulary in the lookup tables, not here', () => {
    // English and Chinese names of the lookup rows: courses, strokes, rounds, statuses, genders.
    const vocabulary = [
      'Short Course Yards', 'Short Course Meters', 'Long Course Meters', '短池（码）', '短池（米）', '长池（米）',
      'Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'Individual Medley', 'Freestyle Relay', 'Medley Relay',
      '自由泳', '仰泳', '蛙泳', '蝶泳', '个人混合泳', '自由泳接力', '混合泳接力',
      'Timed Final', 'Prelim', 'Swim-off', '计时决赛', '预赛', '附加赛',
      'Disqualified', 'No Show', 'Scratched', 'DQ', '犯规', '未参赛', '退赛',
      'Female', 'Male',
    ]
    for (const [path, text] of [...english, ...chinese]) {
      for (const word of vocabulary) expect(text.includes(word), `${path} holds "${word}"`).toBe(false)
    }
  })
})
