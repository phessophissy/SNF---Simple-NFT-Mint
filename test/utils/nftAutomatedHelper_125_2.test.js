import { describe, it, expect } from 'vitest';
import { helper_125_2 } from '../../src/utils/nftAutomatedHelper_125_2.js';

describe('nftAutomatedHelper_125_2', () => {
    it('should return the correct helper metadata', () => {
        const metadata = helper_125_2();
        expect(metadata.id).toBe('helper_125_2');
        expect(metadata.pr).toBe(125);
        expect(metadata.commit).toBe(2);
    });
});
