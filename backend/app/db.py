import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import IndexModel, ASCENDING, DESCENDING
from bson import ObjectId
from datetime import datetime
import logging
from typing import Optional, Dict, Any, List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017/")
DB_NAME = os.getenv("MONGO_DB_NAME", "qrcode_generator")

# Initialize MongoDB client
client = AsyncIOMotorClient(MONGODB_URL)
db = client[DB_NAME]

# Collections
DYNAMIC_QR_COLLECTION = "dynamic_qr_codes"
DYNAMIC_LINKS_COLLECTION = "dynamic_links"
SCAN_LOGS_COLLECTION = "scan_logs"
LINK_CLICKS_COLLECTION = "link_clicks"

# Create indexes
async def create_indexes():
    try:
        # Indexes for dynamic_qr_codes
        await db[DYNAMIC_QR_COLLECTION].create_indexes([
            IndexModel([("short_code", ASCENDING)], unique=True, name="short_code_idx"),
            IndexModel([("is_active", ASCENDING)], name="is_active_idx"),
            IndexModel([("tags", ASCENDING)], name="tags_idx"),
            IndexModel([("created_at", DESCENDING)], name="created_at_idx"),
        ])
        
        # Indexes for scan_logs
        await db[SCAN_LOGS_COLLECTION].create_indexes([
            IndexModel([("qr_code_id", ASCENDING)], name="qr_code_id_idx"),
            IndexModel([("short_code", ASCENDING)], name="scan_short_code_idx"),
            IndexModel([("timestamp", DESCENDING)], name="timestamp_idx"),
            IndexModel([("ip_address", ASCENDING)], name="ip_address_idx"),
        ])
        
        # Indexes for dynamic_links
        await db[DYNAMIC_LINKS_COLLECTION].create_indexes([
            IndexModel([("short_code", ASCENDING)], unique=True, name="link_short_code_idx"),
            IndexModel([("is_active", ASCENDING)], name="link_is_active_idx"),
            IndexModel([("created_at", DESCENDING)], name="link_created_at_idx"),
            IndexModel([("total_clicks", DESCENDING)], name="link_total_clicks_idx"),
        ])
        
        # Indexes for link_clicks
        await db[LINK_CLICKS_COLLECTION].create_indexes([
            IndexModel([("link_id", ASCENDING)], name="link_click_link_id_idx"),
            IndexModel([("short_code", ASCENDING)], name="link_click_short_code_idx"),
            IndexModel([("timestamp", DESCENDING)], name="link_click_timestamp_idx"),
            IndexModel([("device.os", ASCENDING)], name="link_click_device_os_idx"),
            IndexModel([("device.browser", ASCENDING)], name="link_click_device_browser_idx"),
        ])
        
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating database indexes: {e}")
        raise

async def get_dynamic_qr_by_short_code(short_code: str) -> Optional[Dict[str, Any]]:
    """Retrieve a dynamic QR code by its short code."""
    try:
        qr_data = await db[DYNAMIC_QR_COLLECTION].find_one(
            {"short_code": short_code, "is_active": True}
        )
        if qr_data:
            # Convert ObjectId to string for JSON serialization
            qr_data["id"] = str(qr_data.pop("_id"))
            # Convert datetime objects to ISO format strings
            for field in ["created_at", "updated_at", "last_scan"]:
                if field in qr_data and qr_data[field] is not None:
                    qr_data[field] = qr_data[field].isoformat()
        return qr_data
    except Exception as e:
        logger.error(f"Error retrieving QR code {short_code}: {e}")
        return None

