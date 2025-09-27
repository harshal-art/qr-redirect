from fastapi import APIRouter, HTTPException, Depends, Request, Header, status
from fastapi.responses import RedirectResponse, JSONResponse
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from urllib.parse import urlparse, urlencode, parse_qs, urlunparse
import shortuuid
import re
import logging

from ..models import DynamicLink, PyObjectId
from ..db import db, log_link_click

router = APIRouter(prefix="/dynamic-links", tags=["Dynamic Links"])

# Regex patterns for app store URLs
PLAY_STORE_PATTERN = r'^https?://(?:play\.google\.com/store/apps/.*|(?:.*\.)?android\.app/.*)$'
APP_STORE_PATTERN = r'^https?://(?:itunes\.apple\.com/.*|apps\.apple\.com/.*)$'

@router.post("/", response_model=DynamicLink)
async def create_dynamic_link(link_data: Dict[str, str]):
    """
    Create a new dynamic link with platform-specific URLs
    """
    # Generate a short code
    short_code = shortuuid.uuid()[:8]
    
    # Get the name from the request or use a default value
    name = link_data.get("name", f"Dynamic Link {short_code}")
    
    # Create the dynamic link
    link = {
        "name": name,
        "short_code": short_code,
        "android_url": link_data.get("android_url"),
        "ios_url": link_data.get("ios_url"),
        "fallback_url": link_data.get("fallback_url"),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "total_clicks": 0,
        "is_active": True,
        "metadata": {}
    }
    
    # Validate URLs
    if not link["android_url"] and not link["ios_url"] and not link["fallback_url"]:
        raise HTTPException(status_code=400, detail="At least one URL (Android, iOS, or fallback) is required")
    
    # Insert into database
    result = await db.dynamic_links.insert_one(link)
    link["id"] = str(result.inserted_id)
    
    return link

# Create index on startup
@router.on_event("startup")
async def create_indexes():
    await db.dynamic_links.create_index([("is_active", 1), ("created_at", -1)])

@router.get("/", response_model=list[DynamicLink])
async def list_dynamic_links(limit: int = 20, skip: int = 0):
    """
    List dynamic links with pagination
    
    Args:
        limit: Number of links to return (max 50)
        skip: Number of links to skip
        
    Returns:
        List of dynamic links with pagination metadata
    """
    # Ensure limit is reasonable
    limit = min(50, max(1, limit))
    
    # Only fetch required fields
    projection = {
        "name": 1,
        "short_code": 1,
        "android_url": 1,
        "ios_url": 1,
        "fallback_url": 1,
        "created_at": 1,
        "total_clicks": 1,
        "is_active": 1
    }
    
    cursor = db.dynamic_links.find(
        {"is_active": True},
        projection=projection
    ).sort("created_at", -1).skip(skip).limit(limit)
    
    links = []
    async for link in cursor:
        link["id"] = str(link["_id"])
        del link["_id"]
        links.append(link)
        
    return links

@router.get("/{short_code}", response_model=DynamicLink)
async def get_dynamic_link(short_code: str):
    """Get dynamic link details"""
    link = await db.dynamic_links.find_one({"short_code": short_code})
    if not link:
        raise HTTPException(status_code=404, detail="Dynamic link not found")
    
    # Ensure all required fields are present
    link.setdefault("name", "Unnamed Link")  # Provide default name if missing
    link["id"] = str(link["_id"])
    del link["_id"]
    return link

