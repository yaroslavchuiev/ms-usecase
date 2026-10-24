import "server-only";

/** DATA_MODE=live reads from Salesforce; anything else (default) uses the Salesforce-shaped mock data. */
export const isLiveMode = () => process.env.DATA_MODE === "live";
