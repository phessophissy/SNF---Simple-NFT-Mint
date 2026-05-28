import { describe, it, expect } from 'vitest';
import { helper_127_4 } from '../../src/utils/nftAutomatedHelper_127_4.js';

describe('nftAutomatedHelper_127_4', () => {
    it('should return the correct helper metadata', () => {
        const metadata = helper_127_4();
        expect(metadata.id).toBe('helper_127_4');
        expect(metadata.pr).toBe(127);
        expect(metadata.commit).toBe(4);
    });
});