async def create_dynamic_qr(qr_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new dynamic QR code."""
    try:
        # Add timestamps
        now = datetime.utcnow()
        qr_data["created_at"] = now
        qr_data["updated_at"] = now
        
        # Ensure required fields
        qr_data.setdefault("is_active", True)
        qr_data.setdefault("tags", [])
        qr_data.setdefault("metadata", {})
        qr_data.setdefault("total_scans", 0)
        
        # Insert the document
        result = await db[DYNAMIC_QR_COLLECTION].insert_one(qr_data)
        
        # Return the created document with string ID
        created = await db[DYNAMIC_QR_COLLECTION].find_one({"_id": result.inserted_id})
        if created:
            # Convert ObjectId to string for JSON serialization
            created["id"] = str(created.pop("_id"))
            # Convert datetime objects to ISO format strings
            for field in ["created_at", "updated_at", "last_scan"]:
                if field in created and created[field] is not None:
                    created[field] = created[field].isoformat()
        return created
    except Exception as e:
        logger.error(f"Error creating QR code: {e}")
        return None

async def update_dynamic_qr(short_code: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update an existing dynamic QR code."""
    try:
        # Don't allow updating the short_code
        update_data.pop("short_code", None)
        update_data["updated_at"] = datetime.utcnow()
        
        result = await db[DYNAMIC_QR_COLLECTION].find_one_and_update(
            {"short_code": short_code},
            {"$set": update_data},
            return_document=ReturnDocument.AFTER
        )
        
        if result:
            # Convert ObjectId to string for JSON serialization
            result["id"] = str(result["_id"])
            # Convert datetime objects to ISO format strings
            for field in ["created_at", "updated_at", "last_scan"]:
                if field in result and result[field] is not None:
                    result[field] = result[field].isoformat()
        return result
    except Exception as e:
        logger.error(f"Error updating QR code {short_code}: {e}")
        return None

async def log_scan(qr_code_id: str, short_code: str, request_headers: Dict[str, str], 
                  request_query: Dict[str, str] = None) -> bool:
    """Log a scan event for analytics."""
    try:
        user_agent = request_headers.get("user-agent", "")
        referer = request_headers.get("referer", "")
        ip_address = request_headers.get("x-forwarded-for", "")
        
        # Parse user agent for device and browser info
        device_info = {
            "user_agent": user_agent,
            "device_type": "desktop",  # Default
            "browser": "unknown",
            "os": "unknown"
        }
        
        # Simple device detection (you might want to use a library like ua-parser for production)
        user_agent_lower = user_agent.lower()
        if 'mobile' in user_agent_lower:
            device_info["device_type"] = "mobile"
        elif 'tablet' in user_agent_lower or 'ipad' in user_agent_lower:
            device_info["device_type"] = "tablet"
            
        # Simple OS detection
        if 'windows' in user_agent_lower:
            device_info["os"] = "Windows"
        elif 'mac' in user_agent_lower:
            device_info["os"] = "macOS"
        elif 'linux' in user_agent_lower:
            device_info["os"] = "Linux"
        elif 'android' in user_agent_lower:
            device_info["os"] = "Android"
        elif 'iphone' in user_agent_lower or 'ipad' in user_agent_lower:
            device_info["os"] = "iOS"
            
        # Simple browser detection
        if 'chrome' in user_agent_lower and 'edg' not in user_agent_lower:
            device_info["browser"] = "Chrome"
        elif 'firefox' in user_agent_lower:
            device_info["browser"] = "Firefox"
        elif 'safari' in user_agent_lower and 'chrome' not in user_agent_lower:
            device_info["browser"] = "Safari"
        elif 'edg' in user_agent_lower:
            device_info["browser"] = "Edge"
        elif 'opera' in user_agent_lower:
            device_info["browser"] = "Opera"
        
        # Get location info (in production, you might want to use a geolocation service)
        location_info = {
            "ip_address": ip_address,
            "country": None,
            "region": None,
            "city": None
        }
        
        # Get query parameters
        query_params = {}
        if request_query:
            query_params = {k: v for k, v in request_query.items()}
        
        # Create scan log
        scan_log = {
            "qr_code_id": ObjectId(qr_code_id),
            "short_code": short_code,
            "timestamp": datetime.utcnow(),
            "device": device_info,
            "location": location_info,
            "referer": referer,
            "query_params": query_params
        }
        
        # Insert the scan log
        await db[SCAN_LOGS_COLLECTION].insert_one(scan_log)
        
        # Update the QR code's scan count and last scan time
        await db[DYNAMIC_QR_COLLECTION].update_one(
            {"_id": ObjectId(qr_code_id)},
            {
                "$inc": {"total_scans": 1},
                "$set": {"last_scan": datetime.utcnow()}
            }
        )
        
        return True
    except Exception as e:
        logger.error(f"Error logging scan for QR code {short_code}: {e}")
        return False

async def log_link_click(
    link_id: str,
    short_code: str,
    destination_url: str,
    device_info: Dict[str, Any],
    ip_address: str,
    referrer: Optional[str] = None,
    query_params: Optional[Dict[str, Any]] = None
) -> None:
    """
    Log a link click event for analytics.
    
    Args:
        link_id: The ID of the dynamic link
        short_code: The short code of the link
        destination_url: The URL the user was redirected to
        device_info: Dictionary containing device information
        ip_address: The IP address of the user
        referrer: The referring URL (if any)
        query_params: Any query parameters from the request
    """
    try:
        click_data = {
            "link_id": ObjectId(link_id),
            "short_code": short_code,
            "destination_url": destination_url,
            "timestamp": datetime.utcnow(),
            "device": device_info,
            "ip_address": ip_address,
            "referrer": referrer,
            "query_params": query_params or {}
        }
        
        await db[LINK_CLICKS_COLLECTION].insert_one(click_data)
        logger.info(f"Logged click for link {short_code}")
    except Exception as e:
        logger.error(f"Error logging link click: {e}")
        raise

async def update_scan_metrics(short_code: str) -> None:
    """
    Update scan metrics for a QR code.
    
    Args:
        short_code: The short code of the QR code
    """
    try:
        now = datetime.utcnow()
        await db[DYNAMIC_QR_COLLECTION].update_one(
            {"short_code": short_code},
            {
                "$inc": {"total_scans": 1},
                "$set": {"last_scan": now, "updated_at": now}
            }
        )
        logger.info(f"Updated scan metrics for QR code {short_code}")
    except Exception as e:
        logger.error(f"Error updating scan metrics: {e}")
        raise

async def get_scan_analytics(short_code: str, time_range: str = "30d") -> Dict[str, Any]:
    """Get analytics for a dynamic QR code."""
    try:
        # Get the QR code to verify it exists
        qr_code = await db[DYNAMIC_QR_COLLECTION].find_one({"short_code": short_code})
        if not qr_code:
            return {"error": "QR code not found"}
            
        # Calculate time range
        end_date = datetime.utcnow()
        if time_range == "24h":
            start_date = end_date - timedelta(hours=24)
        elif time_range == "7d":
            start_date = end_date - timedelta(days=7)
        elif time_range == "30d":
            start_date = end_date - timedelta(days=30)
        elif time_range == "90d":
            start_date = end_date - timedelta(days=90)
        else:  # Default to 30 days
            start_date = end_date - timedelta(days=30)
        
        # Get total scans in the time range
        total_scans = await db[SCAN_LOGS_COLLECTION].count_documents({
            "short_code": short_code,
            "timestamp": {"$gte": start_date, "$lte": end_date}
        })
        
        # Get scans by day for the time range
        pipeline = [
            {
                "$match": {
                    "short_code": short_code,
                    "timestamp": {"$gte": start_date, "$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m-%d",
                            "date": "$timestamp"
                        }
                    },
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        scans_by_day = await db[SCAN_LOGS_COLLECTION].aggregate(pipeline).to_list(length=1000)
        
        # Format the data for the chart
        chart_data = [{"date": day["_id"], "scans": day["count"]} for day in scans_by_day]
        
        # Get scans by device type
        pipeline = [
            {
                "$match": {
                    "short_code": short_code,
                    "timestamp": {"$gte": start_date, "$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": "$device.device_type",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        scans_by_device = await db[SCAN_LOGS_COLLECTION].aggregate(pipeline).to_list(length=10)
        
        # Get scans by browser
        pipeline = [
            {
                "$match": {
                    "short_code": short_code,
                    "timestamp": {"$gte": start_date, "$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": "$device.browser",
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        
        scans_by_browser = await db[SCAN_LOGS_COLLECTION].aggregate(pipeline).to_list(length=10)
        
        # Get scans by OS
        pipeline = [
            {
                "$match": {
                    "short_code": short_code,
                    "timestamp": {"$gte": start_date, "$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": "$device.os",
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        
        scans_by_os = await db[SCAN_LOGS_COLLECTION].aggregate(pipeline).to_list(length=10)
        
        # Get referrers
        pipeline = [
            {
                "$match": {
                    "short_code": short_code,
                    "timestamp": {"$gte": start_date, "$lte": end_date},
                    "referer": {"$ne": ""}
                }
            },
            {
                "$group": {
                    "_id": "$referer",
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        
        top_referrers = await db[SCAN_LOGS_COLLECTION].aggregate(pipeline).to_list(length=10)
        
        # Get recent scans
        recent_scans = await db[SCAN_LOGS_COLLECTION].find(
            {
                "short_code": short_code,
                "timestamp": {"$gte": start_date, "$lte": end_date}
            },
            {
                "_id": 0,
                "timestamp": 1,
                "device": 1,
                "location": 1,
                "referer": 1
            }
        ).sort("timestamp", -1).limit(10).to_list(length=10)
        
        # Format the response
        return {
            "total_scans": total_scans,
            "time_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "range": time_range
            },
            "chart_data": chart_data,
            "by_device": [{"name": d["_id"] or "Unknown", "value": d["count"]} for d in scans_by_device],
            "by_browser": [{"name": b["_id"] or "Unknown", "value": b["count"]} for b in scans_by_browser],
            "by_os": [{"name": o["_id"] or "Unknown", "value": o["count"]} for o in scans_by_os],
            "top_referrers": [{"url": r["_id"], "count": r["count"]} for r in top_referrers if r["_id"]],
            "recent_scans": [
                {
                    "timestamp": s["timestamp"].isoformat(),
                    "device": s["device"],
                    "location": s["location"],
                    "referer": s.get("referer", "Direct")
                } for s in recent_scans
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting analytics for QR code {short_code}: {e}")
        return {"error": str(e)}
