from playwright.sync_api import sync_playwright
import os

os.makedirs('C:/Users/tenku/Desktop/tradezen/screenshots', exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    console_msgs = []
    page.on('console', lambda msg: console_msgs.append(f"[{msg.type}] {msg.text}"))
    
    # Login
    page.goto('http://localhost:3000/login')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    
    page.fill('input[placeholder*="operator"]', 'operator@tradezen.io')
    page.fill('input[type="password"]', 'Operator123!')
    page.click('button:has-text("LOGIN")')
    page.wait_for_timeout(3000)
    page.screenshot(path='C:/Users/tenku/Desktop/tradezen/screenshots/02_after_login.png')
    print('After login URL:', page.url)
    
    # Go to trades
    page.goto('http://localhost:3000/trades')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    page.screenshot(path='C:/Users/tenku/Desktop/tradezen/screenshots/03_trades.png')
    print('Trades URL:', page.url)
    
    # Get first edit link
    links = page.locator('a').all()
    edit_href = None
    for link in links:
        href = link.get_attribute('href') or ''
        if '/edit' in href:
            edit_href = href
            break
    
    if edit_href:
        print(f'Found edit link: {edit_href}')
        page.goto(f'http://localhost:3000{edit_href}')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)
        page.screenshot(path='C:/Users/tenku/Desktop/tradezen/screenshots/04_edit_page.png')
        print('Edit page URL:', page.url)
        
        # Check for images section
        imgs = page.locator('img').all()
        print(f'Found {len(imgs)} img tags:')
        for img in imgs[:10]:
            src = img.get_attribute('src')
            print(f'  src={src[:100] if src else "None"}')
        
        # Check console for errors
        print(f'\nConsole ({len(console_msgs)} messages):')
        for msg in console_msgs:
            if 'error' in msg.lower() or 'fail' in msg.lower() or 'cors' in msg.lower():
                print(f'  {msg}')
    else:
        print('No edit link found')
    
    browser.close()
