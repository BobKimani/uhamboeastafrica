import logging
import re
from datetime import UTC, datetime
from uuid import UUID

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import require_authenticated_admin
from app.config import settings
from app.db.models import Hotel, Vehicle
from app.db.serializers import hotel_to_api, vehicle_to_api
from app.db.session import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["catalog"])


class HotelPayload(BaseModel):
    name: str = Field(min_length=2)
    country: str = Field(min_length=2)
    region: str = Field(min_length=1)
    destination: str = Field(min_length=2)
    pricePerNight: float = Field(ge=0)
    rating: float = Field(ge=0, le=5)
    image: str = Field(min_length=1)
    tags: list[str] = Field(default_factory=list)
    description: str = Field(default="")
    topRated: bool = False
    isAvailable: bool = True


class VehiclePayload(BaseModel):
    name: str = Field(min_length=2)
    type: str = Field(min_length=2)
    capacity: int = Field(ge=1)
    pricePerDay: float = Field(ge=0)
    bestFor: str = Field(min_length=1)
    features: list[str] = Field(default_factory=list)
    image: str = Field(min_length=1)
    region: str = Field(min_length=1)
    isAvailable: bool = True


def _uuid(value: str) -> UUID | None:
    try:
        return UUID(value)
    except ValueError:
        return None


def _slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "catalog-item"


def _unique_slug(db: Session, model, value: str, *, current_id: UUID | None = None) -> str:
    base = _slug(value)
    candidate = base
    index = 2
    while True:
        existing = db.scalar(select(model).where(model.slug == candidate))
        if not existing or existing.id == current_id:
            return candidate
        candidate = f"{base}-{index}"
        index += 1


def _s3_url(key: str) -> str:
    if settings.s3_public_base_url:
        return f"{settings.s3_public_base_url.rstrip('/')}/{key}"
    return f"https://{settings.s3_bucket}.s3.{settings.aws_region}.amazonaws.com/{key}"


@router.get("/hotels")
async def list_hotels(db: Session = Depends(get_db)):
    try:
        hotels = db.scalars(select(Hotel).order_by(Hotel.created_at.desc())).all()
        return {"success": True, "hotels": [hotel_to_api(hotel) for hotel in hotels]}
    except Exception:
        db.rollback()
        logger.exception("Fetch hotels error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to fetch hotels"},
        )


@router.post("/hotels")
async def create_hotel(
    payload: HotelPayload,
    db: Session = Depends(get_db),
    user=Depends(require_authenticated_admin),
):
    try:
        hotel = Hotel(
            slug=_unique_slug(db, Hotel, payload.name),
            name=payload.name,
            country=payload.country.lower().strip(),
            region=payload.region.strip(),
            destination=payload.destination.strip(),
            price_per_night=payload.pricePerNight,
            rating=payload.rating,
            image=payload.image,
            tags=payload.tags,
            description=payload.description,
            top_rated=payload.topRated,
            is_available=payload.isAvailable,
        )
        db.add(hotel)
        db.flush()
        return {"success": True, "hotel": hotel_to_api(hotel)}
    except Exception:
        db.rollback()
        logger.exception("Create hotel error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to save hotel"},
        )


@router.patch("/hotels/{hotel_id}")
async def update_hotel(
    hotel_id: str,
    payload: HotelPayload,
    db: Session = Depends(get_db),
    user=Depends(require_authenticated_admin),
):
    try:
        parsed_id = _uuid(hotel_id)
        hotel = db.get(Hotel, parsed_id) if parsed_id else None
        if not hotel:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Hotel not found"},
            )
        hotel.name = payload.name
        hotel.country = payload.country.lower().strip()
        hotel.region = payload.region.strip()
        hotel.destination = payload.destination.strip()
        hotel.price_per_night = payload.pricePerNight
        hotel.rating = payload.rating
        hotel.image = payload.image
        hotel.tags = payload.tags
        hotel.description = payload.description
        hotel.top_rated = payload.topRated
        hotel.is_available = payload.isAvailable
        hotel.updated_at = datetime.now(UTC)
        db.flush()
        return {"success": True, "hotel": hotel_to_api(hotel)}
    except Exception:
        db.rollback()
        logger.exception("Update hotel error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to save hotel"},
        )


