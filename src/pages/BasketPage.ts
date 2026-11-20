import { Page, Locator } from "playwright";
import { expect } from "@playwright/test";
import type { ProductCandidate } from "./AmazonPage";
import { dismissCookieBanner } from "../utils/cookies";

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

        for (const product of expectedProducts) {
            const item = this.items.filter({ hasText: product.name });
            await expect(item).toHaveCount(1);
        }
    }

    async verifySubtotal(expectedProducts: ProductCandidate[]): Promise<void> {
        let expectedTotal = 0;

        for (const product of expectedProducts) {
            expectedTotal += product.priceInCents;
        }

        const text = await this.subtotal.innerText();
        const amount = text.replace(/[€\s]/g, "");

        if (!text.includes("€") || !/^\d+(?:[.,]\d{3})*[.,]\d{2}$/.test(amount)) {
            throw new Error(`Cannot read basket subtotal "${text}".`);
        }

        const actualTotal = Number(amount.replace(/[.,]/g, ""));
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
