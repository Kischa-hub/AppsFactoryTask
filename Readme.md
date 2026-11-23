# AppsFactoryTask

Automated browser tests for the Amazon.de guest-shopping journey, written with Cucumber, Playwright, and TypeScript.

The main scenario searches for Snickers and Skittles, adds a selected product for each to the basket, checks the product names and item subtotal, and verifies that checkout asks the guest to sign in or create an account.

## Prerequisites

- Node.js **24.x** and npm. This matches the GitHub Actions configuration.
- Google Chrome (stable), installed on the machine running the tests. See [Google Chrome](https://www.google.com/chrome/).
- Git, plus permission to clone this repository if it is private.
- A system supported by Playwright, such as a supported macOS, Windows, or Ubuntu installation. See [Playwright system requirements](https://playwright.dev/docs/intro#system-requirements).
- Internet access to GitHub, npm, Google Chrome downloads when installing the browser, and Amazon.de.

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
npm test -- --tags "@twoProducts&checkout"
```

Google Chrome must be installed before the test command runs. If it is already installed, no additional browser download is needed. If Chrome is missing, install it from the link above or use:

```bash
npx playwright install chrome
```

Use that installation command only when needed: it installs Chrome at the system's standard location and can replace an existing installation. See [Playwright's Chrome installation documentation](https://playwright.dev/docs/browsers#installing-google-chrome--microsoft-edge).

On Ubuntu/Linux, install the browser's system dependencies if required:

```bash
npx playwright install-deps chromium
```

The dependency command uses the Chromium engine's dependency group; tests still launch Google Chrome. This may require administrator privileges. `npm ci` installs the project dependencies recorded in `package-lock.json`.

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

Cucumber runs the feature files through `npm test`.

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

The workflow runs a matrix of three independent jobs: `ubuntu-latest` (Linux), `windows-latest`, and `macos-latest`. Each job uses Node.js 24, installs project dependencies and Google Chrome with `npx playwright install --with-deps chrome`, checks TypeScript, and runs `npm test`. It sets `CI=true` so Chrome runs headlessly. `fail-fast: false` lets the other operating systems finish if one job fails. There is no deployment step.

To inspect a run:

1. Open the repository's [Actions tab](https://github.com/Kischa-hub/AppsFactoryTask/actions).
2. Select **Cucumber Tests**, then the relevant run.
3. Open the OS-specific job, such as `Chrome (windows-latest)`, to inspect its steps and output.
4. In the run's **Artifacts** section, download the report for the relevant operating system.
5. Extract the download and open `cucumber-report.html` in your browser.

| Runner | Report artifact |
| --- | --- |
| `ubuntu-latest` | `cucumber-reports-ubuntu-latest` |
| `windows-latest` | `cucumber-reports-windows-latest` |
| `macos-latest` | `cucumber-reports-macos-latest` |

Generated reports are uploaded for successful and failed test runs unless the workflow is cancelled. Each OS has its own artifact to avoid upload-name conflicts. Artifacts are retained for seven days. If installation fails before Cucumber runs, a report may not exist. The matrix configures cross-platform execution; the corresponding GitHub run results establish which platforms passed.

## What the main scenario verifies

1. Search Amazon.de for each product and select **price: low to high**.
2. Select the first result card whose heading contains the search term, has a purchase price, and is not labelled `Sponsored` or `Gesponsert`.
3. Save its ASIN, displayed name, and price, then click **Add to basket** directly on that card.
4. Confirm the basket count increases after each addition.
5. Read the number of active basket rows and compare it with the number of expected products (two in the main scenario). Check that each saved name matches one row. Matching uses name containment; Amazon may append descriptions to the basket title. Basket order does not matter.
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

Cucumber runs the Gherkin feature files, Playwright controls Google Chrome and supplies assertions, and TypeScript is loaded through `ts-node`. Chrome is selected with `chromium.launch({ channel: "chrome", ... })`; `chromium` names the Playwright browser type, while the channel selects the branded browser. The code follows the Page Object Model (POM): step definitions manage the browser lifecycle and pass saved products to page objects, which contain locators, interactions, and assertions. The cookie utility handles supported English/German rejection buttons and allows up to two seconds for a delayed banner.

## Change test data or configuration

- **Products:** edit the `Examples` row for the scenario you run in [`amazonFeature.feature`](src/tests/features/amazonFeature.feature). The main scenarios add two products; the basket checks use the supplied expected-product list's length and prices, so they can also check other list sizes. Prices are captured during the run rather than hardcoded.
- **Runner and report paths:** edit [`config/cucumber.json`](config/cucumber.json).
- **Browser and locale:** configured in the `Before` hook in [`amazonSteps.ts`](src/tests/stepsDefinitions/amazonSteps.ts). The documented suite uses the Google Chrome stable channel and the `de-DE` locale.
- **Schedule:** edit the `schedule` section in [the workflow](.github/workflows/cucumber.yml), then commit and push it to the default branch.

Changing the browser locale does not set Amazon's delivery country or guarantee a particular currency.

## Troubleshooting

These tests exercise the live Amazon website. Catalog results, prices, delivery location, language, and page layouts can differ between local and GitHub-hosted execution.

| Symptom | Meaning and next step |
| --- | --- |
| Google Chrome executable is missing | Install Google Chrome at its standard system location. If it is not installed, `npx playwright install chrome` can install it; see the installation notes above. CI installs Chrome and its dependencies automatically. |
| `Missing X server or $DISPLAY` | The process is trying to open a visible browser without a desktop display. Set `CI=true` for headless execution. |
| Homepage search field is not found | Check the page URL, title, and search field label in Chrome. |
| `Cannot read the purchase price` | Selection expects a euro purchase price with two decimal digits. Capture the actual price text and check currency/format; those details are not currently logged automatically. |
| Basket name or total assertion fails | Inspect the selected product names/prices in the terminal output and the Cucumber report. Product availability, prices, or basket content may differ from the expected data. |
| A CAPTCHA or access challenge appears | The live site may prevent the automated journey. Record it as a blocked/failed run rather than treating it as a successful functional test. |

The checkout assertion covers the shared sign-in/create-account entry page. It does not verify a dedicated registration form, submit registration details, or complete a purchase.

When reporting a failure, include the command or selected tag, Node.js version, whether `CI=true` was set, the GitHub run link if applicable, and the relevant Cucumber report. Page URL, title, screenshot, and rejected price text are useful additional evidence when available.
