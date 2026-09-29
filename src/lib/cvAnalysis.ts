const stop = new Set('the and for with that this your our you are will have has from into using work working role team teams job experience required preferred skills ability knowledge strong excellent including related must should years year degree company candidate candidates responsibilities requirements opportunity equal employer apply benefits salary employment all any an of to in on or as is be a at by we it'.split(' '))
export function terms(text: string): string[] {
  return [...new Set((text.toLowerCase().match(/[a-z][a-z0-9+#.-]*/g) || []).map(t => t.replace(/[.-]+$/, '')).filter(t => t.length > 1 && !stop.has(t)))]
}
export function analyzeCV(cv: string, description: string) {
  if (cv.trim().length < 100 || description.trim().length < 100) throw new Error('Add at least 100 characters of CV text and job description for a useful comparison.')
  const cvTerms = new Set(terms(cv))
  const keywords = terms(description)
  if (keywords.length < 5) throw new Error('Add a more detailed English job description with specific requirements.')
  const matched = keywords.filter(t => cvTerms.has(t))
  const missing = keywords.filter(t => !cvTerms.has(t))
  const checks = [
    { label: 'Email address', pass: /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(cv), tip: 'Include a readable email address in the main document body.' },
    { label: 'Experience section', pass: /\b(experience|employment|work history)\b/i.test(cv), tip: 'Use a standard Experience heading and list relevant roles with dates.' },
    { label: 'Skills section', pass: /\b(skills|competencies|technologies)\b/i.test(cv), tip: 'Add a Skills section containing the tools and capabilities you actually have.' },
    { label: 'Education or training section', pass: /\b(education|qualifications|certifications|training)\b/i.test(cv), tip: 'Use an Education or Certifications heading for relevant qualifications.' },
    { label: 'Dated history', pass: /\b(19|20)\d{2}\b/.test(cv), tip: 'Include consistent employment and education dates, such as Jan 2023 – Jun 2025.' },
    { label: 'Measurable outcomes', pass: /\b\d+(?:\.\d+)?\s*(%|percent|users|customers|projects|hours|days|million|thousand)\b|\d+%/i.test(cv), tip: 'Where accurate, quantify a result: “Reduced [process time] by [measured amount] using [relevant skill].”' },
  ]
  const matchScore = Math.round(matched.length / keywords.length * 100)
  const structureScore = Math.round(checks.filter(c => c.pass).length / checks.length * 100)
  return { matchScore, structureScore, matched, missing, checks,
    suggestions: [
      ...(missing.length ? [`Review these job-description terms absent from your CV: ${missing.slice(0, 12).join(', ')}. Add them only where they truthfully describe your experience, with supporting examples.`] : []),
      ...checks.filter(c => !c.pass).map(c => c.tip),
      'Put your most relevant experience first and connect each claim to a concrete project or result. Do not invent skills, qualifications, or metrics.',
      'For parsing, use a single-column layout, standard headings, and selectable text. Keep essential contact details out of headers, footers, images, and text boxes.',
    ] }
}
