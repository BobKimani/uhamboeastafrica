import logging
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import require_authenticated_admin
from app.db.models import Inquiry
from app.db.serializers import inquiry_to_api
from app.db.session import get_db
from app.schemas import CreateInquiry, UpdateInquiryStatus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/inquiries", tags=["inquiries"])


def _inquiry_id(value: str) -> UUID | None:
    try:
        return UUID(value)
    except ValueError:
        return None


@router.post("")
async def create_inquiry(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    try:
        data = CreateInquiry.model_validate(body)
    except ValidationError as e:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": "Invalid inquiry data",
                "details": e.errors(),
            },
        )
    try:
        inquiry = Inquiry(
            full_name=data.fullName,
            contact=data.contact,
            email=data.email,
            message=data.message,
            status="new",
        )
        db.add(inquiry)
        db.flush()
        return JSONResponse(
            status_code=201,
            content={
                "success": True,
                "message": "Inquiry submitted successfully",
                "id": str(inquiry.id),
            },
        )
    except Exception:
        db.rollback()
        logger.exception("Create inquiry error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to submit inquiry"},
        )


@router.get("")
async def list_inquiries(
    db: Session = Depends(get_db), user=Depends(require_authenticated_admin)
):
    try:
        inquiries = db.scalars(
            select(Inquiry).order_by(Inquiry.created_at.desc())
        ).all()
        return {
            "success": True,
            "inquiries": [inquiry_to_api(inquiry) for inquiry in inquiries],
        }
    except Exception:
        db.rollback()
        logger.exception("Fetch inquiries error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to fetch inquiries"},
        )


@router.patch("/{inquiry_id}")
async def update_inquiry_status(
    inquiry_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(require_authenticated_admin),
):
    body = await request.json()
    try:
        data = UpdateInquiryStatus.model_validate(body)
    except ValidationError as e:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Invalid status", "details": e.errors()},
        )
    try:
        parsed_id = _inquiry_id(inquiry_id)
        if parsed_id is None:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Inquiry not found"},
            )
        inquiry = db.get(Inquiry, parsed_id)
        if not inquiry:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Inquiry not found"},
            )
        inquiry.status = data.status
        inquiry.updated_at = datetime.now(UTC)
        return {"success": True, "message": "Inquiry status updated successfully"}
    except Exception:
        db.rollback()
        logger.exception("Update inquiry status error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to update inquiry status"},
        )


@router.delete("/{inquiry_id}")
async def delete_inquiry(
    inquiry_id: str,
    db: Session = Depends(get_db),
    user=Depends(require_authenticated_admin),
):
    try:
        parsed_id = _inquiry_id(inquiry_id)
        if parsed_id is None:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Inquiry not found"},
            )
        inquiry = db.get(Inquiry, parsed_id)
        if not inquiry:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Inquiry not found"},
            )
        db.delete(inquiry)
        return {"success": True, "message": "Inquiry deleted successfully"}
    except Exception:
        db.rollback()
        logger.exception("Delete inquiry error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to delete inquiry"},
        )
