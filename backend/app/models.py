from datetime import datetime
from pydantic import (
    BaseModel, 
    HttpUrl, 
    Field, 
    ConfigDict, 
    GetJsonSchemaHandler
)
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import CoreSchema
from typing import Optional, Dict, Any, List, Union, Type, TypeVar, Any, Literal
from enum import Enum
from bson import ObjectId
import shortuuid
from datetime import datetime

T = TypeVar('T', bound='PyObjectId')

class PyObjectId(ObjectId):
    """
    Custom type for MongoDB ObjectId that works with Pydantic v2.
    
    This class provides serialization/deserialization of MongoDB ObjectIds to/from strings
    for use in Pydantic models.
    """
    
    @classmethod
    def __get_pydantic_core_schema__(
        cls, 
        _source_type: Any, 
        _handler: Any
    ) -> CoreSchema:
        """
        Return a pydantic_core.CoreSchema that represents this type.
        
        Args:
            _source_type: The type that was used to create this schema.
            _handler: The handler to use for resolving forward references.
            
        Returns:
            A CoreSchema that represents this type.
        """
        from pydantic_core import core_schema
        
        def validate_from_str(value: str) -> ObjectId:
            if not ObjectId.is_valid(value):
                raise ValueError("Invalid ObjectId")
            return ObjectId(value)
        
        from_str_schema = core_schema.chain_schema(
            [
                core_schema.str_schema(),
                core_schema.no_info_plain_validator_function(validate_from_str),
            ]
        )
        
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema(
                [
                    core_schema.is_instance_schema(ObjectId),
                    from_str_schema,
                ]
            ),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )
        
    @classmethod
    def __get_pydantic_json_schema__(
        cls, 
        _core_schema: CoreSchema, 
        handler: GetJsonSchemaHandler
    ) -> JsonSchemaValue:
        """
        Define the JSON schema for this type.
        
        Args:
            _core_schema: The core schema for this type.
            handler: The handler to use for getting the JSON schema.
            
        Returns:
            A JSON schema for this type.
        """
        return {"type": "string", "format": "objectid"}

class DynamicQRCodeType(str, Enum):
    URL = "url"
    APP_STORE = "app_store"
    DYNAMIC_REDIRECT = "dynamic_redirect"

class DynamicQRCodeBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: DynamicQRCodeType = DynamicQRCodeType.URL
    is_active: bool = True
    tags: List[str] = []
    metadata: Dict[str, Any] = {}
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "My QR Code",
                "description": "Sample QR code description",
                "type": "url",
                "is_active": True,
                "tags": ["sample", "qrcode"],
                "metadata": {}
            }
        }
    }

class DynamicQRCodeCreate(DynamicQRCodeBase):
    """Model for creating a new dynamic QR code."""
    
    # This model inherits all fields and configuration from DynamicQRCodeBase
    # No additional fields or configuration needed as it's just used for creation
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "My New QR Code",
                "description": "A new QR code for my campaign",
                "type": "url",
                "is_active": True,
                "tags": ["new", "campaign"],
                "metadata": {"campaign_id": "fall2023"}
            }
        }
    }

class DynamicQRCodeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Updated QR Code Name",
                "description": "Updated description",
                "is_active": True,
                "tags": ["updated", "qrcode"],
                "metadata": {"updated": True}
            }
        }
    }

class DynamicQRCodeDestination(BaseModel):
    url: str
    os: Optional[str] = None  # 'ios', 'android', None for all
    language: Optional[str] = None  # ISO language code
    country: Optional[str] = None  # ISO country code
    priority: int = 0  # Higher number = higher priority
    is_default: bool = False
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "url": "https://example.com/default",
                "os": None,
                "language": "en",
                "country": "US",
                "priority": 0,
                "is_default": True
            }
        }
    }

