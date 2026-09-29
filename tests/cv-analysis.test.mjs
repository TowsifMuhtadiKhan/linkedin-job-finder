import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeCV, terms } from '../src/lib/cvAnalysis.ts'

const description = 'Required skills: React TypeScript SQL testing accessibility. Build reusable components and accessible interfaces. Work with customers on reliable software delivery.'
const cv = 'person@example.com\nSkills\nReact TypeScript SQL testing accessibility\nExperience\n2023 Built reusable components and accessible interfaces for customers, improving reliable software delivery by 25%.\nEducation\nUniversity degree.'
test('finds matching terms and provides transparent bounded scores', () => {
  const result = analyzeCV(cv, description)
  assert.ok(result.matched.includes('typescript'))
  assert.equal(result.structureScore, 100)
  assert.ok(result.matchScore >= 0 && result.matchScore <= 100)
  assert.equal(result.matchScore, Math.round(result.matched.length / (result.matched.length + result.missing.length) * 100))
})
test('does not reward keyword stuffing and respects token boundaries', () => {
  assert.equal(analyzeCV(cv, description).matchScore, analyzeCV(cv + ' React React React', description).matchScore)
  assert.ok(!terms('JavaScript').includes('java'))
  assert.deepEqual(terms('C++ C# .NET Node.js React.js'), ['c++', 'c#', 'net', 'node.js', 'react.js'])
})
test('rejects empty and insufficient documents instead of making up a score', () => {
  assert.throws(() => analyzeCV('', description))
  assert.throws(() => analyzeCV(cv, 'Hiring developer'))
})
test('missing sections yield specific improvement suggestions', () => {
  const result = analyzeCV('A professional profile focused on frontend development and delivering reliable software products to customers. React and TypeScript development.', description)
  assert.ok(result.suggestions.some(s => s.includes('Experience heading')))
  assert.ok(result.suggestions.some(s => s.includes('email address')))
  assert.ok(result.suggestions.some(s => s.includes('Do not invent')))
})
