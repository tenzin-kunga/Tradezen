from playwright.sync_api import sync_playwright
import os

os.makedirs('C:/Users/tenku/Desktop/tradezen/screenshots', exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    errors = []
    page.on('console', lambda msg: errors.append(f"[{msg.type}] {msg.text}"))
    
    # Login page
    page.goto('http://localhost:3000/login')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    page.screenshot(path='C:/Users/tenku/Desktop/tradezen/screenshots/01_login.png')
    
    # Get page HTML to find inputs
    content = page.content()
    inputs = page.locator('input').all()
    print(f'Found {len(inputs)} inputs:')
    for inp in inputs:
        print(f'  type={inp.get_attribute("type")} name={inp.get_attribute("name")} placeholder={inp.get_attribute("placeholder")}')
    
    buttons = page.locator('button').all()
    print(f'Found {len(buttons)} buttons:')
    for btn in buttons[:5]:
        print(f'  text="{btn.text_content()}" type={btn.get_attribute("type")}')
    
    # Console errors
    print(f'\nConsole errors:')
    for e in errors:
        if 'error' in e.lower() or 'fail' in e.lower():
            print(f'  {e}')
    
    browser.close()
