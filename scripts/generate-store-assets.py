#!/usr/bin/env python3
"""
Generate Chrome Web Store Screenshots (1280x800) and Promotional Tile (440x280)
"""

import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA_DIR = "/Users/himanshusharma/.gemini/antigravity-ide/brain/f5742c35-f3cd-48f2-85fd-d91b57b0d930/.user_uploaded"
OUT_DIR = os.path.join(BASE_DIR, "assets", "store")
os.makedirs(OUT_DIR, exist_ok=True)

FONT_TITLE_PATH = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_BODY_PATH = "/System/Library/Fonts/Supplemental/Arial.ttf"

def get_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

def create_gradient_canvas(width=1280, height=800, top_color=(11, 15, 25), bot_color=(17, 24, 39)):
    canvas = Image.new("RGBA", (width, height), top_color)
    draw = ImageDraw.Draw(canvas)
    for y in range(height):
        ratio = y / float(height)
        r = int(top_color[0] * (1 - ratio) + bot_color[0] * ratio)
        g = int(top_color[1] * (1 - ratio) + bot_color[1] * ratio)
        b = int(top_color[2] * (1 - ratio) + bot_color[2] * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))
    
    # Add subtle accent glow
    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([width//2 - 400, 100, width//2 + 400, 700], fill=(10, 102, 194, 25))
    glow = glow.filter(ImageFilter.GaussianBlur(80))
    canvas = Image.alpha_composite(canvas, glow)
    return canvas

def add_drop_shadow(image, offset=(0, 15), blur=25, shadow_color=(0, 0, 0, 140)):
    w, h = image.size
    shadow_w = w + blur * 4
    shadow_h = h + blur * 4
    shadow = Image.new("RGBA", (shadow_w, shadow_h), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    
    rect_x0 = blur * 2 + offset[0]
    rect_y0 = blur * 2 + offset[1]
    rect_x1 = rect_x0 + w
    rect_y1 = rect_y0 + h
    s_draw.rounded_rectangle([rect_x0, rect_y0, rect_x1, rect_y1], radius=16, fill=shadow_color)
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    
    res = Image.new("RGBA", (shadow_w, shadow_h), (0, 0, 0, 0))
    res.paste(shadow, (0, 0), shadow)
    res.paste(image, (blur * 2, blur * 2), image if image.mode == 'RGBA' else None)
    return res, blur * 2

def draw_pill_badge(draw, x, y, text, font, bg_color=(15, 23, 42), border_color=(56, 189, 248), text_color=(56, 189, 248)):
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pad_x, pad_y = 14, 6
    x0, y0 = x, y
    x1, y1 = x + tw + pad_x * 2, y + th + pad_y * 2
    draw.rounded_rectangle([x0, y0, x1, y1], radius=9999, fill=bg_color, outline=border_color, width=1)
    draw.text((x + pad_x, y + pad_y - bbox[1]), text, font=font, fill=text_color)
    return x1

# --- SCREENSHOT 1: OVERVIEW & PIPELINE ---
def make_screenshot_1():
    canvas = create_gradient_canvas(1280, 800, (10, 15, 26), (15, 23, 42))
    draw = ImageDraw.Draw(canvas)
    
    font_badge = get_font(FONT_TITLE_PATH, 12)
    font_title = get_font(FONT_TITLE_PATH, 34)
    font_sub = get_font(FONT_BODY_PATH, 18)
    font_feat = get_font(FONT_TITLE_PATH, 13)
    
    # Top Category Pill
    draw_pill_badge(draw, 500, 36, "CHROME WEB STORE  •  PRODUCTIVITY", font_badge, (15, 23, 42), (10, 102, 194), (56, 189, 248))
    
    # Title & Subtitle
    title_text = "Track LinkedIn Jobs in Your Own Google Sheet"
    sub_text = "One-click save • Visual pipeline funnel • Instant search & filter"
    
    t_bbox = font_title.getbbox(title_text)
    draw.text(((1280 - (t_bbox[2] - t_bbox[0])) // 2, 76), title_text, font=font_title, fill=(255, 255, 255))
    
    s_bbox = font_sub.getbbox(sub_text)
    draw.text(((1280 - (s_bbox[2] - s_bbox[0])) // 2, 124), sub_text, font=font_sub, fill=(148, 163, 184))
    
    # Popup Image (media_1790119172503.png)
    popup_path = os.path.join(MEDIA_DIR, "media_1790119172503.png")
    if os.path.exists(popup_path):
        popup_img = Image.open(popup_path).convert("RGBA")
        # Scale nicely to height ~520
        target_h = 530
        ratio = target_h / float(popup_img.height)
        target_w = int(popup_img.width * ratio)
        popup_img = popup_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
        # Round corners of popup
        mask = Image.new("L", (target_w, target_h), 0)
        m_draw = ImageDraw.Draw(mask)
        m_draw.rounded_rectangle([0, 0, target_w, target_h], radius=14, fill=255)
        popup_img.putalpha(mask)
        
        # Add shadow
        framed, pad = add_drop_shadow(popup_img, offset=(0, 12), blur=20, shadow_color=(0, 0, 0, 160))
        cx = (1280 - framed.width) // 2
        cy = 168 - pad
        canvas.paste(framed, (cx, cy), framed)
    
    # Feature Badges
    badges = [
        "⚡ 1-Click Save",
        "📊 Auto Google Sheets",
        "🎯 Duplicate Protection",
        "🔒 100% Private (No DB)"
    ]
    cur_x = 240
    for b in badges:
        cur_x = draw_pill_badge(draw, cur_x, 734, b, font_feat, (15, 23, 42), (30, 41, 59), (226, 232, 240)) + 14

    out_file = os.path.join(OUT_DIR, "screenshot-1-overview.png")
    canvas.save(out_file, "PNG")
    print(f"✅ Generated: {out_file} (1280x800)")

# --- SCREENSHOT 2: NATIVE LINKEDIN INTEGRATION ---
def make_screenshot_2():
    canvas = create_gradient_canvas(1280, 800, (11, 15, 25), (16, 24, 40))
    draw = ImageDraw.Draw(canvas)
    
    font_badge = get_font(FONT_TITLE_PATH, 12)
    font_title = get_font(FONT_TITLE_PATH, 34)
    font_sub = get_font(FONT_BODY_PATH, 18)
    font_feat = get_font(FONT_TITLE_PATH, 13)
    
    draw_pill_badge(draw, 490, 36, "SEAMLESS INLINE INTEGRATION", font_badge, (15, 23, 42), (10, 102, 194), (56, 189, 248))
    
    title_text = "Native 28px Button with LinkedIn Blue Pencil"
    sub_text = "Sits directly next to Apply & Save • Zero page disruption • Quick note editor"
    
    t_bbox = font_title.getbbox(title_text)
    draw.text(((1280 - (t_bbox[2] - t_bbox[0])) // 2, 76), title_text, font=font_title, fill=(255, 255, 255))
    
    s_bbox = font_sub.getbbox(sub_text)
    draw.text(((1280 - (s_bbox[2] - s_bbox[0])) // 2, 124), sub_text, font=font_sub, fill=(148, 163, 184))
    
    # 2 Sample Job Cards: media_1790118002843.png (Bain) & media_1790117810944.png (Accenture Saved)
    card1_path = os.path.join(MEDIA_DIR, "media_1790118002843.png")
    card2_path = os.path.join(MEDIA_DIR, "media_1790117810944.png")
    
    if os.path.exists(card1_path):
        c1 = Image.open(card1_path).convert("RGBA")
        target_w = 720
        ratio = target_w / float(c1.width)
        target_h = int(c1.height * ratio)
        c1 = c1.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
        # Rounded border
        mask1 = Image.new("L", (target_w, target_h), 0)
        ImageDraw.Draw(mask1).rounded_rectangle([0, 0, target_w, target_h], radius=12, fill=255)
        c1.putalpha(mask1)
        
        c1_framed, pad1 = add_drop_shadow(c1, offset=(0, 10), blur=16, shadow_color=(0, 0, 0, 150))
        canvas.paste(c1_framed, ((1280 - c1_framed.width)//2, 175 - pad1), c1_framed)
    
    if os.path.exists(card2_path):
        c2 = Image.open(card2_path).convert("RGBA")
        target_w = 720
        ratio = target_w / float(c2.width)
        target_h = int(c2.height * ratio)
        c2 = c2.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
        mask2 = Image.new("L", (target_w, target_h), 0)
        ImageDraw.Draw(mask2).rounded_rectangle([0, 0, target_w, target_h], radius=12, fill=255)
        c2.putalpha(mask2)
        
        c2_framed, pad2 = add_drop_shadow(c2, offset=(0, 10), blur=16, shadow_color=(0, 0, 0, 150))
        canvas.paste(c2_framed, ((1280 - c2_framed.width)//2, 455 - pad2), c2_framed)
        
    badges = [
        "🔖 Native Action Row",
        "✏️ Quick Status & Notes",
        "⌨️ Alt+S Keyboard Shortcut",
        "↩️ 5-Second Undo Toast"
    ]
    cur_x = 220
    for b in badges:
        cur_x = draw_pill_badge(draw, cur_x, 734, b, font_feat, (15, 23, 42), (30, 41, 59), (226, 232, 240)) + 14

    out_file = os.path.join(OUT_DIR, "screenshot-2-inline-save.png")
    canvas.save(out_file, "PNG")
    print(f"✅ Generated: {out_file} (1280x800)")

# --- SCREENSHOT 3: SETTINGS & 2-WAY SYNC ---
def make_screenshot_3():
    canvas = create_gradient_canvas(1280, 800, (10, 15, 26), (15, 23, 42))
    draw = ImageDraw.Draw(canvas)
    
    font_badge = get_font(FONT_TITLE_PATH, 12)
    font_title = get_font(FONT_TITLE_PATH, 34)
    font_sub = get_font(FONT_BODY_PATH, 18)
    font_feat = get_font(FONT_TITLE_PATH, 13)
    
    draw_pill_badge(draw, 510, 36, "TWO-WAY GOOGLE SHEETS SYNC", font_badge, (15, 23, 42), (10, 102, 194), (56, 189, 248))
    
    title_text = "Live Sync, Status Stages & 1-Click CSV Export"
    sub_text = "Pulls manual edits • Purges deleted rows • Full Google Sheets integration"
    
    t_bbox = font_title.getbbox(title_text)
    draw.text(((1280 - (t_bbox[2] - t_bbox[0])) // 2, 76), title_text, font=font_title, fill=(255, 255, 255))
    
    s_bbox = font_sub.getbbox(sub_text)
    draw.text(((1280 - (s_bbox[2] - s_bbox[0])) // 2, 124), sub_text, font=font_sub, fill=(148, 163, 184))
    
    settings_path = os.path.join(MEDIA_DIR, "media_1790119190694.png")
    if os.path.exists(settings_path):
        s_img = Image.open(settings_path).convert("RGBA")
        target_h = 530
        ratio = target_h / float(s_img.height)
        target_w = int(s_img.width * ratio)
        s_img = s_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
        mask = Image.new("L", (target_w, target_h), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, target_w, target_h], radius=14, fill=255)
        s_img.putalpha(mask)
        
        framed, pad = add_drop_shadow(s_img, offset=(0, 12), blur=20, shadow_color=(0, 0, 0, 160))
        cx = (1280 - framed.width) // 2
        cy = 168 - pad
        canvas.paste(framed, (cx, cy), framed)
        
    badges = [
        "🔄 2-Way Sync Engine",
        "📥 Instant CSV Export",
        "📊 8-Column Auto Schema",
        "🏷️ 7 Status Dropdowns"
    ]
    cur_x = 220
    for b in badges:
        cur_x = draw_pill_badge(draw, cur_x, 734, b, font_feat, (15, 23, 42), (30, 41, 59), (226, 232, 240)) + 14

    out_file = os.path.join(OUT_DIR, "screenshot-3-settings-sync.png")
    canvas.save(out_file, "PNG")
    print(f"✅ Generated: {out_file} (1280x800)")

# --- PROMOTIONAL TILE: 440x280 ---
def make_promo_tile():
    canvas = create_gradient_canvas(440, 280, (11, 15, 25), (15, 23, 42))
    draw = ImageDraw.Draw(canvas)
    
    # Icon
    icon_path = os.path.join(BASE_DIR, "assets", "icons", "icon-128.png")
    if os.path.exists(icon_path):
        icon = Image.open(icon_path).convert("RGBA")
        icon = icon.resize((64, 64), Image.Resampling.LANCZOS)
        canvas.paste(icon, ((440 - 64) // 2, 40), icon)
        
    font_title = get_font(FONT_TITLE_PATH, 24)
    font_sub = get_font(FONT_BODY_PATH, 13)
    font_tag = get_font(FONT_TITLE_PATH, 11)
    
    title_text = "Job Tracker LN"
    sub_text = "Save LinkedIn Jobs Directly to Google Sheets"
    
    t_bbox = font_title.getbbox(title_text)
    draw.text(((440 - (t_bbox[2] - t_bbox[0])) // 2, 118), title_text, font=font_title, fill=(255, 255, 255))
    
    s_bbox = font_sub.getbbox(sub_text)
    draw.text(((440 - (s_bbox[2] - s_bbox[0])) // 2, 154), sub_text, font=font_sub, fill=(148, 163, 184))
    
    draw_pill_badge(draw, 140, 196, "ONE-CLICK • 100% PRIVATE", font_tag, (15, 23, 42), (10, 102, 194), (56, 189, 248))
    
    out_file = os.path.join(OUT_DIR, "promo-tile-440x280.png")
    canvas.save(out_file, "PNG")
    print(f"✅ Generated: {out_file} (440x280)")

if __name__ == "__main__":
    make_screenshot_1()
    make_screenshot_2()
    make_screenshot_3()
    make_promo_tile()
