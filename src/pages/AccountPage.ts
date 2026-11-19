import { Page } from "playwright";
import { expect } from "@playwright/test";

export class AccountPage {
  constructor(private readonly page: Page) {}

  async verifyGuestCheckoutRedirect(): Promise<void> {
    await expect(this.page).toHaveURL(
      url =>
        url.hostname === "www.amazon.de" &&
        url.pathname === "/ap/signin",
      { timeout: 15_000 }
    );

    await expect(
      this.page.getByRole("heading", { level: 1 })
    ).toHaveText(
      /sign in or create an account|anmelden oder (?:ein )?konto erstellen/i
    );

    await expect(
      this.page.getByRole("textbox", {
        name: /email|e-mail|mobil/i,
      })
    ).toBeVisible();

    await expect(
      this.page.getByRole("button", {
        name: /^(Continue|Weiter)$/i,
      })
    ).toBeVisible();
  }
}
