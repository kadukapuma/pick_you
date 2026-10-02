const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../features/payments/securePaymentNavigation.ts"), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
const helpers = {};
new Function("exports", compiled.outputText)(helpers);
const { isExpectedPaymentReturn, isSecurePaymentPage } = helpers;
const setup = { url: "https://test.picku.lk/setup", returnPath: "card-result", reference: "operation-1" };
test("card return must match operation, scheme, host and path", () => {
  assert.equal(isExpectedPaymentReturn("picku://payments/card-result?operation_id=operation-1&status=COMPLETED", setup), true);
  for (const url of ["picku://payments/card-result?operation_id=other", "picku://payments/card-result?status=COMPLETED", "https://payments/card-result?operation_id=operation-1", "picku://payments.evil/card-result?operation_id=operation-1", "picku://payments/result?operation_id=operation-1", "not a URL"]) assert.equal(isExpectedPaymentReturn(url, setup), false, url);
});
test("ride returns match the current ride without trusting success status", () => {
  const session = { ...setup, returnPath: "result", reference: "42" };
  assert.equal(isExpectedPaymentReturn("picku://payments/result?ride_id=42&status=FAILED", session), true);
  assert.equal(isExpectedPaymentReturn("picku://payments/result?ride_id=43&status=COMPLETED", session), false);
});
test("secure URLs exclude HTTP, custom schemes, local files and malformed URLs", () => {
  assert.equal(isSecurePaymentPage("https://bank.example/otp"), true);
  for (const url of ["file:///etc/passwd", "http://bank.example/otp", "intent://bank", "javascript:alert(1)", "https://", "about:blank"]) assert.equal(isSecurePaymentPage(url), false, url);
});