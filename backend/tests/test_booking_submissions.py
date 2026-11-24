import json
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
async def test_day_based_transport_booking_is_no_longer_accepted():
    # Transport is priced by route now; a days + vehicle-type payload without a
    # listed route or a quote request cannot be priced.
    db = RecordingSession()

    response = await bookings.create_booking(
        JsonRequest(
            booking_payload(
                bookingType="transport",
                numberOfRooms=0,
                transportFrom="Nairobi",
                transportTo="Naivasha",
                transportDays=2,
                vehicleType="Van",
                tripType="return",
            )
        ),
        db,
    )

    assert response.status_code == 400
    assert decode(response)["success"] is False
    assert db.added == []


@pytest.mark.anyio
async def test_general_booking_with_unlisted_route_is_saved_as_quote_request():
    db = RecordingSession()

    response = await bookings.create_booking(
        JsonRequest(
            booking_payload(
                bookingType="both",
                transportFrom="Arusha",
                transportTo="Serengeti",
                vehicleType="Land Cruiser",
                tripType="one_way",
                quoteRequested=True,
            )
        ),
        db,
    )

    assert response.status_code == 201
    assert decode(response)["payment"] == {"required": False, "amountKes": None}
    persisted = db.added[0]
    assert persisted.booking_type == "both"
    assert persisted.number_of_rooms == 1
    assert persisted.vehicle_type == "Land Cruiser"
    assert persisted.quote_requested is True
    assert persisted.trip_type == "one_way"
    assert persisted.payment_status == "not_required"


@pytest.mark.anyio
async def test_invalid_dates_return_400_not_a_server_error():
    db = RecordingSession()

    response = await bookings.create_booking(
        JsonRequest(booking_payload(travelStartDate="2026-10-13", travelEndDate="2026-10-10")),
        db,
    )

    assert response.status_code == 400
    assert decode(response)["error"] == "Invalid booking data"


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
