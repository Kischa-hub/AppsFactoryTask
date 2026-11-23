import { join } from "node:path";
import { Before, After, Given, When, Then, Status, setDefaultTimeout } from "@cucumber/cucumber";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { AmazonPage, type ProductCandidate } from "../../pages/AmazonPage";
import { BasketPage } from "../../pages/BasketPage";
import { AccountPage } from "../../pages/AccountPage";
import { captureFailureArtifacts } from "../../utils/failureArtifacts";


let browser: Browser | undefined;
let context: BrowserContext | undefined;
let page: Page | undefined;
let tracingStarted = false;
let amazonPage: AmazonPage;
let basketPage: BasketPage;
let accountPage: AccountPage;
let addedProducts: ProductCandidate[] = [];

setDefaultTimeout(30_000);

Before(async function () {

  addedProducts = [];
  browser = await chromium.launch({
    channel: "chrome",
    headless: process.env.CI === "true",
  });

  context = await browser.newContext({
    locale: "de-DE",
  });

  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  tracingStarted = true;

  page = await context.newPage();
  amazonPage = new AmazonPage(page);
  basketPage = new BasketPage(page);
  accountPage = new AccountPage(page);

});

After(async function ({ result, testCaseStartedId }) {
  try {
    if (result?.status === Status.FAILED && context) {
      const artifactDir = join("reports", "failures", testCaseStartedId);
      const { screenshot, trace } = await captureFailureArtifacts(
        artifactDir,
        page,
        tracingStarted ? context.tracing : undefined,
      );
      for (const capture of [screenshot, trace]) {
        if (capture.status === "rejected") {
          console.warn("Could not capture a failure artifact:", capture.reason);
        }
      }
      await Promise.all([
        screenshot.status === "fulfilled" && screenshot.value
          ? this.attach(screenshot.value, "image/png")
          : undefined,
        trace.status === "fulfilled" && trace.value
          ? this.attach(`Playwright trace: ${trace.value}`)
          : undefined,
      ]);
    } else if (tracingStarted) {
      await context?.tracing.stop();
    }
  } catch (error) {
    console.warn("Could not finish collecting scenario diagnostics:", error);
  } finally {
    const scenarioBrowser = browser;
    browser = undefined;
    context = undefined;
    page = undefined;
    tracingStarted = false;
    await scenarioBrowser?.close();
  }
});

Given("a new guest opens the Amazon homepage", async function () {
  await amazonPage.open();
});

When(
  "the guest searches for {string}",
  async function (product: string) {
    await amazonPage.search(product);
  }
);

When(
  "sorts the results by price from low to high",
  async function () {
    await amazonPage.sortByLowestPrice();
  }
);

When(
  "the guest adds the cheapest priced matching {string} to the basket",
  { timeout: 120_000 },
  async function (product: string) {
    const addedProduct = await amazonPage.addCheapestProduct(product);

    addedProducts.push(addedProduct);

    console.log(
      `Added: ${addedProduct.name}\n` +
      `Price: €${(addedProduct.priceInCents / 100).toFixed(2)}\n` +
      `Products added: ${addedProducts.length}`
    );
  }
);

Then(
  "the basket should contain the expected products",
  async function () {
    await basketPage.open();
    await basketPage.verifyProducts(addedProducts);
  }
);

Then(
  "the basket item subtotal should equal the sum of the selected prices",
  async function () {
    await basketPage.verifySubtotal(addedProducts);
  }
);

When(
  "the guest proceeds to checkout",
  async function () {
    await basketPage.proceedToCheckout();
  }
);

Then(
  "Amazon should ask the guest to sign in or create an account",
  async function () {
    await accountPage.verifyGuestCheckoutRedirect();
  }
);