@router.delete("/hotels/{hotel_id}")
async def delete_hotel(
    hotel_id: str,
    db: Session = Depends(get_db),
    user=Depends(require_authenticated_admin),
):
    try:
        parsed_id = _uuid(hotel_id)
        hotel = db.get(Hotel, parsed_id) if parsed_id else None
        if not hotel:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Hotel not found"},
            )
        db.delete(hotel)
        return {"success": True, "message": "Hotel deleted successfully"}
    except Exception:
        db.rollback()
        logger.exception("Delete hotel error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to delete hotel"},
        )


@router.get("/vehicles")
async def list_vehicles(db: Session = Depends(get_db)):
    try:
        vehicles = db.scalars(select(Vehicle).order_by(Vehicle.created_at.desc())).all()
        return {
            "success": True,
            "vehicles": [vehicle_to_api(vehicle) for vehicle in vehicles],
        }
    except Exception:
        db.rollback()
        logger.exception("Fetch vehicles error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to fetch vehicles"},
        )


@router.post("/vehicles")
async def create_vehicle(
    payload: VehiclePayload,
    db: Session = Depends(get_db),
    user=Depends(require_authenticated_admin),
):
    try:
        vehicle = Vehicle(
            slug=_unique_slug(db, Vehicle, payload.name),
            name=payload.name,
            type=payload.type,
            capacity=payload.capacity,
            price_per_day=payload.pricePerDay,
            best_for=payload.bestFor,
            features=payload.features,
            image=payload.image,
            region=payload.region,
            is_available=payload.isAvailable,
        )
        db.add(vehicle)
        db.flush()
        return {"success": True, "vehicle": vehicle_to_api(vehicle)}
    except Exception:
        db.rollback()
        logger.exception("Create vehicle error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to save vehicle"},
        )


@router.patch("/vehicles/{vehicle_id}")
async def update_vehicle(
    vehicle_id: str,
    payload: VehiclePayload,
    db: Session = Depends(get_db),
    user=Depends(require_authenticated_admin),
):
    try:
        parsed_id = _uuid(vehicle_id)
        vehicle = db.get(Vehicle, parsed_id) if parsed_id else None
        if not vehicle:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Vehicle not found"},
            )
        vehicle.name = payload.name
        vehicle.type = payload.type
        vehicle.capacity = payload.capacity
        vehicle.price_per_day = payload.pricePerDay
        vehicle.best_for = payload.bestFor
        vehicle.features = payload.features
        vehicle.image = payload.image
        vehicle.region = payload.region
        vehicle.is_available = payload.isAvailable
        vehicle.updated_at = datetime.now(UTC)
        db.flush()
        return {"success": True, "vehicle": vehicle_to_api(vehicle)}
    except Exception:
        db.rollback()
        logger.exception("Update vehicle error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to save vehicle"},
        )


@router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: str,
    db: Session = Depends(get_db),
    user=Depends(require_authenticated_admin),
):
    try:
        parsed_id = _uuid(vehicle_id)
        vehicle = db.get(Vehicle, parsed_id) if parsed_id else None
        if not vehicle:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Vehicle not found"},
            )
        db.delete(vehicle)
        return {"success": True, "message": "Vehicle deleted successfully"}
    except Exception:
        db.rollback()
        logger.exception("Delete vehicle error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to delete vehicle"},
        )


@router.post("/uploads/catalog-image")
async def upload_catalog_image(
    file: UploadFile = File(...),
    user=Depends(require_authenticated_admin),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Only image uploads are allowed"},
        )

    extension = file.filename.rsplit(".", 1)[-1].lower() if file.filename else "bin"
    key = f"catalog/{datetime.now(UTC).strftime('%Y/%m/%d')}/{datetime.now(UTC).timestamp():.0f}-{_slug(file.filename or 'image')}.{extension}"

    try:
        body = await file.read()
        s3 = boto3.client("s3", region_name=settings.aws_region)
        s3.put_object(
            Bucket=settings.s3_bucket,
            Key=key,
            Body=body,
            ContentType=file.content_type,
        )
        return {"success": True, "url": _s3_url(key), "key": key}
    except (BotoCoreError, ClientError):
        logger.exception("Catalog image upload failed")
        return JSONResponse(
            status_code=502,
            content={"success": False, "error": "Failed to upload image"},
        )
