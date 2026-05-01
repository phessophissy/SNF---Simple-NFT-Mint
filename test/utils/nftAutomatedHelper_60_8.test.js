import { describe, it, expect } from 'vitest';
import { helper_60_8 } from '../../src/utils/nftAutomatedHelper_60_8.js';

describe('nftAutomatedHelper_60_8', () => {
    it('should return the correct helper metadata', () => {
        const metadata = helper_60_8();
        expect(metadata.id).toBe('helper_60_8');
        expect(metadata.pr).toBe(60);
        expect(metadata.commit).toBe(8);
    });
});
