import os
import uuid
from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, FileResponse, Response
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
LOGO_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "static", "logo.jpg"))
print(f"Logo path: {LOGO_PATH}")

@app.get("/logo.jpg")
async def get_logo():
    if not os.path.exists(LOGO_PATH):
        raise HTTPException(status_code=404, detail="Logo file not found")
    return FileResponse(LOGO_PATH, media_type="image/jpeg")
app.mount("/qrcodes", StaticFiles(directory=QR_CODES_DIR), name="qrcodes")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

def generate_qr_code(data: str, filename: str) -> str:
    """
    Generate a QR code and save it to the persistent storage.
    
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
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
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
        qr.make_image(fill_color="black", back_color="white").save(img_path)
        
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
