import { describe, it, expect } from 'vitest';
import { helper_120_2 } from '../../src/utils/nftAutomatedHelper_120_2.js';

describe('nftAutomatedHelper_120_2', () => {
    it('should return the correct helper metadata', () => {
        const metadata = helper_120_2();
        expect(metadata.id).toBe('helper_120_2');
        expect(metadata.pr).toBe(120);
        expect(metadata.commit).toBe(2);
    });
});
