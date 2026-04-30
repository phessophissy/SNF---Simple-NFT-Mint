export const nftHelper_1_1 = (metadata) => {
    // Utility function for NFT metadata processing
    return {
        ...metadata,
        enhanced: true,
        batch: 1,
        step: 1,
        timestamp: new Date().toISOString()
    };
};
