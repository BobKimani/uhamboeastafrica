import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from firebase_admin import firestore
from pydantic import ValidationError

from app.auth import get_current_user
from app.firebase import get_db
from app.schemas import CreateInquiry, UpdateInquiryStatus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/inquiries", tags=["inquiries"])


@router.post("")
async def create_inquiry(request: Request, db=Depends(get_db)):
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
        inquiry = {
            **data.model_dump(),
            "status": "new",
            "createdAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        }
        _, doc_ref = db.collection("inquiries").add(inquiry)
        return JSONResponse(
            status_code=201,
            content={
                "success": True,
                "message": "Inquiry submitted successfully",
                "id": doc_ref.id,
            },
        )
    except Exception:
        logger.exception("Create inquiry error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to submit inquiry"},
        )


@router.get("")
async def list_inquiries(db=Depends(get_db), user=Depends(get_current_user)):
    try:
        docs = (
            db.collection("inquiries")
            .order_by("createdAt", direction=firestore.Query.DESCENDING)
            .stream()
        )
        inquiries = [{"id": d.id, **d.to_dict()} for d in docs]
        return {"success": True, "inquiries": inquiries}
    except Exception:
        logger.exception("Fetch inquiries error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to fetch inquiries"},
        )


@router.patch("/{inquiry_id}")
async def update_inquiry_status(
    inquiry_id: str, request: Request, db=Depends(get_db), user=Depends(get_current_user)
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
        db.collection("inquiries").document(inquiry_id).update(
            {"status": data.status, "updatedAt": firestore.SERVER_TIMESTAMP}
        )
        return {"success": True, "message": "Inquiry status updated successfully"}
    except Exception:
        logger.exception("Update inquiry status error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to update inquiry status"},
        )
