import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { BrowserContext, Page } from "playwright";

export async function captureFailureArtifacts(
  artifactDir: string,
  page: Page | undefined,
  tracing: BrowserContext["tracing"] | undefined,
) {
  await mkdir(artifactDir, { recursive: true });

  const tracePath = join(artifactDir, "trace.zip");
  // Give each capture a chance to finish even if the other fails.
  const [screenshot, trace] = await Promise.allSettled([
    page?.screenshot({ path: join(artifactDir, "screenshot.png"), timeout: 5_000 }),
    tracing?.stop({ path: tracePath }).then(() => tracePath),
  ]);

  return { screenshot, trace };
}
