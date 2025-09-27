from fastapi import APIRouter, HTTPException, Depends, Request, status, Query, Body, Header
from fastapi.responses import JSONResponse, RedirectResponse
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from urllib.parse import urlparse, urlencode, parse_qs, urlunparse
from bson import ObjectId
import logging
import shortuuid
import json
import re
import os

from ..models import (
    DynamicQRCodeCreate,
    DynamicQRCodeUpdate,
    DynamicQRCodeInDB,
    DynamicQRCodeType,
    DynamicQRCodeDestination,
    PyObjectId
)
from ..db import (
    db,
    get_dynamic_qr_by_short_code,
    get_dynamic_qr_by_id,
    create_dynamic_qr,
    update_dynamic_qr,
    log_scan,
    get_scan_analytics,
    log_link_click,
    update_scan_metrics
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/dynamic_qr",  # Removed /api since it's already included in main.py
    tags=["dynamic-qr"],
    responses={404: {"description": "Not found"}},
    default_response_class=JSONResponse
)

# Middleware for request logging
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url}")
    logger.info(f"Request headers: {dict(request.headers)}")
    
    # Log request body for POST/PUT requests
    if request.method in ["POST", "PUT"] and "/dynamic_qr" in str(request.url):
        try:
            body = await request.body()
            if body:
                logger.info(f"Request body: {body.decode('utf-8', errors='replace')}")
        except Exception as e:
            logger.warning(f"Error reading request body: {str(e)}")
    
    response = await call_next(request)
    return response

