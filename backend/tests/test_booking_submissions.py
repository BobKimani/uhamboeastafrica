import json
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.db.models import Booking, Inquiry
from app.routers import bookings, inquiries


class JsonRequest:
    def __init__(self, payload):
        self.payload = payload

    async def json(self):
        return self.payload


class RecordingSession:
    def __init__(self, vehicle=None):
        self.added = []
        self.vehicle = vehicle

    def add(self, record):
        self.added.append(record)

    def flush(self):
        for record in self.added:
            if getattr(record, "id", None) is None:
                record.id = uuid4()

    def rollback(self):
        pass

    def get(self, model, value):
        return None

    def scalar(self, statement):
        return self.vehicle


@pytest.fixture
def anyio_backend():
    return "asyncio"


def decode(response):
    return json.loads(response.body)


def booking_payload(**overrides):
    payload = {
        "fullName": "Amina Otieno",
        "email": "amina@example.com",
        "phone": "+254700000000",
        "destination": "kenya",
        "travelStartDate": "2026-10-10",
        "travelEndDate": "2026-10-13",
        "travellingWith": "couple",
        "bookingType": "accommodation",
        "numberOfTravellers": 2,
        "numberOfRooms": 1,
    }
    payload.update(overrides)
    return payload


@pytest.mark.anyio
async def test_create_accommodation_booking_without_legacy_amount_range_persists():
    db = RecordingSession()

    response = await bookings.create_booking(
        JsonRequest(booking_payload()),
        db,
    )

    assert response.status_code == 201
    assert decode(response)["success"] is True
    assert len(db.added) == 1
    persisted = db.added[0]
    assert isinstance(persisted, Booking)
    assert persisted.booking_type == "accommodation"
    assert persisted.number_of_rooms == 1


@pytest.mark.anyio
async def test_create_transport_booking_without_legacy_amount_range_persists(monkeypatch):
    async def fake_convert(amount_usd):
        return {
            "amountUsd": amount_usd,
            "exchangeRate": 129.0,
            "amountKes": 46_440,
            "source": "test",
        }

    monkeypatch.setattr(bookings, "convert_usd_to_kes", fake_convert)
    db = RecordingSession(
        vehicle=SimpleNamespace(type="Van", price_per_day=Decimal("180.00"))
    )

    response = await bookings.create_booking(
        JsonRequest(
            booking_payload(
                bookingType="transport",
                numberOfRooms=0,
                transportFrom="Nairobi",
                transportTo="Naivasha",
                transportDays=2,
                vehicleType="Van",
            )
        ),
        db,
    )

    body = decode(response)
    assert response.status_code == 201
    assert body["payment"] == {"required": True, "amountKes": 46_440}
    persisted = db.added[0]
    assert persisted.booking_type == "transport"
    assert persisted.transport_days == 2
    assert persisted.transport_amount_kes == 46_440


@pytest.mark.anyio
async def test_create_general_booking_without_legacy_amount_range_persists(monkeypatch):
    async def fake_convert(amount_usd):
        return {
            "amountUsd": amount_usd,
            "exchangeRate": 129.0,
            "amountKes": 69_660,
            "source": "test",
        }

    monkeypatch.setattr(bookings, "convert_usd_to_kes", fake_convert)
    db = RecordingSession(
        vehicle=SimpleNamespace(type="Land Cruiser", price_per_day=Decimal("180.00"))
    )

    response = await bookings.create_booking(
        JsonRequest(
            booking_payload(
                bookingType="both",
                transportFrom="Arusha",
                transportTo="Serengeti",
                transportDays=3,
                vehicleType="Land Cruiser",
            )
        ),
        db,
    )

    assert response.status_code == 201
    persisted = db.added[0]
    assert persisted.booking_type == "both"
    assert persisted.number_of_rooms == 1
    assert persisted.vehicle_type == "Land Cruiser"


@pytest.mark.anyio
async def test_create_inquiry_persists_without_legacy_amount_range():
    db = RecordingSession()

    response = await inquiries.create_inquiry(
        JsonRequest(
            {
                "fullName": "Amina Otieno",
                "contact": "+254700000000",
                "email": "amina@example.com",
                "message": "Please help me plan a family safari.",
            }
        ),
        db,
    )

    assert response.status_code == 201
    assert decode(response)["success"] is True
    assert len(db.added) == 1
    assert isinstance(db.added[0], Inquiry)
