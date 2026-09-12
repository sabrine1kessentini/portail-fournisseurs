import { chromium } from "playwright";

const BASE = "https://portail-fournisseurs.vercel.app";
const browser = await chromium.launch();
const page = await browser.newPage();

page.on("request", (req) => {
  if (req.method() === "POST") console.log("[REQUEST]", req.method(), req.url());
});
page.on("response", (res) => {
  console.log("[RESPONSE]", res.status(), res.url());
});
page.on("console", (msg) => console.log("[console]", msg.type(), msg.text()));
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto(`${BASE}/acheteur/connexion`);
await page.fill("#email", "achats@demo.local");
await page.fill("#password", "Demo1234!");
await page.click('button[type="submit"]');
await page.waitForURL(`${BASE}/acheteur`);

await page.goto(`${BASE}/acheteur/validations`);
await page.waitForTimeout(500);
console.log("=== Page before ===");
console.log((await page.locator("body").innerText()).slice(0, 400));

console.log("=== Clicking Valider le changement ===");
const btn = page.locator('button:has-text("Valider le changement")').first();
console.log("Button count:", await btn.count());
await btn.click();
await page.waitForTimeout(5000);

console.log("=== Page after ===");
console.log("URL:", page.url());
console.log((await page.locator("body").innerText()).slice(0, 400));

await browser.close();
