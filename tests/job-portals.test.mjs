import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isProviderPortal, jobPortal, portalLabel, searchKeywords } from '../src/lib/jobPortals.ts'

const criteria = { keywords: ['C++', 'R&D'], location: 'New York, NY', remote: false }

test('authorization constrains every LinkedIn keyword alternative', () => {
  assert.equal(searchKeywords({ ...criteria, workAuthorization: 'STEM OPT' }), '(C++ OR R&D) AND "STEM OPT"')
  assert.equal(searchKeywords({ ...criteria, workAuthorization: 'H1B' }), '(C++ OR R&D) AND (H1B OR "H-1B")')
  assert.equal(searchKeywords(criteria), 'C++ OR R&D')
  assert.equal(searchKeywords({ ...criteria, keywords: [], workAuthorization: 'OPT' }), '')
})

test('provider portals use the in-app adapter', () => {
  for (const source of ['indeed', 'glassdoor', 'handshake', 'ziprecruiter']) assert.equal(isProviderPortal(source), true)
  for (const source of ['linkedin', 'bdjobs', undefined]) assert.equal(isProviderPortal(source), false)
})

test('saved portal jobs retain their source even without a source column', () => {
  for (const source of ['indeed', 'glassdoor', 'handshake', 'ziprecruiter']) {
    assert.equal(jobPortal({ id: source + ':123', url: '' }), source)
  }
  assert.equal(portalLabel({ id: '123', url: 'https://app.joinhandshake.com/stu/jobs/123' }), 'Handshake')
  assert.equal(jobPortal({ id: '123', url: 'https://indeed.com.evil.test/job' }), 'linkedin')
})
