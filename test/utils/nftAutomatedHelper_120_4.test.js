import { describe, it, expect } from 'vitest';
import { helper_120_4 } from '../../src/utils/nftAutomatedHelper_120_4.js';

describe('nftAutomatedHelper_120_4', () => {
    it('should return the correct helper metadata', () => {
        const metadata = helper_120_4();
        expect(metadata.id).toBe('helper_120_4');
        expect(metadata.pr).toBe(120);
        expect(metadata.commit).toBe(4);
    });
});
