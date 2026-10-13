/** Trigger a browser download of a text payload (CSV, TXT, …). */
export function downloadText(
  filename: string,
  contents: string,
  mime = 'text/plain',
): void {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Save an image (URL or data URI) to disk. */
export function downloadImage(filename: string, href: string): void {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>,
): void {
  const lines = [headers, ...rows].map((row) => row.map(csvEscape).join(','));
  downloadText(filename, `\uFEFF${lines.join('\n')}`, 'text/csv');
}