import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCVDetails } from '../src/lib/cvDetails.ts'

test('extracts contact details and separates resume sections', () => {
 const data = parseCVDetails('Alex Morgan\nalex@example.com | +1 (212) 555-0123\nhttps://github.com/alex\nProfessional Summary\nBackend developer\nTechnical Skills: TypeScript, PostgreSQL\nWork Experience\nEngineer, Example Inc\n2020 - 2024\nEducation\nBSc Computer Science\nProjects\nJob finder\nCertifications\nCloud fundamentals\nLanguages\nEnglish')
 assert.equal(data.name, 'Alex Morgan')
 assert.equal(data.email, 'alex@example.com')
 assert.equal(data.phone.trim(), '+1 (212) 555-0123')
 assert.equal(data.skills, 'TypeScript, PostgreSQL')
 assert.equal(data.experience, 'Engineer, Example Inc\n2020 - 2024')
 assert.equal(data.education, 'BSc Computer Science')
 assert.equal(data.certifications, 'Cloud fundamentals')
})

test('does not invent missing fields or treat dates as phone numbers', () => {
 const data = parseCVDetails('RESUME\nExperience\n2018 - 2024\nBuilt APIs')
 assert.equal(data.name, '')
 assert.equal(data.email, '')
 assert.equal(data.phone, '')
 assert.equal(data.education, '')
 assert.equal(data.skills, '')
})

test('preserves Unicode names and handles CRLF and blank text', () => {
 assert.equal(parseCVDetails('Jose Garcia\r\nSKILLS:\r\nReact').skills, 'React')
 assert.ok(Object.values(parseCVDetails('')).every(value => value === ''))
})
