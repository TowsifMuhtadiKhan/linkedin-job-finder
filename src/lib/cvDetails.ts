const headings: Record<string, string> = {
  summary: 'summary', profile: 'summary', 'professional summary': 'summary', objective: 'summary',
  skills: 'skills', 'technical skills': 'skills', technologies: 'skills', 'core competencies': 'skills',
  experience: 'experience', 'work experience': 'experience', 'professional experience': 'experience', 'employment history': 'experience',
  education: 'education', 'academic background': 'education', qualifications: 'education',
  projects: 'projects', 'personal projects': 'projects', certifications: 'certifications', certificates: 'certifications',
  languages: 'languages', interests: 'interests', references: 'references', achievements: 'achievements',
}

export function parseCVDetails(text: string) {
  const lines = text.replace(/\r/g, '').split('\n').map(line => line.trim()).filter(Boolean)
  const sections: Record<string, string[]> = {}
  let section = ''
  for (const line of lines) {
    const [label, ...rest] = line.split(':')
    const heading = headings[label.toLowerCase().replace(/\s+/g, ' ').trim()]
    if (heading) {
      section = heading
      sections[section] ||= []
      const content = rest.join(':').trim()
      if (content) sections[section].push(content)
    } else if (section) sections[section].push(line)
  }
  const email = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] || ''
  const phone = (text.match(/(?:\+\d[\d ().-]{7,}\d|\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4})/g) || [])
    .find(value => { const digits = value.replace(/\D/g, ''); return digits.length >= 10 && digits.length <= 15 && !/^\d{4}\s*[-–]\s*\d{4}$/.test(value) }) || ''
  const links = [...new Set(text.match(/(?:https?:\/\/|www\.|(?:linkedin|github)\.com\/)[^\s<>]+/gi) || [])].join('\n')
  const first = lines[0] || ''
  const name = /^[\p{L}][\p{L} .'-]{2,70}$/u.test(first) && !headings[first.toLowerCase()] && !/resume|curriculum vitae|developer|engineer/i.test(first) ? first : ''
  return { name, email, phone, links, summary: (sections.summary || []).join('\n'), skills: (sections.skills || []).join('\n'),
    experience: (sections.experience || []).join('\n'), education: (sections.education || []).join('\n'),
    projects: (sections.projects || []).join('\n'), certifications: (sections.certifications || []).join('\n') }
}
