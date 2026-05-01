import { describe, it, expect } from 'vitest';
import { helper_60_1 } from '../../src/utils/nftAutomatedHelper_60_1.js';

describe('nftAutomatedHelper_60_1', () => {
    it('should return the correct helper metadata', () => {
        const metadata = helper_60_1();
        expect(metadata.id).toBe('helper_60_1');
        expect(metadata.pr).toBe(60);
        expect(metadata.commit).toBe(1);
    });
});
