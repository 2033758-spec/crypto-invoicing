/**
 * Seams — fixed vertical grid hairlines spanning the page width.
 * Matches `.seams` in globals.css: 14 columns capped at --max-width.
 */
export default function Seams() {
  return (
    <div className="seams" aria-hidden>
      {Array.from({ length: 14 }).map((_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}
