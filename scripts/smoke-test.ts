import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const failures: string[] = [];

  function check(label: string, condition: boolean) {
    console.log(`${condition ? "OK" : "FAIL"} - ${label}`);
    if (!condition) failures.push(label);
  }

  // --- Login acheteur ---
  await page.goto(`${BASE}/acheteur/connexion`);
  await page.fill("#email", "achats@demo.local");
  await page.fill("#password", "Demo1234!");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/acheteur`, { timeout: 10000 });
  check("login redirects to dashboard", page.url() === `${BASE}/acheteur`);
  check("dashboard shows title", (await page.textContent("h1")) === "Tableau de bord achats");

  // --- Navigate to orders, open one with pending diff ---
  await page.goto(`${BASE}/acheteur/commandes`);
  await page.click("text=PO-2026-001");
  await page.waitForURL(/\/acheteur\/commandes\//);
  check("order detail loads", (await page.textContent("h1")) === "PO-2026-001");
  const hasPendingSection = await page.locator("text=Validations en attente").count();
  check("pending diff section visible", hasPendingSection > 0);

  // --- Validate the diff (approve) ---
  const approveButton = page.locator('button:has-text("Valider le changement")').first();
  if (await approveButton.count()) {
    await approveButton.click();
    await page.waitForResponse((r) => r.request().method() === "POST" && r.status() === 200);
    await page.reload();
    check(
      "diff no longer pending after approval",
      (await page.locator("text=Valider le changement").count()) === 0
    );
  } else {
    check("approve button present", false);
  }

  // --- New order creation ---
  await page.goto(`${BASE}/acheteur/commandes/nouvelle`);
  await page.fill("#reference", `PO-TEST-${Date.now()}`);
  // supplier select (Base UI select trigger)
  await page.click("#supplierId");
  await page.click("text=Atlas Composants");
  await page.fill('input[name="designation-0"]', "Ligne de test");
  await page.fill('input[name="quantity-0"]', "10");
  await page.fill('input[name="unitPrice-0"]', "5.5");
  await page.fill('input[name="requestedDate-0"]', "2027-01-01");
  await page.click('button:has-text("Créer la commande")');
  await page.waitForURL(/\/acheteur\/commandes\/[a-z0-9]+$/, { timeout: 10000 });
  check("new order created and redirected", /\/acheteur\/commandes\//.test(page.url()));

  await page.context().clearCookies();

  // --- Supplier magic link flow ---
  const nordicToken = process.env.NORDIC_TOKEN;
  if (nordicToken) {
    await page.goto(`${BASE}/f/${nordicToken}`);
    await page.waitForURL(`${BASE}/fournisseur`, { timeout: 10000 });
    check("supplier link opens portal", page.url() === `${BASE}/fournisseur`);
    check("supplier sees own orders", (await page.locator("text=PO-2026-003").count()) > 0);

    await page.click("text=PO-2026-003");
    await page.waitForURL(/\/fournisseur\/commandes\//);
    // Nordic Parts AB has an "en" locale preference — the portal renders in English for them.
    const acceptBtn = page.locator('button:has-text("Accept")').first();
    if (await acceptBtn.count()) {
      await acceptBtn.click();
      await page.click('button:has-text("Send confirmation")');
      // revalidatePath() re-renders the page from the server once the line's
      // status flips, which removes the form (and its own "saved" message)
      // before ever painting it — so assert on the resulting read-only state.
      const confirmed = await page
        .getByText("Confirmed", { exact: true })
        .first()
        .waitFor({ timeout: 20000 })
        .then(() => true)
        .catch(() => false);
      if (!confirmed) {
        console.log("--- debug body ---");
        console.log((await page.locator("body").innerText()).slice(0, 1500));
      }
      check("line confirmation submitted", confirmed);
    } else {
      check("accept button present", false);
    }
  } else {
    console.log("SKIP - supplier flow (set NORDIC_TOKEN env var)");
  }

  await browser.close();

  if (failures.length > 0) {
    console.error(`\n${failures.length} FAILURE(S):`, failures);
    process.exit(1);
  }
  console.log("\nAll checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
