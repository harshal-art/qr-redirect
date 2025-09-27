import os
import uuid
import re
import json
import io
import base64
import logging
from enum import Enum
from datetime import datetime
from typing import Optional, Dict, Any, List, Union
from pathlib import Path

import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.colormasks import RadialGradiantColorMask, SquareGradiantColorMask, HorizontalGradiantColorMask, VerticalGradiantColorMask
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer, SquareModuleDrawer, GappedSquareModuleDrawer, CircleModuleDrawer
from PIL import Image, ImageDraw, ImageFont
from fastapi import FastAPI, Request, Form, HTTPException, Depends, status, Query, Body
from fastapi.responses import HTMLResponse, FileResponse, Response, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# Import routers and utilities
from .api.dynamic_qr import router as dynamic_qr_router
from .api.dynamic_links import router as dynamic_links_router
from .db import create_indexes
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, HttpUrl, Field, field_validator, ConfigDict, conint, confloat
import requests
from io import BytesIO

# Optional imports with fallbacks
try:
    import cairosvg
    import cairosvg.parser
    import cairosvg.surface
    HAS_CAIRO = True
except (ImportError, OSError) as e:
    HAS_CAIRO = False
    logging.warning("Cairo not available. SVG and PDF exports will be limited. Error: %s", str(e))

# Initialize FastAPI app with CORS settings
app = FastAPI(
    title="QR Code Generator API",
    description="API for generating QR codes with various customization options",
    version="1.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=False,  # Set to False when allow_origins is ["*"]
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],  # Expose all headers to the client
)

# Add CORS headers middleware for preflight requests
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    if request.method == "OPTIONS":
        response = Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Max-Age": "600"  # 10 minutes
            }
        )
        return response
    
    response = await call_next(request)
    
    # Add CORS headers to all responses
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Credentials"] = "false"
    response.headers["Access-Control-Max-Age"] = "600"  # 10 minutes
    
    return response

# Include routers
app.include_router(dynamic_links_router, prefix="/api")
app.include_router(dynamic_qr_router, prefix="/api")

# Initialize database on startup
@app.on_event("startup")
async def startup_db_client():
    await create_indexes()

# Models
class QRCodeType(str, Enum):
    URL = "url"
    VCARD = "vcard"
    WIFI = "wifi"
    TEXT = "text"
    EMAIL = "email"
    SMS = "sms"
    PHONE = "phone"
    LOCATION = "location"
    EVENT = "event"

class WiFiConfig(BaseModel):
    ssid: str
    password: str
    security: str = "WPA"  # WPA, WEP, nopass
    hidden: bool = False
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "ssid": "MyWiFi",
                "password": "mysecurepassword",
                "security": "WPA",
                "hidden": False
            }
        }
    }

class VCardData(BaseModel):
    first_name: str
    last_name: str
    org: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[HttpUrl] = None
    address: Optional[str] = None
    note: Optional[str] = None
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "first_name": "John",
                "last_name": "Doe",
                "org": "Acme Inc.",
                "title": "Software Engineer",
                "email": "john.doe@example.com",
                "phone": "+1234567890",
                "website": "https://example.com",
                "address": "123 Main St, City, Country",
                "note": "Business Contact"
            }
        }
    }

