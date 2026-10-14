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
        assert page.locator(".pattern-card").count() == 27, "Expected 27 curated examples."
        page.locator("#patternSearch").fill("year-on-year sales growth")
        assert page.locator(".pattern-card:visible").count() == 1, "Pattern search failed."
        page.locator("#patternSearch").fill("")
        page.locator("#patternCategory").select_option("Time intelligence")
        assert page.locator(".pattern-card:visible").count() == 7, "Time-intelligence filter failed."
        page.locator("#patternCategory").select_option("all")
        page.locator('[data-pattern-id="safe-divide"] button').first.click()
        example = page.locator("#daxInput").input_value()
        assert "Gross Margin %" in example and "Total Sales =" in example
        assert "Total Cost =" in example and "Gross Margin =" in example, (
            "Complete example did not include transitive helper measures."
        )
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
        overflowing = page.evaluate("""() => {
            const max=innerWidth+2;
            return [...document.querySelectorAll('body *')].filter(el => {
                const rect=el.getBoundingClientRect();
                return rect.width && rect.right>max && getComputedStyle(el).position!=='fixed';
            }).slice(0,12).map(el=>({
                tag:el.tagName, cls:String(el.className).slice(0,75),
                width:Math.round(el.getBoundingClientRect().width),
                right:Math.round(el.getBoundingClientRect().right)
            }));
        }""")
        if page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 2"):
            sideways_scroll = page.evaluate("""() => {
                window.scrollTo({left: 10000, top: window.scrollY, behavior:'instant'});
                return Math.abs(window.scrollX);
            }""")
            assert sideways_scroll <= 2 and not overflowing, (
                f"Scrollable horizontal overflow at {width}px: scroll={sideways_scroll}, "
                f"offenders={overflowing}"
            )
        assert not page_errors, f"Console exceptions at {width}px: {page_errors}"
        assert not any(url.startswith(("http://", "https://")) for url in requests), (
            f"Offline build issued external requests at {width}px: {requests}"
        )
        print(f"PASS: offline file, {width}px viewport, DAX/diff/clear, no external requests.")
        page.close()
    browser.close()
