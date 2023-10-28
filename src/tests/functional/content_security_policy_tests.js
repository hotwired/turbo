import { test } from "@playwright/test"
import { assert } from "chai"
import {
  readCspViolations
} from "../helpers/page"

test.describe('ReportingObserver supported', () => {
  test.skip(async ({ page }) => { return page.evaluate(() => typeof window.ReportingObserver !== 'function') }, "ReportingObserver is not supported in this environment")

  test("Content-Security-Policy: default-src 'none';", async ({ page }) => {
    await page.goto("/src/tests/fixtures/content_security_policy.html?Content-Security-Policy=default-src 'none';")

    const cspReports = await readCspViolations(page)
    assert.equal(cspReports.length, 1, "reports CSP violations")
    assert.equal(cspReports[0].body.blockedURL, "http://localhost:9000/dist/turbo.es2017-umd.js", "CSP violation blockedURL")
  })

  test("Content-Security-Policy: default-src 'none'; script-src-elem 'self';", async ({ page }) => {
    await page.goto("/src/tests/fixtures/content_security_policy.html?Content-Security-Policy=default-src 'none'; script-src-elem 'self';")

    const cspReports = await readCspViolations(page)
    assert.equal(cspReports.length, 1, "reports CSP violations")
    assert.equal(cspReports[0].body.effectiveDirective, "style-src-elem", "CSP violation directive (style-src-elem)")
    assert.equal(cspReports[0].body.blockedURL, "inline", "CSP violation blockedURL (inline)")
  })

  test("Content-Security-Policy: default-src 'none'; script-src-elem 'self'; style-src-elem 'self';", async ({ page }) => {
    await page.goto("/src/tests/fixtures/content_security_policy.html?Content-Security-Policy=default-src 'none'; script-src-elem 'self'; style-src-elem 'self';")

    const cspReports = await readCspViolations(page)
    assert.equal(cspReports.length, 1, "reports CSP violations")
    assert.equal(cspReports[0].body.effectiveDirective, "style-src-elem", "CSP violation directive (style-src-elem)")
    assert.equal(cspReports[0].body.blockedURL, "inline", "CSP violation blockedURL (inline)")
  })

  test("Content-Security-Policy: default-src 'none'; script-src-elem 'self'; style-src-elem 'unsafe-inline';", async ({ page }) => {
    await page.goto("/src/tests/fixtures/content_security_policy.html?Content-Security-Policy=default-src 'none'; script-src-elem 'self'; style-src-elem 'unsafe-inline';")
    assert.equal((await readCspViolations(page)).length, 0, "reports no CSP violations")
  })

  test("Content-Security-Policy: default-src 'none'; script-src-elem 'self'; style-src-elem 'nonce=123';", async ({ page, browserName }) => {
    await page.goto("/src/tests/fixtures/content_security_policy_with_nonce.html?Content-Security-Policy=default-src 'none'; script-src-elem 'self'; style-src-elem 'nonce-123';")
    assert.equal((await readCspViolations(page)).length, 0, "reports no CSP violations")
  })

  test("Content-Security-Policy: default-src 'none'; script-src-elem 'self'; style-src-elem='sha256-ProgressBarStyleHash';", async ({ page }) => {
    const progressBarStyleHash = encodeURIComponent("sha256-WAyOw4V+FqDc35lQPyRADLBWbuNK8ahvYEaQIYF1+Ps=")
    await page.goto(`/src/tests/fixtures/content_security_policy.html?Content-Security-Policy=default-src 'none'; script-src-elem 'self'; style-src-elem '${progressBarStyleHash}';`)
    assert.equal((await readCspViolations(page)).length, 0, "reports no CSP violations")
  })
})