class EmailData(BaseModel):
    """Model for email data used in QR codes."""
    
    to: str = Field(..., description="Recipient email address")
    subject: str = Field(
        default="",
        description="Email subject line"
    )
    body: str = Field(
        default="",
        description="Email body content"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "to": "recipient@example.com",
                "subject": "Hello!",
                "body": "This is a test email."
            }
        }
    )
    
    @field_validator('to')
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Validate email format."""
        if '@' not in v or '.' not in v.split('@')[-1]:
            raise ValueError("Invalid email format")
        return v

class SMSData(BaseModel):
    """Model for SMS data used in QR codes."""
    
    number: str = Field(..., description="Recipient phone number with country code")
    message: str = Field(
        default="",
        description="SMS message content"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "number": "+1234567890",
                "message": "Hello! This is a test message."
            }
        }
    )
    
    @field_validator('number')
    @classmethod
    def validate_phone_number(cls, v: str) -> str:
        """Basic phone number validation."""
        # Remove all non-digit characters except leading +
        cleaned = ''.join(c for c in v if c.isdigit() or c == '+')
        if not cleaned.startswith('+'):
            cleaned = '+' + cleaned
        
        # Basic validation - at least 10 digits (including country code)
        if sum(c.isdigit() for c in cleaned) < 10:
            raise ValueError("Phone number is too short")
            
        return cleaned

class LocationData(BaseModel):
    """Model for location data used in QR codes."""
    
    latitude: float = Field(..., 
                          ge=-90.0, 
                          le=90.0,
                          description="Latitude in decimal degrees (-90 to 90)")
    longitude: float = Field(..., 
                           ge=-180.0, 
                           le=180.0,
                           description="Longitude in decimal degrees (-180 to 180)")
    query: Optional[str] = Field(
        default=None,
        description="Optional location name or address"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "latitude": 37.7749,
                "longitude": -122.4194,
                "query": "San Francisco, CA"
            }
        }
    )

class EventData(BaseModel):
    """Model for calendar event data used in QR codes."""
    
    summary: str = Field(..., description="Event title or name")
    start: datetime = Field(..., description="Event start date and time")
    end: datetime = Field(..., description="Event end date and time")
    location: Optional[str] = Field(
        default=None,
        description="Event location (e.g., physical address or meeting room)"
    )
    description: Optional[str] = Field(
        default=None,
        description="Detailed event description"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "summary": "Team Meeting",
                "start": "2023-12-25T10:00:00",
                "end": "2023-12-25T11:00:00",
                "location": "Conference Room A",
                "description": "Quarterly planning meeting"
            }
        }
    )
    
    @field_validator('end')
    @classmethod
    def validate_event_times(cls, v: datetime, info: Any) -> datetime:
        """Validate that end time is after start time."""
        if 'start' in info.data and v <= info.data['start']:
            raise ValueError("End time must be after start time")
        return v

class QRCodeFormat(str, Enum):
    PNG = "png"
    SVG = "svg"
    PDF = "pdf"
    EPS = "eps"
    
    @classmethod
    def get_supported_formats(cls):
        """Return list of supported formats based on available dependencies."""
        formats = [cls.PNG]
        if HAS_CAIRO:
            formats.extend([cls.SVG, cls.PDF, cls.EPS])
        return formats

class QRCodeEyeStyle(str, Enum):
    SQUARE = "square"
    ROUNDED = "rounded"
    CIRCULAR = "circular"
    DIAMOND = "diamond"

class QRCodeGradientType(str, Enum):
    NONE = "none"
    RADIAL = "radial"
    HORIZONTAL = "horizontal"
    VERTICAL = "vertical"
    DIAGONAL = "diagonal"

class QRCodeRequest(BaseModel):
    """Model for QR code generation requests."""
    
    type: QRCodeType = Field(
        default=QRCodeType.URL,
        description="Type of QR code to generate"
    )
    data: Union[str, Dict[str, Any]] = Field(
        ...,
        description="Data to encode in the QR code. Can be a string or a structured object based on the QR code type."
    )
    filename: Optional[str] = Field(
        default=None,
        description="Optional filename for the generated QR code (without extension)"
    )
    size: int = Field(
        default=300,
        ge=100,
        le=2000,
        description="Size of the QR code in pixels (width and height)"
    )
    border: int = Field(
        default=4,
        ge=1,
        le=10,
        description="Size of the quiet zone around the QR code in modules"
    )
    fill_color: str = Field(
        default="#000000",
        description="Color of the QR code modules in hex format"
    )
    back_color: str = Field(
        default="#FFFFFF",
        description="Background color of the QR code in hex format"
    )
    gradient_type: QRCodeGradientType = Field(
        default=QRCodeGradientType.NONE,
        description="Type of gradient to apply to the QR code"
    )
    gradient_color: Optional[str] = Field(
        default=None,
        description="Second color for gradient in hex format (if gradient_type is not NONE)"
    )
    eye_style: QRCodeEyeStyle = Field(
        default=QRCodeEyeStyle.SQUARE,
        description="Style of the QR code eye patterns"
    )
    logo_url: Optional[HttpUrl] = Field(
        default=None,
        description="URL of a logo to place in the center of the QR code"
    )
    format: QRCodeFormat = Field(
        default=QRCodeFormat.PNG,
        description="Output format of the generated QR code"
    )
    error_correction: str = Field(
        default="H",
        description="Error correction level (L, M, Q, H)"
    )
    version: Optional[int] = Field(
        default=None,
        ge=1,
        le=40,
        description="QR code version (1-40). If None, the smallest possible version will be used."
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "type": "url",
                "data": "https://example.com",
                "filename": "my_qr_code",
                "size": 300,
                "border": 4,
                "fill_color": "#000000",
                "back_color": "#FFFFFF",
                "gradient_type": "none",
                "gradient_color": None,
                "eye_style": "square",
                "logo_url": None,
                "format": "png",
                "error_correction": "H",
                "version": None
            }
        }
    )

    @field_validator('fill_color', 'back_color', 'gradient_color')
    @classmethod
    def validate_hex_color(cls, v: Optional[str], info: Any) -> Optional[str]:
        """
        Validate that the color is a valid hex color code.
        
        Args:
            v: The color value to validate
            info: Field validation info
            
        Returns:
            The validated color value
            
        Raises:
            ValueError: If the color is not a valid hex color code
        """
        if v is None:
            return v
            
        if not isinstance(v, str) or not re.match(r'^#(?:[0-9a-fA-F]{3,4}){1,2}$', v):
            field_name = info.field_name
            raise ValueError(f'{field_name} must be a valid hex color code (e.g., #RRGGBB or #RRGGBBAA)')
            
        return v.upper() if v.startswith('#') else '#' + v.upper()

    @field_validator('error_correction')
    @classmethod
    def validate_error_correction(cls, v: str) -> str:
        """
        Validate and normalize the error correction level.
        
        Args:
            v: The error correction level to validate
            
        Returns:
            The normalized error correction level (uppercase)
            
        Raises:
            ValueError: If the error correction level is not valid
        """
        normalized = v.upper()
        if normalized not in {'L', 'M', 'Q', 'H'}:
            raise ValueError('Error correction must be one of: L (Low), M (Medium), Q (Quartile), H (High)')
            
        return normalized

# Define paths

# Define base directory (one level up from backend)
BASE_DIR = Path(__file__).parent.parent.parent

# Define directories
STATIC_DIR = BASE_DIR / 'persistent_storage' / 'static'
FRONTEND_STATIC_DIR = BASE_DIR / 'frontend-react' / 'build' / 'static'
TEMPLATES_DIR = BASE_DIR / 'templates'
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
# Only mount frontend static files if the directory exists
if FRONTEND_STATIC_DIR.exists():
    app.mount("/frontend/static", StaticFiles(directory=FRONTEND_STATIC_DIR), name="frontend_static")
# Serve logo directly
LOGO_PATH = BASE_DIR / 'frontend-react' / 'public' / 'logo.jpg'
print(f"Logo path: {LOGO_PATH}")
if not LOGO_PATH.exists():
    print("Warning: Logo file not found at", LOGO_PATH)

@app.get("/logo.jpg")
async def get_logo():
    if not LOGO_PATH.exists():
        raise HTTPException(status_code=404, detail=f"Logo file not found at {LOGO_PATH}")
    return FileResponse(LOGO_PATH, media_type="image/jpeg")
app.mount("/qrcodes", StaticFiles(directory=QR_CODES_DIR), name="qrcodes")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

def generate_qr_code(qr_request: QRCodeRequest):
    """
    Generate a QR code with the given configuration.
    
    Args:
        qr_request: QRCodeRequest object containing all parameters
        
    Returns:
        dict: Contains status, qr_code_url, and message
        
    Raises:
        HTTPException: If the requested format is not supported
    """
    # Check if the requested format is supported
    if qr_request.format not in QRCodeFormat.get_supported_formats():
        if qr_request.format in [QRCodeFormat.SVG, QRCodeFormat.PDF, QRCodeFormat.EPS]:
            raise HTTPException(
                status_code=400,
                detail=f"{qr_request.format.upper()} export requires Cairo to be installed. "
                       "Please install Cairo or use PNG format."
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported format: {qr_request.format}"
            )
    try:
        # Prepare the data based on QR code type
        qr_data = prepare_qr_data(qr_request)

        # Generate QR code with styling
        qr_img = create_styled_qr_code(qr_request, qr_data)

        # Add logo if provided
        if qr_request.logo_url:
            qr_img = add_logo_to_qr(qr_img, qr_request.logo_url)

        # Generate filename if not provided
        if not qr_request.filename:
            qr_request.filename = f"qr_{qr_request.type}_{int(datetime.now().timestamp())}"
        
        # Ensure the filename is URL-safe
        safe_filename = "".join(c if c.isalnum() or c in '._-' else '_' for c in qr_request.filename)
        safe_filename = safe_filename.strip('_.- ')
        
        # Create output directory if it doesn't exist
        os.makedirs(QR_CODES_DIR, exist_ok=True)
        
        # Save the image in the requested format
        output_path = os.path.join(QR_CODES_DIR, f"{safe_filename}.{qr_request.format}")
        
        # Save in the appropriate format
        try:
            if qr_request.format == QRCodeFormat.SVG and HAS_CAIRO:
                # For SVG, we need to convert the PIL image to SVG
                temp_png = os.path.join(QR_CODES_DIR, f"temp_{uuid.uuid4()}.png")
                qr_img.save(temp_png, format='PNG')
                
                # Convert to SVG using cairosvg
                cairosvg.svg2png(url=temp_png, write_to=output_path)
                os.remove(temp_png)
                    
            elif qr_request.format == QRCodeFormat.PDF and HAS_CAIRO:
                qr_img.save(output_path, 'PDF', resolution=100.0)
                
            elif qr_request.format == QRCodeFormat.EPS and HAS_CAIRO:
                qr_img.save(output_path, 'EPS')
                
            else:  # Default to PNG
                qr_img.save(output_path, 'PNG')
                
        except Exception as e:
            # If there's an error with the requested format, fall back to PNG
            if qr_request.format != QRCodeFormat.PNG:
                logging.warning(f"Failed to save as {qr_request.format}, falling back to PNG. Error: {str(e)}")
                output_path = os.path.join(QR_CODES_DIR, f"{safe_filename}.png")
                qr_img.save(output_path, 'PNG')
                qr_request.format = QRCodeFormat.PNG
            else:
                raise

        return {
            "status": "success",
            "qr_code_url": f"/qrcodes/{safe_filename}.{qr_request.format}",
            "message": "QR code generated successfully"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate QR code: {str(e)}"
        )

def prepare_qr_data(qr_request: QRCodeRequest) -> str:
    """Prepare the data string based on QR code type."""
    if qr_request.type == QRCodeType.URL:
        return str(qr_request.data)
        
    elif qr_request.type == QRCodeType.VCARD:
        vcard = VCardData(**qr_request.data) if isinstance(qr_request.data, dict) else qr_request.data
        qr_data = ["BEGIN:VCARD", "VERSION:3.0"]
        
        if hasattr(vcard, 'first_name') or hasattr(vcard, 'last_name'):
            qr_data.append(f"N:{getattr(vcard, 'last_name', '')};{getattr(vcard, 'first_name', '')};;;")
            qr_data.append(f"FN:{getattr(vcard, 'first_name', '')} {getattr(vcard, 'last_name', '')}".strip())
        
        for field in ['org', 'title', 'email', 'phone', 'website', 'address', 'note']:
            if hasattr(vcard, field) and getattr(vcard, field):
                value = getattr(vcard, field)
                if field == 'website':
                    qr_data.append(f"URL:{value}")
                elif field == 'address':
                    qr_data.append(f"ADR:;;{value};;;;")
                else:
                    qr_data.append(f"{field.upper()}:{value}")
        
        qr_data.append("END:VCARD")
        return "\n".join(qr_data)
        
    elif qr_request.type == QRCodeType.WIFI:
        wifi = WiFiConfig(**qr_request.data) if isinstance(qr_request.data, dict) else qr_request.data
        qr_data = f"WIFI:S:{wifi.ssid};T:{wifi.security};P:{wifi.password};;"
        if hasattr(wifi, 'hidden') and wifi.hidden:
            qr_data = qr_data[:-1] + ";H:true;"
        return qr_data
        
    elif qr_request.type == QRCodeType.EMAIL:
        email = EmailData(**qr_request.data) if isinstance(qr_request.data, dict) else qr_request.data
        params = []
        if hasattr(email, 'subject') and email.subject:
            params.append(f"subject={email.subject}")
        if hasattr(email, 'body') and email.body:
            params.append(f"body={email.body}")
        return f"mailto:{email.to}" + ("?" + "&".join(params) if params else "")
        
    elif qr_request.type == QRCodeType.SMS:
        sms = SMSData(**qr_request.data) if isinstance(qr_request.data, dict) else qr_request.data
        return f"sms:{sms.number}" + (f"?body={sms.message}" if hasattr(sms, 'message') and sms.message else "")
        
    elif qr_request.type == QRCodeType.PHONE:
        return f"tel:{qr_request.data}"
        
    elif qr_request.type == QRCodeType.LOCATION:
        loc = LocationData(**qr_request.data) if isinstance(qr_request.data, dict) else qr_request.data
        return f"geo:{loc.latitude},{loc.longitude}" + (f"?q={loc.query}" if hasattr(loc, 'query') and loc.query else "")
        
    elif qr_request.type == QRCodeType.EVENT:
        event = EventData(**qr_request.data) if isinstance(qr_request.data, dict) else qr_request.data
        qr_data = ["BEGIN:VEVENT"]
        qr_data.append(f"SUMMARY:{event.summary}")
        qr_data.append(f"DTSTART:{event.start.strftime('%Y%m%dT%H%M%S')}")
        qr_data.append(f"DTEND:{event.end.strftime('%Y%m%dT%H%M%S')}")
        
        if hasattr(event, 'location') and event.location:
            qr_data.append(f"LOCATION:{event.location}")
        if hasattr(event, 'description') and event.description:
            qr_data.append(f"DESCRIPTION:{event.description}")
            
        qr_data.append("END:VEVENT")
        return "\n".join(qr_data)
        
    return str(qr_request.data)

def create_styled_qr_code(qr_request: QRCodeRequest, qr_data: str) -> Image.Image:
    """Create a styled QR code image."""
    # Generate QR code
    qr = qrcode.QRCode(
        version=qr_request.version,
        error_correction=getattr(qrcode.constants, f'ERROR_CORRECT_{qr_request.error_correction}'),
        box_size=max(1, qr_request.size // 25),  # Ensure box_size is at least 1
        border=qr_request.border,
    )
    
    qr.add_data(qr_data)
    qr.make(fit=True)

    # Convert hex to RGB
    fill_rgb = tuple(int(qr_request.fill_color.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))
    back_rgb = tuple(int(qr_request.back_color.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))
    
    # Handle gradient
    color_mask = None
    if qr_request.gradient_type != QRCodeGradientType.NONE and qr_request.gradient_color:
        gradient_rgb = tuple(int(qr_request.gradient_color.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))
        
        if qr_request.gradient_type == QRCodeGradientType.RADIAL:
            color_mask = RadialGradiantColorMask(
                back_color=back_rgb,
                center_color=fill_rgb,
                edge_color=gradient_rgb
            )
        elif qr_request.gradient_type == QRCodeGradientType.HORIZONTAL:
            color_mask = HorizontalGradiantColorMask(
                back_color=back_rgb,
                left_color=fill_rgb,
                right_color=gradient_rgb
            )
        elif qr_request.gradient_type == QRCodeGradientType.VERTICAL:
            color_mask = VerticalGradiantColorMask(
                back_color=back_rgb,
                top_color=fill_rgb,
                bottom_color=gradient_rgb
            )
        else:  # DIAGONAL
            color_mask = SquareGradiantColorMask(
                back_color=back_rgb,
                center_color=fill_rgb,
                edge_color=gradient_rgb
            )
    
    # Handle eye style
    if qr_request.eye_style == QRCodeEyeStyle.ROUNDED:
        module_drawer = RoundedModuleDrawer()
    elif qr_request.eye_style == QRCodeEyeStyle.CIRCULAR:
        module_drawer = CircleModuleDrawer()
    else:
        module_drawer = SquareModuleDrawer()

    # Generate QR code image
    return qr.make_image(
        fill_color=fill_rgb,
        back_color=back_rgb,
        image_factory=StyledPilImage,
        color_mask=color_mask,
        module_drawer=module_drawer
    )

def add_logo_to_qr(qr_img: Image.Image, logo_url: str) -> Image.Image:
    """Add a logo to the center of the QR code."""
    try:
        # Download logo
        response = requests.get(str(logo_url))
        response.raise_for_status()
        logo = Image.open(BytesIO(response.content)).convert("RGBA")
        
        # Calculate logo size (25% of QR code size, but not larger than 150px)
        logo_size = min(qr_img.size[0] // 4, qr_img.size[1] // 4, 150)
        logo = logo.resize((logo_size, logo_size), Image.LANCZOS)
        
        # Create circular mask for logo
        mask = Image.new('L', (logo_size, logo_size), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, logo_size, logo_size), fill=255)
        
        # Calculate position to center the logo
        pos = ((qr_img.size[0] - logo_size) // 2, (qr_img.size[1] - logo_size) // 2)
        
        # Create a copy of the QR code to avoid modifying the original
        qr_with_logo = qr_img.copy()
        
        # Paste logo with mask
        qr_with_logo.paste(logo, pos, mask)
        
        return qr_with_logo
        
    except Exception as e:
        print(f"Error adding logo: {e}")
        return qr_img  # Return original if there's an error

# Define root endpoint
@app.get("/")
async def read_root(request: Request):
    return {"message": "Welcome to QR Code Generator API"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint to verify the API is running."""
    return {"status": "ok", "version": "1.0.0", "service": "QR Code Generator API"}

# Define QR code generation endpoint
@app.post("/api/generate")
async def create_qr_code(
    qr_request: QRCodeRequest = Body(...)
):
    """
    Generate a QR code with the given configuration.
    
    Request body should be a JSON object with the following structure:
    {
        "type": "url" | "vcard" | "wifi",
        "data": "string or object depending on type",
        "filename": "optional_custom_filename",
        "size": 300,
        "fill_color": "#000000",
        "back_color": "#FFFFFF",
        "format": "png" | "svg" | "pdf"
    }
    """
    try:
        result = generate_qr_code(qr_request)
        return result
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate QR code: {str(e)}")


# Add endpoint for backward compatibility
@app.post("/generate/legacy", include_in_schema=False)
async def create_qr_code_legacy(
    text: str = Form(...),
    filename: Optional[str] = Form("qr_code")
):
    """Legacy endpoint that maintains backward compatibility with the old form-based API"""
    try:
        qr_request = QRCodeRequest(
            type=QRCodeType.URL,
            data=text,
            filename=filename
        )
        qr_code_url = generate_qr_code(qr_request)
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
