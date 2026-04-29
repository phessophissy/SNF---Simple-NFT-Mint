import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const manifestPath = new URL('../public/manifest.webmanifest', import.meta.url);
const serviceWorkerPath = new URL('../public/sw.js', import.meta.url);

describe('pwa assets', () => {
  it('defines a standalone web manifest', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(manifest.display).toBe('standalone');
    expect(manifest.name).toContain('Simple NFT');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  it('contains cache bootstrap logic in the service worker', () => {
    const serviceWorker = readFileSync(serviceWorkerPath, 'utf8');
    expect(serviceWorker).toContain('CACHE_NAME');
    expect(serviceWorker).toContain("self.addEventListener('install'");
    expect(serviceWorker).toContain("self.addEventListener('fetch'");
  });
});
