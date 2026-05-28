import { describe, it, expect } from 'vitest';
import { helper_120_3 } from '../../src/utils/nftAutomatedHelper_120_3.js';

describe('nftAutomatedHelper_120_3', () => {
    it('should return the correct helper metadata', () => {
        const metadata = helper_120_3();
        expect(metadata.id).toBe('helper_120_3');
        expect(metadata.pr).toBe(120);
        expect(metadata.commit).toBe(3);
    });
});
