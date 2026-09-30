import { CheckCircle2, Circle, ArrowUpRight } from 'lucide-react'
import type { analyzeCV } from '../lib/cvAnalysis'

export default function CVFeedback({ result }: { result: ReturnType<typeof analyzeCV> }) {
  const total = result.matched.length + result.missing.length
  return <section className="card overflow-hidden" aria-label="CV feedback" aria-live="polite">
    <header className="p-5 sm:p-6 border-b border-gray-100">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#0A66C2]">Your review</p>
      <h2 className="text-xl font-bold text-gray-900 mt-1">Make your experience easier to see</h2>
      <p className="text-sm text-gray-500 mt-2">{total ? `${result.matched.length} recognized job skills appear in your CV. ${result.missing.length ? 'Review the gaps below and add evidence where it reflects your experience.' : 'Strengthen these matches with examples of your work.'}` : 'No supported skill phrases were recognized. Review the requirements manually; a match score is not available.'}</p>
    </header>
    <div className="p-5 sm:p-6 space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        {[{ title: 'Recognized skill coverage', value: result.matchScore, caption: `${result.matched.length} of ${total} recognized skills mentioned in the job description` },
          { title: 'CV essentials', value: result.structureScore, caption: `${result.checks.filter(check => check.pass).length} of ${result.checks.length} text checks passed` }].map(metric =>
          <div key={metric.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
            <p className="text-sm font-medium text-gray-600">{metric.title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{metric.value === null ? 'Not rated' : `${metric.value}%`}</p>
            {metric.value !== null && <div role="progressbar" aria-label={metric.title} aria-valuenow={metric.value} aria-valuemin={0} aria-valuemax={100} className="h-2 bg-blue-100 rounded-full mt-3 overflow-hidden"><div className="h-full bg-[#0A66C2] rounded-full" style={{ width: `${metric.value}%` }} /></div>}
            <p className="text-xs text-gray-500 mt-3">{metric.caption}</p>
          </div>)}
      </div>
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2"><ArrowUpRight size={17} /> Focus on these changes</h3>
        <ol className="mt-4 space-y-3">{result.suggestions.slice(0, 3).map((tip, index) => <li key={tip} className="flex gap-3 text-sm text-gray-700"><span className="rounded-full bg-white border border-blue-100 text-[#0A66C2] w-6 h-6 shrink-0 flex items-center justify-center text-xs font-bold">{index + 1}</span><span>{tip}</span></li>)}</ol>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        {[{ title: 'Skills mentioned in your CV', items: result.matched, match: true }, { title: 'Skills to verify or add evidence for', items: result.missing, match: false }].map(group =>
          <div key={group.title} className="rounded-2xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900">{group.title} <span className="text-gray-400">({group.items.length})</span></h3>
            <div className="flex flex-wrap gap-2 mt-3">{group.items.map(skill => <span key={skill} className={`text-xs px-2.5 py-1 rounded-full border ${group.match ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-900'}`}>{skill}</span>)}</div>
            {!group.items.length && <p className="text-xs text-gray-500 mt-2">{group.match ? 'No recognized matching skills.' : total ? 'No gaps among the recognized skills.' : 'No supported skill phrases detected.'}</p>}
          </div>)}
      </div>
      {result.evidence.length > 0 && <details className="rounded-xl border border-gray-200 p-4"><summary className="cursor-pointer text-sm font-semibold">See matching text from your CV</summary><ul className="mt-4 space-y-3">{result.evidence.map(item => <li key={item.skill} className="text-sm"><p className="font-semibold text-[#0A66C2]">{item.skill}</p><p className="text-gray-600 mt-1 break-words">{item.excerpt}</p></li>)}</ul></details>}
      <div><h3 className="font-semibold text-sm mb-3">CV essentials checklist</h3><div className="grid sm:grid-cols-2 gap-2">{result.checks.map(check => <div key={check.label} className="rounded-lg bg-gray-50 p-3 flex items-start gap-2">{check.pass ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" /> : <Circle size={16} className="text-amber-600 shrink-0 mt-0.5" />}<div><p className="text-sm font-medium">{check.label}</p><p className="text-xs text-gray-500 mt-1">{check.pass ? 'Detected in text' : check.tip}</p></div></div>)}</div></div>
      <details className="text-xs text-gray-500"><summary className="cursor-pointer font-medium">How this review works</summary><p className="mt-2 leading-relaxed">Coverage compares a limited dictionary of skill phrases and known aliases. It excludes unrelated words but may miss skills outside the dictionary. A mention is not proof of proficiency; negation and required versus optional skills are not interpreted. These are text checks, not an employer ATS score or hiring prediction. Review the full job description and only add skills you actually have.</p><ul className="mt-3 space-y-2">{result.suggestions.slice(3).map(tip => <li key={tip}>{tip}</li>)}</ul></details>
    </div>
  </section>
}
