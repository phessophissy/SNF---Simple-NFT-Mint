import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('app shell markup', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  it('includes command center and operator controls', () => {
    expect(html).toContain('command-center-btn');
    expect(html).toContain('command-modal');
    expect(html).toContain('export-snapshot-btn');
    expect(html).toContain('focus-mode-btn');
  });

  it('includes global pulse and session telemetry sections', () => {
    expect(html).toContain('global-pulse');
    expect(html).toContain('world-clocks');
    expect(html).toContain('session-strip');
  });
});
