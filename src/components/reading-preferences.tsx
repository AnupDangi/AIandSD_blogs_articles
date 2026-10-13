export function ReadingPreferences({
  size,
  onSizeChange,
}: {
  size: number;
  onSizeChange: (size: number) => void;
}) {
  return (
    <div className="reading-preferences" role="group" aria-label="Reading preferences">
      <span>Reading text</span>
      <div className="reading-size-control" role="group" aria-label="Text size">
        <button type="button" aria-label="Decrease text size" disabled={size <= 16} onClick={() => onSizeChange(Math.max(16, size - 1))}>A−</button>
        <output aria-live="polite">{size}px</output>
        <button type="button" aria-label="Increase text size" disabled={size >= 22} onClick={() => onSizeChange(Math.min(22, size + 1))}>A+</button>
      </div>
    </div>
  );
}
