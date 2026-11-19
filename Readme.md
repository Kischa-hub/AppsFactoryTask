# AppsFactoryTask

Automated browser tests for the Amazon.de guest-shopping journey, written with Cucumber, Playwright, and TypeScript.

The main scenario searches for Snickers and Skittles, adds a selected product for each to the basket, checks the product names and item subtotal, and verifies that checkout asks the guest to sign in or create an account.

## Current status

The complete journey has passed in local testing. The latest reported GitHub Actions run failed: some scenarios could not find the homepage search field, and others selected non-candy products or rejected the displayed price format/currency. Investigation of those failures is pending. A successful local run does not establish that the hosted CI run will pass.

See [Known limitations and troubleshooting](#known-limitations-and-troubleshooting) before interpreting a failed run.

## Prerequisites

- Node.js **24.x** and npm. This matches the GitHub Actions configuration.
- Git, plus permission to clone this repository if it is private.
- A system supported by Playwright, such as a supported macOS, Windows, or Ubuntu installation. See [Playwright system requirements](https://playwright.dev/docs/intro#system-requirements).
- Internet access to GitHub, npm, the Playwright browser downloads, and Amazon.de.

Check your local tools:

```bash
node --version
npm --version
git --version
```

No Amazon account, API key, or `.env` file is required. Each scenario creates a fresh browser context without saved account state. Tests add products to a guest basket and stop at the account-entry page; they do not create an account or submit an order.

## Install and run

Run these commands from a terminal:

```bash
git clone https://github.com/Kischa-hub/AppsFactoryTask.git
cd AppsFactoryTask
npm ci
npx playwright install chromium
npm test -- --tags "@twoProducts&checkout"
```

On Ubuntu/Linux, install Chromium's required system dependencies as well:

```bash
npx playwright install --with-deps chromium
```

This may require administrator privileges. `npm ci` installs the dependency versions recorded in `package-lock.json`; the browser-install command downloads the corresponding Chromium build.

The browser opens visibly during a normal local run and closes after each scenario, including failures. Cucumber exits with code `0` when the selected scenarios pass and a nonzero code when they fail.

## Test commands

Run the complete suite:

```bash
npm test
```

Run a particular part of the journey by tag:

| Tag | Coverage |
| --- | --- |
| `@search` | Open Amazon.de and submit a search. |
| `@sort` | Search and select price from low to high. |
| `@add` | Select and add one product; runs separately for Snickers and Skittles. |
| `@twoProducts` | Add both products in the same guest session. |
| `@twoProducts2` | Add both products and verify basket names, row count, and subtotal. |
| `@twoProducts&checkout` | Complete basket verification and the guest-checkout account requirement. |

For example:

```bash
npm test -- --tags "@twoProducts2"
```

Keep tags in quotes, particularly the tag containing `&`, so the shell passes it as one argument.

Check TypeScript or check that feature steps are defined without opening a browser:

```bash
npx tsc --noEmit
npm test -- --dry-run
```

Cucumber is the test runner. Use `npm test`; the existing `test:playwright` script invokes a different runner and is not used by these feature files.

### Run without a browser window

Set `CI` to the exact string `true` to enable headless execution.

macOS/Linux:

```bash
CI=true npm test -- --tags "@twoProducts&checkout"
```

Windows PowerShell:

```powershell
$env:CI = "true"
npm test -- --tags "@twoProducts&checkout"
Remove-Item Env:CI
```

The final PowerShell command removes the setting so subsequent local runs open a browser window again.

## View reports

The Cucumber configuration writes reports after a run:

| File | Purpose |
| --- | --- |
| `reports/cucumber-report.html` | Human-readable scenario results, steps, and failure details. |
| `reports/cucumber-report.json` | Machine-readable results for other reporting tools. |

Open the HTML file in a browser through your file manager, or use:

| System | Command |
| --- | --- |
| macOS | `open reports/cucumber-report.html` |
| Windows PowerShell | `Start-Process reports/cucumber-report.html` |
| Linux desktop | `xdg-open reports/cucumber-report.html` |

Reports use fixed filenames and are replaced by subsequent runs. The `reports/` folder is excluded from Git. Automatic screenshots and browser traces are not currently captured.

## GitHub Actions

The workflow is defined in [`.github/workflows/cucumber.yml`](.github/workflows/cucumber.yml). It runs:

- On pushes to `main`.
- On pull requests targeting `main`.
- Manually through **Actions → Cucumber Tests → Run workflow** once the workflow is on the default branch.
- Daily at **00:00 Europe/Berlin**, including seasonal time changes. Scheduled runs use the default branch and may start late when GitHub is busy.

The job uses Ubuntu and Node.js 24, installs dependencies and Chromium, checks TypeScript, and runs `npm test`. It sets `CI=true` so Chromium runs headlessly. There is no deployment step.

To inspect a run:

1. Open the repository's [Actions tab](https://github.com/Kischa-hub/AppsFactoryTask/actions).
2. Select **Cucumber Tests**, then the relevant run.
3. Open the `test` job to inspect a failing step and its output.
4. In the run's **Artifacts** section, download `cucumber-reports`.
5. Extract the download and open `cucumber-report.html` in your browser.

Generated reports are uploaded for successful and failed test runs unless the workflow is cancelled. Artifacts are retained for seven days. If installation fails before Cucumber runs, a report may not exist.

## What the main scenario verifies

1. Search Amazon.de for each product and select **price: low to high**.
2. Select the first result card whose heading contains the search term, has a purchase price, and is not labelled `Sponsored` or `Gesponsert`.
3. Save its ASIN, displayed name, and price, then click **Add to basket** directly on that card.
4. Confirm the basket count increases after each addition.
5. Check that the active basket contains exactly two product rows and that each saved name matches one row. Matching uses name containment; Amazon may append descriptions to the basket title. Basket order does not matter.
6. Sum the saved prices in integer cents and compare that sum with the displayed item subtotal.
7. Proceed to checkout and verify Amazon's `/ap/signin` page and its sign-in/create-account form.

“Cheapest” relies on Amazon's sorting and means the first eligible result on the current sorted page. The test does not independently compare every price, calculate price per kilogram, or include delivery charges in the expected subtotal. Separate per-product quantity assertions are not currently implemented.

## Project structure

```text
AppsFactoryTask/
├── .github/workflows/cucumber.yml       # CI triggers, test job, report upload
├── config/cucumber.json                # Feature paths, TypeScript loading, reports
├── src/
│   ├── pages/
│   │   ├── AmazonPage.ts               # Search, sort, select, and add products
│   │   ├── BasketPage.ts               # Basket checks and checkout action
│   │   └── AccountPage.ts              # Account-entry page assertions
│   ├── tests/
│   │   ├── features/amazonFeature.feature
│   │   └── stepsDefinitions/amazonSteps.ts
│   └── utils/cookies.ts                # Shared optional cookie-banner dismissal
├── package.json
├── package-lock.json
├── tsconfig.json
└── Readme.md
```

Cucumber runs the Gherkin feature files, Playwright controls Chromium and supplies assertions, and TypeScript is loaded through `ts-node`. The code follows the Page Object Model (POM): step definitions manage the browser lifecycle and pass saved products to page objects, which contain locators, interactions, and assertions. The cookie utility handles supported English/German rejection buttons and allows up to two seconds for a delayed banner.

## Change test data or configuration

- **Products:** edit the `Examples` row for the scenario you run in [`amazonFeature.feature`](src/tests/features/amazonFeature.feature). Basket-verification scenarios expect exactly two products. Prices are captured during the run rather than hardcoded.
- **Runner and report paths:** edit [`config/cucumber.json`](config/cucumber.json).
- **Browser and locale:** configured in the `Before` hook in [`amazonSteps.ts`](src/tests/stepsDefinitions/amazonSteps.ts). The documented suite uses Chromium and the `de-DE` locale.
- **Schedule:** edit the `schedule` section in [the workflow](.github/workflows/cucumber.yml), then commit and push it to the default branch.

Changing the browser locale does not set Amazon's delivery country or guarantee a particular currency.

## Known limitations and troubleshooting

These tests exercise the live Amazon website. Catalog results, prices, delivery location, language, and page layouts can differ between local and GitHub-hosted execution.

| Symptom | Meaning and next step |
| --- | --- |
| Chromium executable is missing | Run `npx playwright install chromium`; on Linux, use `--with-deps` to install system dependencies too. |
| `Missing X server or $DISPLAY` | The process is trying to open a visible browser without a desktop display. Set `CI=true` for headless execution. |
| Homepage search field is not found | Inspect the actual page before changing the locator or timeout. The latest CI logs do not establish whether the cause is a different page, label, loading delay, or a challenge. |
| Clothing or stickers are selected | Matching a product name alone does not guarantee candy. The reported CI run selected Snickers workwear and a Skittles sticker. Category/search-relevance refinement is pending. |
| `Cannot read the purchase price` | Selection expects a euro purchase price with two decimal digits. Capture the actual price text and check currency/format; those details are not currently logged automatically. |
| Basket name or total assertion fails | Inspect the selected product names/prices in the terminal output and the Cucumber report. Product availability, prices, or basket content may differ from the expected data. |
| A CAPTCHA or access challenge appears | The live site may prevent the automated journey. Record it as a blocked/failed run rather than treating it as a successful functional test. |

The checkout assertion covers the shared sign-in/create-account entry page. It does not verify a dedicated registration form, submit registration details, or complete a purchase.

When reporting a failure, include the command or selected tag, Node.js version, whether `CI=true` was set, the GitHub run link if applicable, and the relevant Cucumber report. Page URL, title, screenshot, and rejected price text are useful additional evidence when available.
