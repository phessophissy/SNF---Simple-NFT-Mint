import { describe, it, expect } from 'vitest';
import { helper_128_4 } from '../../src/utils/nftAutomatedHelper_128_4.js';

describe('nftAutomatedHelper_128_4', () => {
    it('should return the correct helper metadata', () => {
        const metadata = helper_128_4();
        expect(metadata.id).toBe('helper_128_4');
        expect(metadata.pr).toBe(128);
        expect(metadata.commit).toBe(4);
    });
});
