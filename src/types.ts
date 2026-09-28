export interface SearchCriteria {
  keywords: string[] | string
  location: string
  jobType: string
  experience: string
  datePosted: string
  remote: boolean
}
export interface Job {
  id: string
  title: string
  company: string | null
  location: string | null
  postedDate: string | null
  url: string
  logo: string | null
  savedAt?: string
}
export interface LinkedInProfile { name: string; email?: string; picture?: string }
export interface SearchResult { jobs: Job[]; total: number; hasMore: boolean }
export type ViewMode = 'card' | 'list'
export type SavedJobRow = {
  id: string; user_id: string; job_id: string; title: string; company: string | null
  location: string | null; url: string; logo: string | null; posted_date: string | null; saved_at: string
}
export interface Database {
  public: {
    Tables: {
      saved_jobs: {
        Row: SavedJobRow
        Insert: Omit<SavedJobRow, 'id' | 'saved_at'> & { id?: string; saved_at?: string }
        Update: Partial<SavedJobRow>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
  }
}
