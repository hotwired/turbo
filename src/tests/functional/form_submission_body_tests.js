import { expect, test } from "@playwright/test"

test("an empty POST form populated during submit-start does not add its body to the URL", async ({ page }) => {
  await page.goto("/src/tests/fixtures/form.html")
  await page.evaluate(() => {
    const form = document.createElement("form")
    form.method = "post"
    form.action = "/__turbo/redirect?path=/src/tests/fixtures/one.html"
    const button = document.createElement("button")
    button.textContent = "Submit empty form"
    form.append(button)
    form.addEventListener("turbo:submit-start", ({ detail }) => {
      detail.formSubmission.fetchRequest.body.append("message", "event-only")
    })
    document.body.prepend(form)
  })

  const requestPromise = page.waitForRequest((request) =>
    request.method() === "POST" && new URL(request.url()).pathname === "/__turbo/redirect"
  )
  await page.getByRole("button", { name: "Submit empty form" }).click()
  const request = await requestPromise

  expect(Array.from(new URL(request.url()).searchParams)).toEqual([["path", "/src/tests/fixtures/one.html"]])
  expect(new URLSearchParams(request.postData()).get("message")).toEqual("event-only")
  await expect(page.locator("h1")).toHaveText("One")
})
