import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tailorCVText, makeWordCV, makePDFCV } from '../src/lib/cvExport.ts'
import mammoth from 'mammoth'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const cv = 'Alex Morgan\nalex@example.com\nSkills\nExcel, React, TypeScript\nExperience\nDeveloper at Example, 2020 - 2024\nBuilt tools for 25 users.\nEducation\nBSc Computer Science'

test('prioritizes existing skills without changing section order or experience', () => {
  const result = tailorCVText(cv, 'React and TypeScript developer')
  assert.equal(result.changes, 1)
  assert.ok(result.text.includes('React, TypeScript, Excel'))
  assert.equal(result.text.split('Experience')[1], cv.split('Experience')[1])
  assert.equal(tailorCVText(cv, 'Kubernetes').text, cv)
})

test('Word export is readable DOCX and includes the complete CV in order', async () => {
  const blob = await makeWordCV(cv)
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(await blob.arrayBuffer()) })
  for (const line of cv.split('\n')) assert.ok(value.includes(line))
  assert.ok(value.indexOf('Skills') < value.indexOf('Experience'))
})

test('PDF export contains selectable text and paginates long CVs', async () => {
  const blob = await makePDFCV(cv + '\n' + 'Built software for customers.\n'.repeat(100))
  const buffer = new Uint8Array(await blob.arrayBuffer())
  assert.equal(new TextDecoder().decode(buffer.slice(0, 5)), '%PDF-')
  const task = getDocument({ data: buffer, useSystemFonts: true })
  const document = await task.promise
  try {
    assert.ok(document.numPages > 1)
    const content = await (await document.getPage(1)).getTextContent()
    assert.ok(content.items.some(item => item.str === 'Alex Morgan'))
  } finally { await task.destroy() }
})
