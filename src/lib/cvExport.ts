export function isCVHeading(line: string) {
  return /^(professional summary|summary|profile|objective|technical skills|skills|core competencies|technologies|professional experience|work experience|experience|employment history|education|qualifications|projects|personal projects|certifications|languages|interests|references|achievements)\s*:?”?$/i.test(line.trim())
}

export function tailorCVText(text: string, description: string) {
  let skills = false
  let changes = 0
  const draft = text.split('\n').map(line => {
    const match = line.match(/^(\s*(?:technical skills|skills|technologies|core competencies)\s*:\s*)(.+)$/i)
    if (isCVHeading(line)) { skills = /skills|technologies|competencies/i.test(line); return line }
    if (!skills && !match) return line
    const content = match ? match[2] : line
    // Reorder only explicit lists, never experience sentences or claims.
    if (!/[,;|]/.test(content) || content.length > 400) return line
    const parts = content.split(/\s*[,;|]\s*/)
    if (parts.some(part => !part.trim() || part.trim().split(/\s+/).length > 5)) return line
    const relevant = (part: string) => {
      const escaped = part.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, 'i').test(description)
    }
    const sorted = [...parts].sort((a, b) => Number(relevant(b)) - Number(relevant(a)))
    if (parts.every((part, index) => part === sorted[index])) return line
    changes++
    return (match?.[1] || '') + sorted.join(', ')
  }).join('\n')
  return { text: draft, changes }
}

export async function makeWordCV(text: string) {
  const { Document, Paragraph, TextRun, Packer } = await import('docx')
  const paragraphs = text.split('\n').map((line, index) => new Paragraph({
    children: [new TextRun({ text: line, bold: index === 0 || isCVHeading(line), size: index === 0 ? 32 : 22, font: 'Calibri' })],
    spacing: { after: isCVHeading(line) ? 100 : 65, before: isCVHeading(line) ? 160 : 0 },
    keepNext: isCVHeading(line),
  }))
  return Packer.toBlob(new Document({ sections: [{ properties: { page: { margin: { top: 850, bottom: 850, left: 850, right: 850 } } }, children: paragraphs }] }))
}

export async function makePDFCV(text: string): Promise<Blob> {
  const [{ default: pdfMake }, { default: fonts }] = await Promise.all([import('pdfmake/build/pdfmake.js'), import('pdfmake/build/vfs_fonts.js')])
  pdfMake.addVirtualFileSystem(fonts)
  return pdfMake.createPdf({
    pageSize: 'A4', pageMargins: [42, 42, 42, 42], defaultStyle: { fontSize: 11, lineHeight: 1.2 },
    content: text.split('\n').map((line, index) => ({ text: line || ' ', bold: index === 0 || isCVHeading(line), fontSize: index === 0 ? 16 : 11,
      margin: [0, isCVHeading(line) ? 8 : 0, 0, 4] as [number, number, number, number] })),
  }).getBlob()
}

export function downloadCV(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
