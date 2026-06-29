from playwright.sync_api import sync_playwright
import os

os.makedirs('C:/Users/tenku/Desktop/tradezen/screenshots', exist_ok=True)

TRADE_ID = "4328b339-7172-4605-a104-93d4b96ff266"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    errors = []
    page.on('console', lambda msg: errors.append(f"[{msg.type}] {msg.text}") if msg.type in ['error'] else None)
    
    # Login
    page.goto('http://localhost:3000/login')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    page.fill('input[placeholder*="operator"]', 'test@test.com')
    page.fill('input[type="password"]', 'Test12345!')
    page.click('button:has-text("LOGIN")')
    page.wait_for_timeout(3000)
    print(f'Login: {page.url}')
    
    # Directly go to edit page
    page.goto(f'http://localhost:3000/trades/{TRADE_ID}/edit')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(3000)
    page.screenshot(path='C:/Users/tenku/Desktop/tradezen/screenshots/20_edit_page.png')
    print(f'Edit page: {page.url}')
    
    # Check images
    imgs = page.locator('img').all()
    cloudinary_imgs = [img for img in imgs if 'cloudinary' in (img.get_attribute('src') or '')]
    print(f'Total images: {len(imgs)}, Cloudinary: {len(cloudinary_imgs)}')
    for img in cloudinary_imgs:
        src = img.get_attribute('src') or ''
        print(f'  {src[:120]}')
    
    # Check thumbnails section
    labels = page.locator('text=SCREENSHOTS').all()
    for l in labels:
        print(f'Label: {l.text_content()}')
    
    # Upload a test image
    upload_input = page.locator('input[type="file"]').first
    if upload_input.count() > 0:
        print('\nUploading test image...')
        upload_input.set_input_files('C:/Users/tenku/Desktop/tradezen/screenshots/01_login.png')
        page.wait_for_timeout(5000)
        page.screenshot(path='C:/Users/tenku/Desktop/tradezen/screenshots/21_after_upload.png')
        
        imgs = page.locator('img').all()
        cloudinary_imgs = [img for img in imgs if 'cloudinary' in (img.get_attribute('src') or '')]
        print(f'After upload - Total: {len(imgs)}, Cloudinary: {len(cloudinary_imgs)}')
        for img in cloudinary_imgs:
            src = img.get_attribute('src') or ''
            print(f'  {src[:120]}')
    else:
        print('No file input found')
    
    # Also check trades page thumbnail
    page.goto('http://localhost:3000/trades')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    page.screenshot(path='C:/Users/tenku/Desktop/tradezen/screenshots/22_trades_thumb.png')
    
    # Check for thumbnail images in trade card
    trade_imgs = page.locator('.glass-card img').all()
    print(f'\nTrade card images: {len(trade_imgs)}')
    for img in trade_imgs:
        src = img.get_attribute('src') or ''
        if 'cloudinary' in src:
            print(f'  THUMBNAIL: {src[:120]}')
    
    print(f'\nConsole errors ({len(errors)}):')
    for e in errors[:10]:
        print(f'  {e}')
    
    browser.close()
