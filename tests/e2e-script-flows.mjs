// Browser E2E: runs with a local development server, mock persistence and
// deliberately disabled auth ONLY outside production. No credentials involved.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3001";
const leadId = "10000000-0000-4000-8000-000000000001";
const key = "e2e-" + Date.now();
const graph = {
  schemaVersion: 1,
  startNodeId: "opening",
  nodes: [
    { id: "opening", type: "MESSAGE", title: "Saudação E2E", script: "Olá! Posso apresentar a proposta?" },
    { id: "objection", type: "QUESTION", title: "Dúvida E2E", script: "O que você gostaria de saber?" },
    { id: "end", type: "END", title: "Despedida E2E", script: "Agradeço a atenção." }
  ],
  edges: [
    { id: "ask", source: "opening", target: "objection", reaction: { label: "Quero saber mais" } },
    { id: "stop", source: "opening", target: "end", reaction: { label: "Sem interesse" } },
    { id: "again", source: "objection", target: "opening", reaction: { label: "Explique de novo" } },
    { id: "finish", source: "objection", target: "end", reaction: { label: "Até mais" } }
  ]
};
async function request(method, path, body) {
  const response = await fetch(url + path, {
    // This is a direct Node-side fixture request, not a browser-origin fetch.
    // CSRF behavior is exercised by clicking Publish in the browser below.
    method, headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const json = await response.json();
  assert.ok(response.ok, method + " " + path + " returned " + response.status + ": " + JSON.stringify(json));
  return json;
}
const scriptsRoute = "/api/leads/" + leadId + "/scripts";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
try {
  const created = await request("POST", scriptsRoute, {
    creationKey: key, title: "Roteiro Navegação E2E", channel: "WHATSAPP", purpose: "FIRST_CONTACT", graph
  });
  assert.equal(created.script.version, 1);
  const route = scriptsRoute + "/" + created.script.id;
  const released = await request("POST", route + "/publish", {
    expectedVersion: 1, expectedDraftRevisionId: created.revision.id
  });
  assert.equal(released.script.publishedRevisionId, created.revision.id);

  await page.goto(url + "/leads/" + leadId + "?tab=scripts", { waitUntil: "domcontentloaded" });
  await page.getByText("Saudação E2E").first().waitFor({ timeout: 30000 });
  await page.getByText("Olá! Posso apresentar a proposta?").waitFor();
  await page.getByRole("button", { name: "Quero saber mais" }).click();
  await page.getByText("O que você gostaria de saber?").waitFor();

  await page.getByRole("button", { name: "← Voltar" }).click();
  await page.getByText("Olá! Posso apresentar a proposta?").waitFor();
  await page.getByRole("button", { name: "Sem interesse" }).click();
  await page.getByText("Agradeço a atenção.").waitFor();
  await page.getByRole("button", { name: "↺ Reiniciar" }).click();
  await page.getByText("Olá! Posso apresentar a proposta?").waitFor();

  await page.getByRole("button", { name: "Mapa do roteiro" }).click();
  await page.getByRole("group", { name: "Mapa interativo do roteiro comercial" }).waitFor();
  await page.locator(".react-flow__controls-zoomin").click();
  await page.locator(".react-flow__minimap").waitFor();

  const patched = await request("PATCH", route, {
    expectedVersion: 2, operations: [
      { op: "updateNode", nodeId: "opening", changes: { script: "Nova saudação ainda não publicada." } }
    ]
  });
  assert.equal(patched.script.publishedRevisionId, released.revision.id);
  assert.notEqual(patched.script.draftRevisionId, patched.script.publishedRevisionId);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByText("Olá! Posso apresentar a proposta?").waitFor();
  await page.getByRole("button", { name: "Prévia do rascunho" }).click();
  await page.getByText("Nova saudação ainda não publicada.").waitFor();
  await page.getByRole("button", { name: "Ver publicada" }).click();
  await page.getByText("Olá! Posso apresentar a proposta?").waitFor();
  // A hypothetical exploration must not change the lead or conversation state.
  const current = await request("GET", route + "?view=published");
  assert.equal(current.revision.id, released.revision.id);
  await page.getByRole("button", { name: "Prévia do rascunho" }).click();
  await page.getByText("Nova saudação ainda não publicada.").waitFor();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Publicar rascunho" }).click();
  await page.getByText("Nova saudação ainda não publicada.").waitFor();
  const after = await request("GET", route + "?view=published");
  assert.equal(after.revision.id, patched.revision.id);
  console.log("E2E PASS: mobile guided choices, navigation, map and UI publication");
} catch (error) {
  await page.screenshot({ path: "/tmp/agencyos-scripts-e2e-failed.png", fullPage: true }).catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
