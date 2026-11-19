import { Before, After, Given, When,Then, setDefaultTimeout } from "@cucumber/cucumber";
import { chromium, Browser } from "playwright";
import { AmazonPage, type ProductCandidate } from "../../pages/AmazonPage";
import { BasketPage } from "../../pages/BasketPage";
import { AccountPage } from "../../pages/AccountPage";


let browser: Browser | undefined;
let amazonPage: AmazonPage;
let basketPage: BasketPage;
let accountPage: AccountPage;
let addedProducts: ProductCandidate[] = [];

setDefaultTimeout(30_000);

Before(async function () {

  addedProducts = [];
  browser = await chromium.launch({ headless: false });

  const context = await browser.newContext({
    locale: "de-DE",
  });

  const page = await context.newPage();
  amazonPage = new AmazonPage(page);
  basketPage = new BasketPage(page);
  accountPage = new AccountPage(page);

});

After(async function () {
  await browser?.close();
  browser = undefined;
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
  "the basket should contain the 2 expected products",
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

