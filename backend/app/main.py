import os
import uuid
from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, FileResponse, Response, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import qrcode
from pathlib import Path
from typing import Optional

app = FastAPI(title="QR Code Generator")

# Define paths
import os
from pathlib import Path

# Define base directory (one level up from backend)
BASE_DIR = Path(__file__).parent.parent.parent

# Define directories
STATIC_DIR = BASE_DIR / 'persistent_storage' / 'static'
FRONTEND_STATIC_DIR = BASE_DIR / 'frontend' / 'static'
TEMPLATES_DIR = BASE_DIR / 'frontend' / 'templates'
QR_CODES_DIR = BASE_DIR / 'persistent_storage' / 'qrcodes'

# Create necessary directories
for directory in [STATIC_DIR, QR_CODES_DIR]:
    directory.mkdir(parents=True, exist_ok=True)
    
# Print paths for debugging
print(f"Base directory: {BASE_DIR}")
print(f"QR codes directory: {QR_CODES_DIR.absolute()}")
print(f"Static files directory: {STATIC_DIR.absolute()}")

# Ensure static directory exists
os.makedirs(STATIC_DIR, exist_ok=True)

# Create necessary directories
os.makedirs(QR_CODES_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/frontend/static", StaticFiles(directory=FRONTEND_STATIC_DIR), name="frontend_static")
# Serve logo directly
LOGO_PATH = FRONTEND_STATIC_DIR / 'logo.jpg'
print(f"Logo path: {LOGO_PATH}")

@app.get("/logo.jpg")
async def get_logo():
    if not LOGO_PATH.exists():
        raise HTTPException(status_code=404, detail=f"Logo file not found at {LOGO_PATH}")
    return FileResponse(LOGO_PATH, media_type="image/jpeg")
app.mount("/qrcodes", StaticFiles(directory=QR_CODES_DIR), name="qrcodes")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

def generate_qr_code(data: str, filename: str) -> str:
    """
    Generate a QR code with a centered logo and save it to the persistent storage.
    
    Args:
        data: The data to encode in the QR code
        filename: The desired filename (without extension)
        
    Returns:
        str: The URL path to the generated QR code
    """
    try:
        # Create QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,  # Higher error correction for logo
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        # Create QR code image
        qr_img = qr.make_image(fill_color="black", back_color="white").convert('RGB')
        
        # Add logo to the center of QR code
        try:
            from PIL import Image
            
            # Use the exact logo path
            logo_path = r'C:\Users\Admin\Desktop\bitbucket\QR_CODE_GENERATOR\frontend\static\logo.jpg'
            print(f"Using logo from: {logo_path}")
            if os.path.exists(logo_path):
                # Open the logo
                logo = Image.open(logo_path)
                print(f"Successfully loaded logo. Size: {logo.size}, Mode: {logo.mode}")
                
                # Calculate logo size (25% of QR code size)
                qr_width, qr_height = qr_img.size
                logo_width = min(qr_width, qr_height) // 3
                
                # Calculate aspect ratio to maintain proportions
                logo_aspect_ratio = logo.width / logo.height
                logo_height = int(logo_width / logo_aspect_ratio)
                
                # Resize logo
                logo = logo.resize((logo_width, logo_height), Image.Resampling.LANCZOS)
                
                # Calculate position to center the logo
                position = ((qr_width - logo_width) // 2, (qr_height - logo_height) // 2)
                
                # Paste logo onto QR code
                qr_img.paste(logo, position)
        except Exception as e:
            print(f"Could not add logo to QR code: {str(e)}")
        
        # Sanitize filename
        if not filename:
            filename = f"qr_{uuid.uuid4().hex}"
        
        # Remove any path information and ensure .png extension
        filename = os.path.basename(filename)
        if not filename.lower().endswith('.png'):
            filename += '.png'
        
        # Ensure the qrcodes directory exists
        QR_CODES_DIR.mkdir(parents=True, exist_ok=True)
        
        # Save the QR code
        img_path = QR_CODES_DIR / filename
        qr_img.save(img_path)
        
        print(f"QR code generated at: {img_path.absolute()}")
        return f"/qrcodes/{filename}"
        
    except Exception as e:
        print(f"Error generating QR code: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate QR code: {str(e)}")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/generate")
async def create_qr_code(
    text: str = Form(...),
    filename: Optional[str] = Form("qr_code")
):
    if not text:
        raise HTTPException(status_code=400, detail="Text input is required")
    
    # Generate a unique filename if not provided
    if not filename:
        filename = f"qr_{uuid.uuid4().hex[:8]}"
    else:
        # Sanitize filename
        filename = "".join(c if c.isalnum() or c in ('-', '_') else '_' for c in filename)
    
    try:
        qr_code_url = generate_qr_code(text, filename)
        return {
            "status": "success",
            "qr_code_url": qr_code_url,
            "message": "QR code generated successfully"
        }
    except Exception as e:
        print(f"Error generating QR code: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/rbus/redirect")
async def redirect_to_rbus_store(request: Request):
    """
    Redirects to the appropriate app store for RBus app based on the user's device.
    """
    user_agent = request.headers.get('user-agent', '').lower()
    
    # Check if Android
    if 'android' in user_agent:
        return RedirectResponse("https://play.google.com/store/apps/details?id=in.co.datavoice.rbus")
    # Check if iOS
    elif 'iphone' in user_agent or 'ipad' in user_agent or 'ipod' in user_agent:
        return RedirectResponse("https://apps.apple.com/in/app/rbus/id6749367266")
    # Default fallback (for desktop or unknown devices)
    return RedirectResponse("https://play.google.com/store/apps/details?id=in.co.datavoice.rbus")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
