import { Page, Locator } from "playwright";
import { expect } from "@playwright/test";
import { dismissCookieBanner } from "../utils/cookies";
export type ProductCandidate = {
    asin: string;
    name: string;
    priceInCents: number;
};

export class AmazonPage {
    private readonly searchBox: Locator;
    private readonly sortDropdown: Locator;

    constructor(private readonly page: Page) {
        this.searchBox = page.getByRole("searchbox", {
            name: /^(Search Amazon\.de|Amazon\.de durchsuchen)$/i,
        });
        this.sortDropdown = page.getByRole("combobox", {
            name: /^(Sort by|Sortieren nach):?$/i,
        });
    }

    async open(): Promise<void> {
        await this.page.goto("https://www.amazon.de/");

        await dismissCookieBanner(this.page);

        await expect(this.searchBox).toBeVisible();
    }

    async search(product: string): Promise<void> {
        await this.searchBox.fill(product);
        await this.searchBox.press("Enter");

        await expect(this.page).toHaveURL(
            url =>
                url.pathname === "/s" &&
                url.searchParams.get("k") === product
        );
        await dismissCookieBanner(this.page);
    }

    async sortByLowestPrice(): Promise<void> {
        await this.sortDropdown.selectOption("price-asc-rank");
        await expect(this.page).toHaveURL(
            url => url.searchParams.get("s") === "price-asc-rank"
        );
        await expect(this.sortDropdown).toHaveValue("price-asc-rank");
        await dismissCookieBanner(this.page);
    }

    async addCheapestProduct(product: string): Promise<ProductCandidate> {
        await this.search(product);
        await this.sortByLowestPrice();

        // Select the first eligible result in Amazon's sorted order.
        const priceSelector = ".a-price:not(.a-text-price) .a-offscreen";
        const cards = this.page.locator(
            '[data-component-type="s-search-result"][data-asin]:not([data-asin=""])'
        ).filter({
            has: this.page.getByRole("heading", { level: 2 }).filter({ hasText: product }),
            hasNot: this.page.getByText(/^(Sponsored|Gesponsert)$/i),
        }).filter({
            has: this.page.locator(priceSelector),
        });

        const card = cards.first();
        await expect(card).toBeVisible();

        const asin = await card.getAttribute("data-asin");
        if (!asin) {
            throw new Error(`The selected result for "${product}" has no product ID.`);
        }

        const name = (await card.getByRole("heading", { level: 2 }).allTextContents())
            .join(" ")
            .trim();
        const priceText = await card.locator(priceSelector).first().innerText();
        const amount = priceText.replace(/[€\s]/g, "");

        if (!priceText.includes("€") || !/^\d+(?:[.,]\d{3})*[.,]\d{2}$/.test(amount)) {
            throw new Error(`Cannot read the purchase price for "${name}".`);
        }

        // Add one item directly from this card and confirm success.
        const cartCount = this.page.locator("#nav-cart-count");
        await expect(cartCount).toHaveText(/^\d+$/);
        const previousCount = Number(await cartCount.textContent());

        await card.getByRole("button", {
            name: /^(Add to basket|Add to Shopping Basket|In den Einkaufswagen)$/i,
        }).click();

        await expect(cartCount).toHaveText(
            String(previousCount + 1),
            { timeout: 15_000 }
        );

        // Keep the selected details for the basket assertions.
        return {
            asin,
            name,
            priceInCents: Number(amount.replace(/[.,]/g, "")),
        };
    }

}
