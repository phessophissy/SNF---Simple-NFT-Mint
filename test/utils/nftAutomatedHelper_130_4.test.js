import { describe, it, expect } from 'vitest';
import { helper_130_4 } from '../../src/utils/nftAutomatedHelper_130_4.js';

describe('nftAutomatedHelper_130_4', () => {
    it('should return the correct helper metadata', () => {
        const metadata = helper_130_4();
        expect(metadata.id).toBe('helper_130_4');
        expect(metadata.pr).toBe(130);
        expect(metadata.commit).toBe(4);
    });
});
