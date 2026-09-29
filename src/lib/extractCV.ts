export async function extractCV(blob: Blob, name: string): Promise<string> {
  if (blob.size > 5 * 1024 * 1024) throw new Error('Choose a CV smaller than 5 MB.')
  const buffer = await blob.arrayBuffer()
  if (/\.pdf$/i.test(name)) {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
    const task = pdfjs.getDocument({ data: buffer })
    try {
      const pdf = await task.promise
      if (pdf.numPages > 20) throw new Error('Please use a CV of 20 pages or fewer.')
      const pages: string[] = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        pages.push(content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join(''))
      }
      const text = pages.join('\n\n')
      if (text.trim().length < 100) throw new Error('This PDF has too little readable text. For a scanned CV, paste its text below or upload a selectable-text PDF.')
      return text
    } finally { await task.destroy() }
  }
  if (/\.docx$/i.test(name)) {
    const mammoth = await import('mammoth')
    return (await mammoth.extractRawText({ arrayBuffer: buffer })).value
  }
  throw new Error('For analysis, choose PDF or DOCX. For older DOC files, paste the CV text below.')
}