@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify the router is working"""
    return {"status": "success", "message": "Dynamic QR router is working!"}
@router.get("", response_model=List[DynamicQRCodeInDB])
async def list_dynamic_qr_codes(active_only: bool = True):
    """
    List all dynamic QR codes.
    
    Args:
        active_only: If True, only return active QR codes
    """
    try:
        logger.info(f"Fetching dynamic QR codes, active_only={active_only}")
        query = {"is_active": True} if active_only else {}
        logger.info(f"Query: {query}")
        
        # Get the collection
        collection = db.dynamic_qr_codes
        logger.info(f"Collection: {collection}")
        
        # Get the list of collections to verify the database connection
        collections = await db.list_collection_names()
        logger.info(f"Available collections: {collections}")
        
        # Check if the collection exists
        if 'dynamic_qr_codes' not in collections:
            logger.warning("Collection 'dynamic_qr_codes' does not exist")
            return []
            
        # Get the count of documents
        count = await collection.count_documents({})
        logger.info(f"Found {count} documents in the collection")
        
        # Get the QR codes
        qr_codes = []
        async for qr in collection.find(query).sort("created_at", -1):
            # Skip if the QR code is marked as inactive (double check)
            if active_only and not qr.get("is_active", True):
                logger.warning(f"Found inactive QR code in active query: {qr.get('short_code')}")
                continue
                
            # Convert ObjectId to string for the response
            qr["id"] = str(qr.pop("_id"))
            # Convert datetime to ISO format string if it exists
            if 'created_at' in qr and hasattr(qr['created_at'], 'isoformat'):
                qr['created_at'] = qr['created_at'].isoformat()
            if 'updated_at' in qr and hasattr(qr['updated_at'], 'isoformat'):
                qr['updated_at'] = qr['updated_at'].isoformat()
            
            qr_codes.append(qr)
        
        logger.info(f"Found {len(qr_codes)} QR codes matching the query")
        
        # Log the first few QR codes for debugging
        for i, qr in enumerate(qr_codes[:3]):  # Only log first 3 to avoid log spam
            logger.info(f"QR code {i + 1}: {qr.get('short_code')} - Active: {qr.get('is_active', True)}")
            
        return qr_codes
        
    except Exception as e:
        logger.error(f"Error listing dynamic QR codes: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list QR codes: {str(e)}"
        )

@router.post("", response_model=DynamicQRCodeInDB, status_code=status.HTTP_201_CREATED)
async def create_dynamic_qr_code(
    qr_data: DynamicQRCodeCreate,
    request: Request
):
    """
    Create a new dynamic QR code.
    
    - **name**: Name of the QR code (required)
    - **description**: Optional description
    - **type**: Type of QR code (url, app_store, dynamic_redirect)
    - **destinations**: List of destination URLs with conditions
    - **is_active**: Whether the QR code is active
    - **tags**: List of tags for categorization
    - **metadata**: Additional metadata as key-value pairs
    """
    try:
        logger.info(f"Received QR creation request: {qr_data.dict()}")
        
        # Convert to dict and add created_by if available
        qr_dict = qr_data.dict()
        
        # Generate a short code if not provided
        if not qr_dict.get("short_code"):
            qr_dict["short_code"] = shortuuid.uuid()[:8]
        
        # Set default values if not provided
        if "is_active" not in qr_dict:
            qr_dict["is_active"] = True
            
        # Ensure at least one default destination exists if destinations are provided
        if qr_dict.get("destinations"):
            has_default = any(dest.get("is_default") for dest in qr_dict["destinations"])
            if not has_default and qr_dict["destinations"]:
                qr_dict["destinations"][0]["is_default"] = True
        
        logger.info(f"Creating QR code with data: {qr_dict}")
        
        # Create the QR code in the database
        created_qr = await create_dynamic_qr(qr_dict)
        
        if not created_qr:
            logger.error("Failed to create QR code in database")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create dynamic QR code"
            )
            
        logger.info(f"Successfully created QR code: {created_qr}")
        return created_qr
        
    except Exception as e:
        logger.error(f"Error creating dynamic QR code: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the QR code"
        )

@router.get("/{short_code}", response_model=DynamicQRCodeInDB)
async def get_dynamic_qr_code(short_code: str):
    """
    Get details of a dynamic QR code by its short code.
    
    - **short_code**: The short code of the QR code
    """
    qr_code = await get_dynamic_qr_by_short_code(short_code)
    if not qr_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR code not found"
        )
    return qr_code

@router.put("/{short_code}", response_model=DynamicQRCodeInDB)
async def update_dynamic_qr_code(
    short_code: str,
    qr_update: DynamicQRCodeUpdate
):
    """
    Update a dynamic QR code.
    
    - **short_code**: The short code of the QR code to update
    - **qr_update**: The fields to update
    """
    # Get existing QR code
    existing_qr = await get_dynamic_qr_by_short_code(short_code)
    if not existing_qr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR code not found"
        )
    
    # Convert update data to dict and remove None values
    update_data = qr_update.dict(exclude_unset=True)
    
    # Handle destinations update
    if "destinations" in update_data and update_data["destinations"]:
        # Ensure at least one default destination exists
        has_default = any(dest.get("is_default") for dest in update_data["destinations"])
        if not has_default and update_data["destinations"]:
            update_data["destinations"][0]["is_default"] = True
    
    # Update the QR code
    updated_qr = await update_dynamic_qr(short_code, update_data)
    if not updated_qr:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update QR code"
        )
    
    return updated_qr

@router.delete("/{short_code}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dynamic_qr_code(short_code: str):
    """
    Delete a dynamic QR code (soft delete by setting is_active to False).
    
    - **short_code**: The short code of the QR code to delete
    """
    logger.info(f"Attempting to delete QR code with short_code: {short_code}")
    
    # Check if QR code exists
    existing_qr = await get_dynamic_qr_by_short_code(short_code)
    if not existing_qr:
        logger.warning(f"QR code not found with short_code: {short_code}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR code not found"
        )
    
    logger.info(f"Found QR code to delete: {existing_qr.get('_id')} - {existing_qr.get('name')}")
    
    # Soft delete by setting is_active to False
    update_result = await update_dynamic_qr(short_code, {"is_active": False})
    
    if not update_result:
        logger.error(f"Failed to update QR code {short_code} during delete")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete QR code"
        )
    
    logger.info(f"Successfully soft-deleted QR code: {short_code}")
    
    return JSONResponse(
        status_code=status.HTTP_204_NO_CONTENT,
        content=None
    )

@router.get("/{short_code}/analytics")
async def get_qr_code_analytics(
    short_code: str,
    time_range: str = Query("30d", regex="^(24h|7d|30d|90d|1y|all)$")
):
    """
    Get analytics for a dynamic QR code.
    
    - **short_code**: The short code of the QR code
    - **time_range**: Time range for analytics (24h, 7d, 30d, 90d, 1y, all)
    """
    # Check if QR code exists
    existing_qr = await get_dynamic_qr_by_short_code(short_code)
    if not existing_qr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR code not found"
        )
    
    # Get analytics data
    analytics = await get_scan_analytics(short_code, time_range)
    
    return {
        "short_code": short_code,
        "name": existing_qr.get("name", ""),
        "total_scans": existing_qr.get("total_scans", 0),
        "last_scan": existing_qr.get("last_scan"),
        "analytics": analytics
    }

# Regex patterns for URL validation
PLAY_STORE_PATTERN = r'^https?:\/\/(?:play\.google\.com\/store\/apps\/.*|(?:.*\.)?android\.app\/.*)$'
APP_STORE_PATTERN = r'^https?:\/\/(?:itunes\.apple\.com\/.*|apps\.apple\.com\/.*)$'

@router.get("/{short_code}/redirect")
async def redirect_qr_code(
    short_code: str,
    request: Request,
    os: Optional[str] = None,
    ref: Optional[str] = None,
    utm_source: Optional[str] = None,
    utm_medium: Optional[str] = None,
    utm_campaign: Optional[str] = None,
    utm_term: Optional[str] = None,
    utm_content: Optional[str] = None
):
    """
    Handle QR code redirection with device detection and analytics.
    
    - **short_code**: The short code of the QR code
    - **os**: Override OS detection (ios, android, etc.)
    - **ref**: Referrer ID for tracking
    - **utm_***: UTM parameters for campaign tracking
    """
    # Get the QR code
    qr_code = await get_dynamic_qr_by_short_code(short_code)
    if not qr_code or not qr_code.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR code not found or inactive"
        )
        
    # Log the scan for analytics
    await log_scan(
        qr_code_id=qr_code["id"],
        short_code=short_code,
        request_headers=dict(request.headers),
        request_query=dict(request.query_params)
    )
    
    # Update scan count and last scan time
    await update_scan_metrics(short_code)
    return qr_code

def _get_browser(user_agent: str) -> str:
    """Extract browser name from user agent."""
    user_agent = user_agent.lower()
    if 'firefox' in user_agent:
        return 'firefox'
    elif 'chrome' in user_agent:
        return 'chrome'
    elif 'safari' in user_agent:
        return 'safari'
    elif 'msie' in user_agent or 'trident' in user_agent:
        return 'ie'
    elif 'edge' in user_agent:
        return 'edge'
    elif 'opera' in user_agent or 'opr/' in user_agent:
        return 'opera'
    return 'other'

def _get_os(user_agent: str) -> str:
    """Extract OS name from user agent."""
    user_agent = user_agent.lower()
    if 'windows' in user_agent:
        return 'windows'
    elif 'mac os x' in user_agent:
        return 'macos'
    elif 'linux' in user_agent and 'android' not in user_agent:
        return 'linux'
    elif 'android' in user_agent:
        return 'android'
    elif 'iphone' in user_agent or 'ipad' in user_agent or 'ipod' in user_agent:
        return 'ios'
    return 'other'

def _get_redirect_url(qr_code: dict, device_info: dict) -> str:
    """Determine the best matching URL based on device and QR code destinations."""
    # First, try to get URL from destinations
    destinations = qr_code.get('destinations', [])
    
    # If no destinations, return the main URL
    if not destinations:
        return qr_code.get('url', 'https://example.com/not-found')
    
    # Try to find a matching destination based on device
    for dest in destinations:
        # If no conditions, use this destination
        if not dest.get('conditions'):
            return dest.get('url', qr_code.get('url', 'https://example.com/not-found'))
            
        # Check if this destination matches the device
        conditions = dest.get('conditions', {})
        if not conditions:
            return dest.get('url', qr_code.get('url', 'https://example.com/not-found'))
            
        # Check OS condition if specified
        if 'os' in conditions and device_info.get('os'):
            if conditions['os'].lower() != device_info['os'].lower():
                continue
                
        # Check device type if specified
        if 'device_type' in conditions and device_info.get('os'):
            if conditions['device_type'].lower() != device_info['os'].lower():
                continue
                
        # If we get here, all conditions are met
        return dest.get('url', qr_code.get('url', 'https://example.com/not-found'))
    
    # If no specific match, return the first destination's URL or the main URL
    if destinations and destinations[0].get('url'):
        return destinations[0]['url']
        
    return qr_code.get('url', 'https://example.com/not-found')

@router.get("/r/{qr_id}")
async def redirect_qr_code(
    qr_id: str,
    request: Request,
    os: Optional[str] = None,
    ref: Optional[str] = None,
    utm_source: Optional[str] = None,
    utm_medium: Optional[str] = None,
    utm_campaign: Optional[str] = None,
    utm_term: Optional[str] = None,
    utm_content: Optional[str] = None
):
    """
    Handle QR code redirection using permanent QR code ID.
    
    - **qr_id**: The permanent ID of the QR code
    - **os**: Override OS detection (ios, android, etc.)
    - **ref**: Referrer ID for tracking
    - **utm_***: UTM parameters for campaign tracking
    """
    # Get the QR code by its permanent ID
    qr_code = await get_dynamic_qr_by_id(qr_id)
    if not qr_code or not qr_code.get("is_active", True):
        return RedirectResponse(
            url="https://example.com/not-found",
            status_code=status.HTTP_302_FOUND
        )
    
    # Log the scan for analytics
    await log_scan(
        qr_code_id=qr_code["id"],
        short_code=qr_id,
        request_headers=dict(request.headers),
        request_query=dict(request.query_params)
    )
    
    # Update scan metrics
    await update_scan_metrics(qr_id)
    
    # Enhanced device detection
    user_agent = request.headers.get("user-agent", "").lower()
    
    # Get client IP address (handling proxy headers)
    if "x-forwarded-for" in request.headers:
        ip_address = request.headers["x-forwarded-for"].split(",")[0]
    else:
        ip_address = request.client.host if request.client else ""
    
    # Enhanced device detection with better mobile detection
    is_ios = any(x in user_agent.lower() for x in ['iphone', 'ipad', 'ios'])
    is_android = 'android' in user_agent.lower() and 'windows' not in user_agent.lower()
    is_mobile = is_ios or is_android or any(x in user_agent.lower() for x in ['mobile', 'mobi'])
    
    device_info = {
        'is_ios': is_ios,
        'is_android': is_android,
        'is_desktop': not is_mobile and ('windows nt' in user_agent.lower() or 'macintosh' in user_agent.lower() or 'linux' in user_agent.lower()),
        'is_tablet': 'ipad' in user_agent.lower() or ('android' in user_agent.lower() and 'mobile' not in user_agent.lower()),
        'is_mobile': is_mobile,
        'browser': _get_browser(user_agent),
        'os': _get_os(user_agent)
    }
    
    # Override OS if explicitly provided
    if os:
        device_info['os'] = os.lower()
        device_info['is_ios'] = device_info['os'] == 'ios'
        device_info['is_android'] = device_info['os'] == 'android'
    
    # Get the appropriate destination URL based on device and conditions
    target_url = _get_redirect_url(qr_code, device_info)
    
    # If no URL was found in destinations, try to get the main URL
    if not target_url:
        target_url = qr_code.get('url')
    
    # If still no URL, use a default error page
    if not target_url:
        target_url = "https://example.com/error"
    
    # Ensure the URL has a protocol and is absolute
    if not target_url.startswith(('http://', 'https://')):
        # If it's a relative URL, make it absolute using the request's base URL
        if target_url.startswith('/'):
            base_url = str(request.base_url).rstrip('/')
            target_url = f"{base_url}{target_url}"
        else:
            target_url = f'https://{target_url}'
    
    # Add UTM parameters if any
    if any([utm_source, utm_medium, utm_campaign, utm_term, utm_content]):
        from urllib.parse import urlparse, urlencode, parse_qs, urlunparse
        parsed_url = list(urlparse(target_url))
        query = parse_qs(parsed_url[4])
        
        # Add UTM parameters
        if utm_source:
            query['utm_source'] = [utm_source]
        if utm_medium:
            query['utm_medium'] = [utm_medium]
        if utm_campaign:
            query['utm_campaign'] = [utm_campaign]
        if utm_term:
            query['utm_term'] = [utm_term]
        if utm_content:
            query['utm_content'] = [utm_content]
        if ref:
            query['ref'] = [ref]
            
        # Rebuild URL with UTM parameters
        parsed_url[4] = urlencode(query, doseq=True)
        target_url = urlunparse(parsed_url)
    
    # Log the scan for analytics
    await log_scan(
        qr_code_id=qr_code["id"],
        short_code=qr_id,
        request_headers=dict(request.headers),
        request_query=dict(request.query_params)
    )
    
    # Update scan metrics
    await update_scan_metrics(qr_id)
    
    # Redirect to the target URL
    return RedirectResponse(url=target_url, status_code=status.HTTP_302_FOUND)

@router.get("/debug/qr-codes/{short_code}")
async def debug_get_qr_code(short_code: str):
    """Debug endpoint to get raw QR code data from database"""
    try:
        # Get the raw document from MongoDB
        qr_code = await db.dynamic_qr_codes.find_one({"short_code": short_code})
        
        if not qr_code:
            raise HTTPException(status_code=404, detail="QR code not found")
            
        # Convert ObjectId to string for JSON serialization
        qr_code["_id"] = str(qr_code["_id"])
        
        # Convert datetime objects to ISO format strings
        for field in ["created_at", "updated_at", "last_scan"]:
            if field in qr_code and qr_code[field] is not None:
                if isinstance(qr_code[field], datetime):
                    qr_code[field] = qr_code[field].isoformat()
        
        return qr_code
        
    except Exception as e:
        logger.error(f"Debug error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Health check endpoint to verify the API is running"""
    try:
        # Simple database ping
        await db.command('ping')
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

