import type { Vacancy } from '@/lib/types.ts';

export function VacancyFields({ vacancy }: { vacancy?: Vacancy }) {
  return (
    <div className="panel">
      <header><div><h2>{vacancy ? vacancy.title : 'New vacancy'}</h2><p>Shown at /careers while it is published and before its closing date.</p></div></header>
      <div className="body">
        <div className="grid-3">
          <div className="field">
            <label htmlFor="title">Job title</label>
            <input id="title" name="title" type="text" required maxLength={160} defaultValue={vacancy?.title} placeholder="Credit Officer" />
          </div>
          <div className="field">
            <label htmlFor="department">Department</label>
            <input id="department" name="department" type="text" maxLength={80} defaultValue={vacancy?.department ?? ''} placeholder="Credit" />
          </div>
          <div className="field">
            <label htmlFor="employment_type">Terms</label>
            <input id="employment_type" name="employment_type" type="text" maxLength={60} defaultValue={vacancy?.employment_type ?? 'Full time'} />
          </div>
        </div>
        <div className="grid-3">
          <div className="field" style={{ gridColumn: 'span 2' }}>
            <label htmlFor="location">Location</label>
            <input id="location" name="location" type="text" maxLength={120} defaultValue={vacancy?.location ?? 'Nairobi (Kilimani headquarters)'} />
          </div>
          <div className="field">
            <label htmlFor="closes_on">Closing date</label>
            <input id="closes_on" name="closes_on" type="date" defaultValue={vacancy?.closes_on ?? ''} />
            <p className="help">Leave empty for a rolling advert.</p>
          </div>
        </div>
        <div className="field">
          <label htmlFor="summary">One-line summary</label>
          <input id="summary" name="summary" type="text" maxLength={400} defaultValue={vacancy?.summary ?? ''} />
        </div>
        <div className="field">
          <label htmlFor="body">The advert</label>
          <textarea id="body" name="body" className="tall" required maxLength={20000} defaultValue={vacancy?.body ?? ''} />
          <p className="help">Say what the job is, who should apply and exactly how. Headings on a line of their own (no full stop) are shown as sub-headings.</p>
        </div>
        <div className="check-row">
          <input id="is_published" name="is_published" type="checkbox" value="1" defaultChecked={vacancy?.is_published ?? true} />
          <label htmlFor="is_published">Published</label>
        </div>
      </div>
    </div>
  );
}
