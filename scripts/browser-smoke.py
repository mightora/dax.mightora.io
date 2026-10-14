"""Browser-level offline, accessibility and privacy smoke tests for the packaged release."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "dist" / "downloads" / "dax-workbench-offline.html"
assert HTML.exists(), "Build the offline edition before browser smoke tests."

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=["--no-sandbox"])
    for width, height in [(1440, 900), (768, 1024), (390, 844), (320, 720)]:
        page = browser.new_page(viewport={"width": width, "height": height})
        page_errors, requests = [], []
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on("request", lambda req: requests.append(req.url))
        page.goto(HTML.as_uri(), wait_until="load")
        assert page.locator("#offlineBanner").is_visible(), "Offline badge missing."
        assert "Offline Edition" in page.locator("#offlineBanner").inner_text()
        assert page.locator("mightora-header img").first.evaluate(
            "(img) => img.complete && img.naturalWidth > 0"
        ), "Offline brand logo failed to load."
        page.locator("#daxInput").fill("Sales = IF([A] = [B], 1, 0)")
        page.locator("#formatBtn").click()
        formatted = page.locator("#formattedDax").inner_text()
        assert "[A] = [B]" in formatted
        page.locator("#daxInput").fill(formatted)
        page.locator("#formatBtn").click()
        assert page.locator("#formattedDax").inner_text() == formatted, "Formatter is not idempotent."
        page.locator("#beforeInput").fill("A = 1\nB = 2")
        page.locator("#afterInput").fill("A = 1\nB = 3")
        page.locator("#compareBtn").click()
        assert page.locator(".diff-row").count() > 1
        page.locator("#daxInput").fill('A = "<img src=x onerror=alert(1)>"')
        page.locator("#formatBtn").click()
        assert page.locator('img[src="x"]').count() == 0, "Input was incorrectly inserted as HTML."
        page.locator("#clearBtn").click()
        assert page.locator("#daxInput").input_value() == ""
        if width <= 390:
            menu = page.locator("mightora-header .offline-menu")
            menu.click()
            assert menu.get_attribute("aria-expanded") == "true"
        assert not page.evaluate(
            "document.documentElement.scrollWidth > window.innerWidth + 2"
        ), f"Horizontal overflow at {width}px."
        assert not page_errors, f"Console exceptions at {width}px: {page_errors}"
        assert not any(url.startswith(("http://", "https://")) for url in requests), (
            f"Offline build issued external requests at {width}px: {requests}"
        )
        print(f"PASS: offline file, {width}px viewport, DAX/diff/clear, no external requests.")
        page.close()
    browser.close()
