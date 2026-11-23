export function parseEuroPriceInCents(text: string): number | undefined {
    const amount = text.replace(/[€\s]/g, "");

    if (!text.includes("€") || !/^\d+(?:[.,]\d{3})*[.,]\d{2}$/.test(amount)) {
        return undefined;
    }

    return Number(amount.replace(/[.,]/g, ""));
}
