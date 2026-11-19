import { errors, Page } from "playwright";
import { expect } from "@playwright/test";

export async function dismissCookieBanner(page: Page): Promise<void> {
    const rejectCookiesButton = page.getByRole("button", {
        name: /^(Decline|Reject all|Ablehnen|Alle ablehnen)$/i,
    });

    // The banner is optional and may appear shortly after navigation.
    try {
        await rejectCookiesButton.waitFor({ state: "visible", timeout: 2_000 });
    } catch (error) {
        if (error instanceof errors.TimeoutError) {
            return;
        }
        throw error;
    }

    await rejectCookiesButton.click();
    await expect(rejectCookiesButton).toBeHidden();
}