@router.get("/r/{short_code}", response_class=RedirectResponse, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
async def redirect_short_code(
    short_code: str,
    request: Request,
    os: Optional[str] = None,
    ref: Optional[str] = None,
    utm_source: Optional[str] = None,
    utm_medium: Optional[str] = None,
    utm_campaign: Optional[str] = None,
    utm_term: Optional[str] = None,
    utm_content: Optional[str] = None
):
    """
    Handle QR code redirection using short code with device detection and analytics.
    
    - **short_code**: The short code of the QR code
    - **os**: Override OS detection (ios, android, etc.)
    - **ref**: Referrer ID for tracking
    - **utm_***: UTM parameters for campaign tracking
    """
    try:
        # Get the QR code from the database
        qr_code = await get_dynamic_qr_by_short_code(short_code)
        
        if not qr_code or not qr_code.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="QR code not found or inactive"
            )
        
        # Get user agent and device info
        user_agent = request.headers.get("user-agent", "").lower()
        
        # Determine device OS (use provided OS or detect from user agent)
        device_os = os or _get_os(user_agent)
        
        # Prepare device info for analytics
        device_info = {
            "os": device_os,
            "browser": _get_browser(user_agent),
            "user_agent": user_agent,
            "ip": request.client.host if request.client else None,
            "referrer": request.headers.get("referer"),
            "utm_source": utm_source,
            "utm_medium": utm_medium,
            "utm_campaign": utm_campaign,
            "utm_term": utm_term,
            "utm_content": utm_content,
            "ref": ref
        }
        
        # Get the appropriate redirect URL based on device
        redirect_url = _get_redirect_url(qr_code, device_info)
        
        if not redirect_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid redirect URL found for this device"
            )
        
        # Log the scan for analytics
        await log_scan(
            qr_code_id=qr_code["id"],
            ip_address=device_info["ip"],
            user_agent=user_agent,
            referrer=request.headers.get("referer"),
            device_os=device_os,
            device_browser=device_info["browser"],
            utm_source=utm_source,
            utm_medium=utm_medium,
            utm_campaign=utm_campaign,
            utm_term=utm_term,
            utm_content=utm_content,
            ref=ref
        )
        
        # Update scan metrics
        await update_scan_metrics(
            qr_code["id"],
            total_scans=1,
            last_scan=datetime.utcnow()
        )
        
        # Add UTM parameters to the redirect URL if they exist
        if any([utm_source, utm_medium, utm_campaign, utm_term, utm_content, ref]):
            from urllib.parse import urlparse, urlencode, parse_qs, urlunparse
            
            # Parse the URL
            parsed_url = urlparse(redirect_url)
            query_params = parse_qs(parsed_url.query)
            
            # Add UTM parameters
            utm_params = {
                'utm_source': utm_source,
                'utm_medium': utm_medium,
                'utm_campaign': utm_campaign,
                'utm_term': utm_term,
                'utm_content': utm_content,
                'ref': ref
            }
            
            # Only add non-None parameters
            utm_params = {k: v for k, v in utm_params.items() if v is not None}
            query_params.update(utm_params)
            
            # Rebuild the URL with new query parameters
            redirect_url = urlunparse(parsed_url._replace(
                query=urlencode(query_params, doseq=True)
            ))
        
        # Return the redirect response
        return RedirectResponse(
            url=redirect_url,
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in redirect_short_code: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing your request"
        )

# Add this router to your main FastAPI app in main.py
