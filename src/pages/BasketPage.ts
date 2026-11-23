import { Page, Locator } from "playwright";
import { expect } from "@playwright/test";
import type { ProductCandidate } from "./AmazonPage";
import { dismissCookieBanner } from "../utils/cookies";
import { parseEuroPriceInCents } from "../utils/price";

export class BasketPage {
    private readonly items: Locator;
    private readonly subtotal: Locator;

    constructor(private readonly page: Page) {
        this.items = page.locator("#sc-active-cart .sc-list-item[data-asin]");

        this.subtotal = page.locator("#sc-subtotal-amount-buybox");
    }

    async open(): Promise<void> {
        await this.page.goto("https://www.amazon.de/gp/cart/view.html");
        await dismissCookieBanner(this.page);
        await expect(this.subtotal).toBeVisible();
    }

    async verifyProducts(expectedProducts: ProductCandidate[]): Promise<void> {
        const actualProductCount = await this.items.count();
        const expectedProductCount = expectedProducts.length;
        expect(actualProductCount).toBe(expectedProductCount);
        expect(new Set(expectedProducts.map((product) => product.asin)).size).toBe(expectedProductCount);

        for (const product of expectedProducts) {
            const item = this.items.and(this.page.locator(`[data-asin=${JSON.stringify(product.asin)}]`));
            await expect(item, `Expected one basket row for ASIN ${product.asin}`).toHaveCount(1);
            await expect(item, `Expected product name on the row for ASIN ${product.asin}`)
                .toContainText(product.name, { ignoreCase: true });
        }
    }

    async verifySubtotal(expectedProducts: ProductCandidate[]): Promise<void> {
        let expectedTotal = 0;

        for (const product of expectedProducts) {
            expectedTotal += product.priceInCents;
        }

        const text = await this.subtotal.innerText();
        const actualTotal = parseEuroPriceInCents(text);

        if (actualTotal === undefined) {
            throw new Error(`Cannot read basket subtotal "${text}".`);
        }

        expect(actualTotal).toBe(expectedTotal);
    }

    async proceedToCheckout(): Promise<void> {
        await dismissCookieBanner(this.page);
        const checkoutButton = this.page.getByRole("button", {
            name: /^(Proceed to checkout|Zur Kasse)\b/i,
        });

        await expect(checkoutButton).toBeVisible();
        await expect(checkoutButton).toBeEnabled();

        await checkoutButton.click();
    }

}
