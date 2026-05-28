import { describe, it, expect } from 'vitest';
import { helper_120_5 } from '../../src/utils/nftAutomatedHelper_120_5.js';

describe('nftAutomatedHelper_120_5', () => {
    it('should return the correct helper metadata', () => {
        const metadata = helper_120_5();
        expect(metadata.id).toBe('helper_120_5');
        expect(metadata.pr).toBe(120);
        expect(metadata.commit).toBe(5);
    });
});
