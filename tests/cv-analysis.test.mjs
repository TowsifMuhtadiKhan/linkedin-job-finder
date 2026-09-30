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

test('ignores marketing words and matches known skill aliases', () => {
  const result = analyzeCV(cv + ' Amazon Web Services and Nodejs services.', description + ' AWS Node.js. Join our exciting global marketplace in America and Europe. Commerce shopping future passion.')
  assert.ok(result.matched.includes('aws'))
  assert.ok(result.matched.includes('node.js'))
  assert.ok(!result.missing.includes('commerce'))
  assert.ok(result.evidence.find(item => item.skill === 'aws').excerpt.includes('Amazon Web Services'))
})

test('does not invent a score for unsupported skills', () => {
  const result = analyzeCV(cv, 'We need a specialist with extensive knowledge of rare historical manuscripts, archival preservation techniques, and museum collections.')
  assert.equal(result.matchScore, null)
  assert.deepEqual(result.missing, [])
})

test('skill boundaries distinguish Java from JavaScript and punctuation in C++', () => {
  const result = analyzeCV(cv + ' C++ development.', description + ' Java and C++ are required. NodeXjs is not a recognized technology.')
  assert.ok(result.matched.includes('c++'))
  assert.ok(result.missing.includes('java'))
  assert.ok(!result.missing.includes('node.js'))
})
