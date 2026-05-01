import { describe, it, expect } from 'vitest';
import { helper_60_10 } from '../../src/utils/nftAutomatedHelper_60_10.js';

describe('nftAutomatedHelper_60_10', () => {
    it('should return the correct helper metadata', () => {
        const metadata = helper_60_10();
        expect(metadata.id).toBe('helper_60_10');
        expect(metadata.pr).toBe(60);
        expect(metadata.commit).toBe(10);
    });
});
