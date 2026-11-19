import { Page, Locator } from "playwright";
import { expect } from "@playwright/test";
import type { ProductCandidate } from "./AmazonPage";

export class BasketPage {
    private readonly items: Locator;
    private readonly subtotal: Locator;

    constructor(private readonly page: Page) {
        this.items = page.locator("#sc-active-cart .sc-list-item[data-asin]");

        this.subtotal = page.locator("#sc-subtotal-amount-buybox");
    }

    async open(): Promise<void> {
        await this.page.goto(
            "https://www.amazon.de/gp/cart/view.html"
        );

        await expect(this.subtotal).toBeVisible();
    }

    async verifyProducts(
        expectedProducts: ProductCandidate[]
    ): Promise<void> {
        expect(expectedProducts.length).toBeGreaterThan(0);

        // Ensure there are no missing or extra product rows.
        await expect(this.items).toHaveCount(expectedProducts.length);

        for (const product of expectedProducts) {
            const item = this.page.locator(
                `#sc-active-cart .sc-list-item[data-asin="${product.asin}"]`
            );

            await expect(item).toHaveCount(1);

            await expect(item).toHaveAttribute(
                "data-asin",
                product.asin
            );

            await expect(
                item.locator('input[name="quantityBox"]')
            ).toHaveValue("1");

            const price = item.locator(
                ".a-price:not(.a-text-price) .a-offscreen"
            ).first();

            await expect.poll(
                () => this.readEuroPrice(price),
                { message: `Check the basket price for "${product.name}"` }
            ).toBe(product.priceInCents);
        }
    }

    async verifySubtotal(
        expectedProducts: ProductCandidate[]
    ): Promise<void> {
        expect(expectedProducts.length).toBeGreaterThan(0);

        let expectedTotal = 0;

        for (const product of expectedProducts) {
            expectedTotal += product.priceInCents;
        }

        await expect.poll(
            () => this.readEuroPrice(this.subtotal),
            { message: "Basket subtotal should equal the saved prices" }
        ).toBe(expectedTotal);
    }

    private async readEuroPrice(locator: Locator): Promise<number> {
        const text = await locator.textContent() ?? "";

        if (!text.includes("€")) {
            throw new Error(`Expected a euro price, received "${text}".`);
        }

        const amount = text.replace(/[€\s]/g, "");

        // Accept prices such as €3.24, 3,24 €, and 1.234,56 €.
        if (!/^\d+(?:[.,]\d{3})*[.,]\d{2}$/.test(amount)) {
            throw new Error(`Cannot read euro price "${text}".`);
        }

        const whole = amount.slice(0, -3).replace(/[.,]/g, "");
        const fraction = amount.slice(-2);

        return Number(whole) * 100 + Number(fraction);
    }

    async proceedToCheckout(): Promise<void> {
  const checkoutButton = this.page.locator(
    'input[name="proceedToRetailCheckout"]'
  );

  await expect(checkoutButton).toBeVisible();
  await expect(checkoutButton).toBeEnabled();

  await checkoutButton.click();
}

}