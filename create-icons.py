import base64
from PIL import Image, ImageDraw, ImageFont

# Create 192x192 icon
img192 = Image.new('RGB', (192, 192), color='#6b21a8')
draw192 = ImageDraw.Draw(img192)
# Draw white circle
draw192.ellipse([64, 64, 128, 128], fill='white')
# Draw tea cup emoji or text
try:
    font = ImageFont.truetype("arial.ttf", 60)
except:
    font = ImageFont.load_default()
draw192.text((96, 96), 'T', fill='#6b21a8', font=font, anchor='mm')
img192.save('public/icons/icon-192x192.png')

# Create 512x512 icon
img512 = Image.new('RGB', (512, 512), color='#6b21a8')
draw512 = ImageDraw.Draw(img512)
draw512.ellipse([170, 170, 342, 342], fill='white')
try:
    font = ImageFont.truetype("arial.ttf", 160)
except:
    font = ImageFont.load_default()
draw512.text((256, 256), 'T', fill='#6b21a8', font=font, anchor='mm')
img512.save('public/icons/icon-512x512.png')

print('Icons created successfully!')

