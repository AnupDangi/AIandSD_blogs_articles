import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function SourceDraftReader({ markdown, sourcePath, reviewed, showHeading = true, showEditorialNote = true }: { markdown: string | null; sourcePath: string; reviewed: boolean; showHeading?: boolean; showEditorialNote?: boolean }) {
  return (
    <section className="source-reading" aria-labelledby={showHeading ? "source-reading-heading" : undefined}>
      {showHeading && <div className="source-reading-heading">
        <div>
          <span className="eyebrow">PRIMARY READING · {reviewed ? "REVIEWED" : "EDITORIAL REVIEW IN PROGRESS"}</span>
          <h2 id="source-reading-heading">Chapter source</h2>
          <p>From <code>{sourcePath}</code></p>
        </div>
        <span className={`source-review-badge ${reviewed ? "source-reviewed" : ""}`}>{reviewed ? "Reviewed" : "Working draft"}</span>
      </div>}
      {markdown ? (
        <div className="source-markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
            h1() {
              return null;
            },
            h2({ children }) {
              return <h3>{children}</h3>;
            },
            h3({ children }) {
              return <h4>{children}</h4>;
            },
            h4({ children }) {
              return <h5>{children}</h5>;
            },
            h5({ children }) {
              return <h6>{children}</h6>;
            },
            h6({ children }) {
              return <h6>{children}</h6>;
            },
            table({ children }) {
              return <div className="source-table-scroll" role="region" aria-label="Scrollable source table" tabIndex={0}><table>{children}</table></div>;
            },
          }}>{markdown}</ReactMarkdown>
        </div>
      ) : (
        <div className="source-unavailable" role="status">
          The mapped chapter draft could not be loaded. Use the course source link or return later while the content is repaired.
        </div>
      )}
      {showEditorialNote && !reviewed && <p className="source-editorial-note">This source is retained from the handbook and is still being edited. It may contain extraction artifacts, incomplete references, or formatting issues.</p>}
    </section>
  );
}
