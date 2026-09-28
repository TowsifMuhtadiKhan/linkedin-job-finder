import JobCard from './JobCard'

export default function JobList({ jobs, viewMode = 'card' }) {
  if (!jobs || jobs.length === 0) return null

  if (viewMode === 'list') {
    return (
      <div className="flex flex-col gap-2">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} viewMode="list" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} viewMode="card" />
      ))}
    </div>
  )
}
