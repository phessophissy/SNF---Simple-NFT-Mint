import { describe, it, expect } from 'vitest';
import { helper_126_4 } from '../../src/utils/nftAutomatedHelper_126_4.js';

describe('nftAutomatedHelper_126_4', () => {
    it('should return the correct helper metadata', () => {
        const metadata = helper_126_4();
        expect(metadata.id).toBe('helper_126_4');
        expect(metadata.pr).toBe(126);
        expect(metadata.commit).toBe(4);
    });
});