class DynamicLink(BaseModel):
    """Model for dynamic links that redirect based on device type."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id",
                         description="The unique identifier for the dynamic link")
    short_code: str = Field(
        default_factory=lambda: shortuuid.uuid()[:8],
        description="Short unique code used in the dynamic link URL"
    )
    name: str = Field(..., description="Name of the dynamic link")
    description: Optional[str] = Field(
        default=None,
        description="Optional description of the dynamic link"
    )
    android_url: Optional[str] = Field(
        default=None,
        description="URL to redirect to for Android devices (Play Store URL)"
    )
    ios_url: Optional[str] = Field(
        default=None,
        description="URL to redirect to for iOS devices (App Store URL)"
    )
    fallback_url: Optional[str] = Field(
        default=None,
        description="URL to redirect to for other devices or when platform-specific URL is not available"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when the dynamic link was created"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when the dynamic link was last updated"
    )
    total_clicks: int = Field(
        default=0,
        description="Total number of times the dynamic link has been clicked"
    )
    last_clicked_at: Optional[datetime] = Field(
        default=None,
        description="Timestamp of the most recent click"
    )
    is_active: bool = Field(
        default=True,
        description="Whether the dynamic link is active and should redirect"
    )
    created_by: Optional[str] = Field(
        default=None,
        description="Identifier of the user who created the dynamic link"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata for the dynamic link"
    )
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={
            ObjectId: str,
            datetime: lambda v: v.isoformat() if v else None,
            PyObjectId: str,
        },
        json_schema_extra={
            "example": {
                "id": "507f1f77bcf86cd799439012",
                "short_code": "abc123",
                "name": "My App Download",
                "description": "Download our app from the app store",
                "android_url": "https://play.google.com/store/apps/details?id=com.example.app",
                "ios_url": "https://apps.apple.com/app/id123456789",
                "fallback_url": "https://example.com/download",
                "created_at": "2023-01-01T00:00:00",
                "updated_at": "2023-01-01T00:00:00",
                "total_clicks": 0,
                "last_clicked_at": None,
                "is_active": True,
                "created_by": "user@example.com",
                "metadata": {"campaign": "summer2023"}
            }
        }
    )

class DynamicQRCodeInDB(DynamicQRCodeBase):
    """Database model for storing dynamic QR code information."""
    
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id",
                         description="The unique identifier for the QR code")
    short_code: str = Field(
        default_factory=lambda: shortuuid.uuid()[:8],
        description="Short unique code used in the QR code URL"
    )
    destinations: List[DynamicQRCodeDestination] = Field(
        default_factory=list,
        description="List of destination URLs with their conditions"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when the QR code was created"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when the QR code was last updated"
    )
    total_scans: int = Field(
        default=0,
        description="Total number of times the QR code has been scanned"
    )
    last_scan: Optional[datetime] = Field(
        default=None,
        description="Timestamp of the most recent scan"
    )
    created_by: Optional[str] = Field(
        default=None,
        description="Identifier of the user who created the QR code"
    )

    # Pydantic v2 model configuration
    model_config = ConfigDict(
        # Allow populating by field name (for MongoDB _id -> id mapping)
        populate_by_name=True,
        
        # Allow arbitrary types (needed for PyObjectId)
        arbitrary_types_allowed=True,
        
        # Custom JSON encoders for non-serializable types
        json_encoders={
            ObjectId: str,  # Convert ObjectId to string in JSON
            datetime: lambda v: v.isoformat() if v else None,  # Convert datetime to ISO format
            PyObjectId: str,  # Ensure our custom type is serialized to string
        },
        
        # Example data for OpenAPI documentation
        json_schema_extra={
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "name": "My Dynamic QR",
                "description": "QR code for marketing campaign",
                "type": "url",
                "is_active": True,
                "short_code": "abc123",
                "destinations": [
                    {
                        "url": "https://example.com/default",
                        "os": None,
                        "language": None,
                        "country": None,
                        "priority": 1,
                        "is_default": True
                    },
                    {
                        "url": "https://apps.apple.com/app/id123",
                        "os": "ios",
                        "language": "en",
                        "country": "US",
                        "priority": 2,
                        "is_default": False
                    },
                    {
                        "url": "https://play.google.com/store/apps/details?id=com.example.app",
                        "os": "android",
                        "language": "en",
                        "country": "US",
                        "priority": 2,
                        "is_default": False
                    }
                ],
                "tags": ["marketing", "campaign"],
                "metadata": {"campaign_id": "summer2023"},
                "total_scans": 0,
                "created_at": "2023-01-01T00:00:00",
                "updated_at": "2023-01-01T00:00:00",
                "last_scan": None,
                "created_by": "user@example.com"
            }
        }
    )
