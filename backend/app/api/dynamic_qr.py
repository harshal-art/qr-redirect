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
    prefix="/api/dynamic-qr",
    tags=["dynamic-qr"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=DynamicQRCodeInDB, status_code=status.HTTP_201_CREATED)
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
        
        # Create the QR code in the database
        created_qr = await create_dynamic_qr(qr_dict)
        if not created_qr:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create dynamic QR code"
            )
            
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
    # Check if QR code exists
    existing_qr = await get_dynamic_qr_by_short_code(short_code)
    if not existing_qr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR code not found"
        )
    
    # Soft delete by setting is_active to False
    await update_dynamic_qr(short_code, {"is_active": False})
    
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
        # If QR code not found or inactive, redirect to a default URL or show error
        return RedirectResponse(
            url="https://example.com/not-found",
            status_code=status.HTTP_302_FOUND
        )
    
    # Enhanced device detection
    user_agent = request.headers.get("user-agent", "").lower()
    accept_language = request.headers.get("accept-language", "")
    
    # Get client IP address (handling proxy headers)
    if "x-forwarded-for" in request.headers:
        ip_address = request.headers["x-forwarded-for"].split(",")[0]
    else:
        ip_address = request.client.host if request.client else ""
    
    # Enhanced device detection
    device_info = {
        'is_ios': any(x in user_agent for x in ['iphone', 'ipad', 'ios']),
        'is_android': 'android' in user_agent and 'windows' not in user_agent,
        'is_desktop': 'windows nt' in user_agent or 'macintosh' in user_agent.lower(),
        'is_tablet': 'ipad' in user_agent or ('android' in user_agent and 'mobile' not in user_agent),
        'is_mobile': any(x in user_agent for x in ['iphone', 'android']),
        'browser': self._get_browser(user_agent),
        'os': self._get_os(user_agent)
    }
            os = "linux"
    
    # Get the appropriate destination URL
    destinations = qr_code.get("destinations", [])
    target_url = None
    
    # Try to find a matching destination based on OS
    if os:
        for dest in destinations:
            if dest.get("os") == os:
                target_url = dest.get("url")
                break
    
    # If no OS match, find the default destination
    if not target_url:
        for dest in destinations:
            if dest.get("is_default"):
                target_url = dest.get("url")
                break
    
    # If still no URL, use the first destination or a fallback
    if not target_url and destinations:
        target_url = destinations[0].get("url")
    
    if not target_url:
        target_url = "https://example.com/error"
    
    # Add UTM parameters if not already present
    from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
    
    parsed_url = list(urlparse(target_url))
    query_params = parse_qs(parsed_url[4])
    
    # Add UTM parameters if they don't exist
    utm_params = {
        "utm_source": utm_source or "qr_code",
        "utm_medium": utm_medium or "qr",
        "utm_campaign": utm_campaign or short_code,
        "utm_term": utm_term or (os if os else ""),
        "utm_content": utm_content or (ref if ref else "")
    }
    
    for key, value in utm_params.items():
        if value and key not in query_params:
            query_params[key] = [value]
    
    # Rebuild URL with UTM parameters
    parsed_url[4] = urlencode(query_params, doseq=True)
    final_url = urlunparse(parsed_url)
    
    # Log the scan (async)
    scan_data = {
        "qr_code_id": qr_code["id"],
        "short_code": short_code,
        "ip_address": request.client.host if request.client else "",
        "user_agent": user_agent,
        "referer": request.headers.get("referer", ""),
        "os": os,
        "device_type": "mobile" if (os in ["ios", "android"]) else "desktop",
        "utm_source": utm_source,
        "utm_medium": utm_medium,
        "utm_campaign": utm_campaign,
        "utm_term": utm_term,
        "utm_content": utm_content,
        "ref": ref
    }
    
    # Log the scan asynchronously
    import asyncio
    asyncio.create_task(log_scan(
        qr_code_id=qr_code["id"],
        short_code=short_code,
        request_headers=dict(request.headers),
        request_query=dict(request.query_params)
    ))
    
    # Redirect to the target URL
    return RedirectResponse(
        url=final_url,
        status_code=status.HTTP_302_FOUND
    )

# Add this router to your main FastAPI app in main.py