@router.delete("/{link_id}", status_code=204)
async def delete_dynamic_link(link_id: str):
    """
    Delete a dynamic link by ID
    """
    from bson import ObjectId
    
    try:
        result = await db.dynamic_links.delete_one({"_id": ObjectId(link_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Link not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return {"status": "success", "message": "Link deleted successfully"}

# Regex patterns for URL validation
PLAY_STORE_PATTERN = r'^https?:\/\/(?:play\.google\.com\/store\/apps\/.*|(?:.*\.)?android\.app\/.*)$'
APP_STORE_PATTERN = r'^https?:\/\/(?:itunes\.apple\.com\/.*|apps\.apple\.com\/.*)$'

@router.get("/d/{short_code}")
async def redirect_dynamic_link(
    short_code: str,
    request: Request,
    user_agent: Optional[str] = Header(None),
    platform: Optional[str] = None,  # Optional parameter to force platform
    ref: Optional[str] = None,
    utm_source: Optional[str] = None,
    utm_medium: Optional[str] = None,
    utm_campaign: Optional[str] = None,
    utm_term: Optional[str] = None,
    utm_content: Optional[str] = None
):
    """
    Redirect to the appropriate URL based on the user's device or specified platform.
    
    Args:
        short_code: The short code for the dynamic link
        platform: Optional platform to force redirect ('ios' or 'android')
    """
    # Find the dynamic link
    link = await db.dynamic_links.find_one({"short_code": short_code, "is_active": True})
    if not link:
        raise HTTPException(status_code=404, detail="Link not found or inactive")
    
    # Get client IP address (handling proxy headers)
    if "x-forwarded-for" in request.headers:
        ip_address = request.headers["x-forwarded-for"].split(",")[0]
    else:
        ip_address = request.client.host if request.client else ""
    
    # Parse user agent if not provided
    if user_agent is None:
        user_agent = request.headers.get("user-agent", "").lower()
    else:
        user_agent = user_agent.lower()
    
    # Enhanced device detection
    device_info = {
        'is_ios': any(x in user_agent for x in ['iphone', 'ipad', 'ios']),
        'is_android': 'android' in user_agent and 'windows' not in user_agent,
        'is_desktop': 'windows nt' in user_agent or 'macintosh' in user_agent.lower(),
        'is_tablet': 'ipad' in user_agent or ('android' in user_agent and 'mobile' not in user_agent),
        'browser': _get_browser(user_agent),
        'os': _get_os(user_agent)
    }
    
    # Update click counter
    await db.dynamic_links.update_one(
        {"_id": link["_id"]},
        {"$inc": {"total_clicks": 1}, "$set": {"last_clicked_at": datetime.utcnow()}}
    )
    
    # Helper method to validate URLs
    def is_valid_url(url: str) -> bool:
        if not url:
            return False
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except:
            return False
    
    # Helper method to get browser from user agent
    def _get_browser(ua: str) -> str:
        if 'chrome' in ua and 'edg' not in ua:
            return 'chrome'
        elif 'firefox' in ua:
            return 'firefox'
        elif 'safari' in ua and 'chrome' not in ua:
            return 'safari'
        elif 'edg' in ua:
            return 'edge'
        elif 'opera' in ua or 'opr/' in ua:
            return 'opera'
        return 'other'
    
    # Helper method to get OS from user agent
    def _get_os(ua: str) -> str:
        if 'windows' in ua:
            return 'windows'
        elif 'mac' in ua:
            return 'macos'
        elif 'linux' in ua:
            return 'linux'
        elif 'android' in ua:
            return 'android'
        elif 'iphone' in ua or 'ipad' in ua:
            return 'ios'
        return 'unknown'
    
    # Get the best matching URL based on device and conditions
    def get_best_url():
        # If platform is explicitly specified in query params, use that
        if platform:
            platform_lower = platform.lower()
            if platform_lower == "ios" and link.get("ios_url"):
                return link["ios_url"]
            elif platform_lower == "android" and link.get("android_url"):
                return link["android_url"]
        
        # Try to match based on device type
        if device_info['is_ios'] and link.get("ios_url"):
            return link["ios_url"]
        elif device_info['is_android'] and link.get("android_url"):
            return link["android_url"]
        
        # Fallback to the default URL
        return link.get("fallback_url") or "https://yourdomain.com/link-not-supported"
    
    # Get the destination URL
    destination_url = get_best_url()
    
    # Validate the URL before redirecting
    if not is_valid_url(destination_url):
        logger.error(f"Invalid destination URL: {destination_url}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid destination URL configuration"
        )
    
    # Add UTM parameters if they don't exist
    parsed_url = urlparse(destination_url)
    query_params = parse_qs(parsed_url.query)
    
    # Add UTM parameters if they don't exist
    utm_params = {
        'utm_source': utm_source or 'dynamic_link',
        'utm_medium': utm_medium or 'link',
        'utm_campaign': utm_campaign or link.get('name', 'campaign'),
        'utm_content': short_code,
        'utm_term': utm_term or ''
    }
    
    # Only add UTM params that don't already exist
    for key, value in utm_params.items():
        if key not in query_params and value:
            query_params[key] = value
    
    # Rebuild the URL with UTM parameters
    updated_query = urlencode(query_params, doseq=True)
    final_url = urlunparse(parsed_url._replace(query=updated_query))
    
    # Log the redirect for analytics
    await log_link_click(
        link_id=str(link["_id"]),
        short_code=short_code,
        destination_url=final_url,
        device_info=device_info,
        ip_address=ip_address,
        referrer=request.headers.get("referer")
    )
    
    # Update click count and last clicked time
    await db.dynamic_links.update_one(
        {"_id": link["_id"]},
        {"$inc": {"total_clicks": 1}, "$set": {"last_clicked_at": datetime.utcnow()}}
    )
    
    return RedirectResponse(url=final_url)
