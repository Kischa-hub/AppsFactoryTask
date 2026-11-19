import { Page, Locator } from "playwright";
import { expect } from "@playwright/test";
export type ProductCandidate = {
    asin: string;
    name: string;
    priceInCents: number;
};

export class AmazonPage {
    private readonly searchBox: Locator;
    private readonly searchButton: Locator;
    private readonly rejectCookiesButton: Locator;
    private readonly sortDropdown: Locator;

    constructor(private readonly page: Page) {
        this.searchBox = page.getByRole("searchbox", {
            name: /^(Search Amazon\.de|Amazon\.de durchsuchen)$/i,
        });
        this.searchButton = page.getByRole("search").getByRole("button", {
            name: /^(Go|Los|Suchen)$/i,
        });
        this.rejectCookiesButton = page.getByRole("button", {
            name: /^(Decline|Reject all|Ablehnen|Alle ablehnen)$/i,
        });
        this.sortDropdown = page.getByRole("combobox", {
            name: /^(Sort by|Sortieren nach):?$/i,
        });
    }

    async open(): Promise<void> {
        await this.page.goto("https://www.amazon.de/");

        if (await this.rejectCookiesButton.isVisible()) {
            await this.rejectCookiesButton.click();
            await expect(this.rejectCookiesButton).toBeHidden();
        }

        await expect(this.searchBox).toBeVisible();
    }

    async search(product: string): Promise<void> {
        await this.searchBox.fill(product);
        await this.searchButton.click();

        await expect(this.page).toHaveURL(
            url =>
                url.pathname === "/s" &&
                url.searchParams.get("k") === product
        );
    }

    async sortByLowestPrice(): Promise<void> {
        await this.sortDropdown.selectOption("price-asc-rank");
        await expect(this.page).toHaveURL(
            url => url.searchParams.get("s") === "price-asc-rank"
        );
        await expect(this.sortDropdown).toHaveValue("price-asc-rank");
    }
//notes kareem
    async findCheapestProduct(product: string): Promise<ProductCandidate> {
        const cards = this.page.locator(
            '[data-component-type="s-search-result"][data-asin]:not([data-asin=""])'
        );

        await expect(cards.first()).toBeVisible();

        // Wait for priced results before reading the cards.
        await expect(
            cards.locator(".a-price:not(.a-text-price)").first()
        ).toBeVisible();

        const candidates: ProductCandidate[] = [];

        for (const card of await cards.all()) {
            const name = (await card.getByRole("heading", { level: 2 }).allTextContents())
                .join(" ")
                .trim();

            if (!name.toLowerCase().includes(product.toLowerCase())) {
                continue;
            }

            // Exclude unit prices and crossed-out reference prices.
            const price = card.locator(".a-price:not(.a-text-price)").first();

            if (await price.count() === 0) {
                continue;
            }

            const currency = await price.locator(".a-price-symbol").textContent();

            if (currency?.trim() !== "€") {
                continue;
            }

            const wholeText = await price.locator(".a-price-whole").textContent();
            const fractionText = await price.locator(".a-price-fraction").textContent();

            const whole = wholeText?.replace(/\D/g, "") ?? "";
            const fraction = fractionText?.trim() ?? "";

            if (!whole || !/^\d{2}$/.test(fraction)) {
                throw new Error(`Cannot read the purchase price for "${name}".`);
            }

            const asin = await card.getAttribute("data-asin");

            if (!asin) {
                continue;
            }

            candidates.push({
                asin,
                name,
                priceInCents: Number(whole) * 100 + Number(fraction),
            });
        }

        candidates.sort((a, b) => a.priceInCents - b.priceInCents);

        const cheapest = candidates[0];

        if (!cheapest) {
            throw new Error(`No priced results found for "${product}".`);
        }

        return cheapest;
    }

    async addProductToBasket(product: ProductCandidate): Promise<void> {
        // Open the exact product identified in the search results.
        await this.page.goto(
            `https://www.amazon.de/dp/${product.asin}`
        );

       await expect(this.page.locator("span#productTitle")).toBeVisible();

        // Check that Amazon has loaded the expected product.
        await expect(
            this.page.locator('input[name="ASIN"]').first()
        ).toHaveValue(product.asin);

        const addButton = this.page.locator("#buybox").getByRole("button", {
            name: /^(Add to basket|Add to Shopping Basket|In den Einkaufswagen)$/i,
        });

        await expect(
            addButton,
            `Product "${product.name}" must be available to add`
        ).toBeVisible();

        await expect(addButton).toBeEnabled();

        // Read the visible main purchase price.
        const price = this.page.locator(
            "#corePriceDisplay_desktop_feature_div " +
            ".a-price:not(.a-text-price):visible"
        ).first();

        await expect(price).toBeVisible();

        await expect(price.locator(".a-price-symbol")).toHaveText("€");

        const wholeText = await price
            .locator(".a-price-whole")
            .textContent();

        const fractionText = await price
            .locator(".a-price-fraction")
            .textContent();

        const whole = wholeText?.replace(/\D/g, "") ?? "";
        const fraction = fractionText?.trim() ?? "";

        if (!whole || !/^\d{2}$/.test(fraction)) {
            throw new Error(`Cannot read the price for "${product.name}".`);
        }

        const currentPriceInCents =
            Number(whole) * 100 + Number(fraction);

        // Do not silently accept a different price.
        expect(
            currentPriceInCents,
            "The product price should match the search result price"
        ).toBe(product.priceInCents);

        // Some products have no quantity selector because only one is allowed.
        const quantity = this.page.locator("#buybox").getByRole("combobox", {
            name: /^(Quantity|Menge|Anzahl):?$/i,
        });

        if (await quantity.isVisible()) {
            await quantity.selectOption("1");
            await expect(quantity).toHaveValue("1");
        }

        const cartCount = this.page.locator("#nav-cart-count");

        await expect(cartCount).toHaveText(/^\d+$/);

        const previousCount = Number(await cartCount.textContent());

        await addButton.click();

        await expect(cartCount).toHaveText(
            String(previousCount + 1),
            { timeout: 15_000 }
        );
    }

    async addCheapestProduct(product: string): Promise<ProductCandidate> {
  await this.search(product);
  await this.sortByLowestPrice();

  const cheapest = await this.findCheapestProduct(product);

  await this.addProductToBasket(cheapest);

  return cheapest;
    }

}
