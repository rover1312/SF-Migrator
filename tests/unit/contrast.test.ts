/**
 * WCAG 2.2 contrast benchmark (SC 1.4.3 / 1.4.11).
 * Targets: normal text >= 4.5:1, large text (>= 18.66px bold) >= 3:1.
 * Glass panels are approximated by the solid color directly behind the text.
 */

function luminance(hex: string): number {
  const rgb = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function ratio(fg: string, bg: string): number {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

const PAIRS: { name: string; fg: string; bg: string; min: number }[] = [
  { name: 'body ink on backdrop', fg: '#3c4358', bg: '#e4e8f2', min: 4.5 },
  { name: 'body ink on panel white', fg: '#3c4358', bg: '#ffffff', min: 4.5 },
  { name: 'muted text on panel', fg: '#5f6b87', bg: '#ffffff', min: 4.5 },
  { name: 'link accent on panel', fg: '#7c3a6d', bg: '#ffffff', min: 4.5 },
  { name: 'button text on accent', fg: '#ffffff', bg: '#a94e80', min: 4.5 },
  { name: 'pip number on preset', fg: '#5f6b87', bg: '#e9edf6', min: 4.5 },
  { name: 'notice error text', fg: '#a33b3b', bg: '#f8d9d4', min: 4.5 },
  { name: 'notice ok text', fg: '#1a6547', bg: '#d9ead0', min: 4.5 },
  { name: 'notice warn text', fg: '#7c5a0d', bg: '#f9e8c0', min: 4.5 },
  { name: 'notice info text', fg: '#2b5f8a', bg: '#d5e7f3', min: 4.5 },
  { name: 'gauge text on fill', fg: '#ffffff', bg: '#a94e80', min: 4.5 },
  { name: 'lamp label on pill', fg: '#3c4358', bg: '#ffffff', min: 4.5 },
  { name: 'code text on terminal', fg: '#f3cfe0', bg: '#2b1c26', min: 4.5 },
  { name: 'input text on well', fg: '#3c4358', bg: '#ffffff', min: 4.5 },
];

describe('wcag contrast benchmark', () => {
  it('prints the full scorecard', () => {
    const rows = PAIRS.map((p) => {
      const value = ratio(p.fg, p.bg);
      return `${p.name}: ${value.toFixed(2)}:1 (needs ${p.min}:1) ${value >= p.min ? 'PASS' : 'FAIL'}`;
    });
    // eslint-disable-next-line no-console
    console.log(`\nCONTRAST SCORECARD\n${rows.join('\n')}`);
  });

  it.each(PAIRS.map((p) => [p.name, p.fg, p.bg, p.min]))(
    '%s meets WCAG AA',
    (_name, fg, bg, min) => {
      expect(ratio(fg as string, bg as string)).toBeGreaterThanOrEqual(min as number);
    },
  );
});
