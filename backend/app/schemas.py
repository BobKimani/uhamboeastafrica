from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, model_validator


class CreateBooking(BaseModel):
    fullName: str = Field(min_length=2)
    email: EmailStr
    phone: str = Field(min_length=7)
    destination: str = Field(min_length=2)
    travelStartDate: str = Field(min_length=1)
    travelEndDate: str = Field(min_length=1)
    travellingWith: Literal["solo", "couple", "family", "group"]
    bookingType: Literal["accommodation", "transport", "both"]
    numberOfTravellers: int = Field(ge=1)
    numberOfRooms: int = Field(ge=0)
    selectedHotelId: str | None = Field(default=None, min_length=1)
    transportFrom: str | None = Field(default=None, min_length=2)
    transportTo: str | None = Field(default=None, min_length=2)
    # Legacy (day-based pricing was removed); accepted but not used for pricing.
    transportDays: int | None = Field(default=None, ge=1, le=365)
    vehicleType: str | None = Field(default=None, min_length=2)
    # Route pricing: listed route + specific vehicle, priced by the server.
    tripType: Literal["one_way", "return"] | None = None
    transportFromId: str | None = Field(default=None, max_length=64)
    transportToId: str | None = Field(default=None, max_length=64)
    vehicleId: str | None = Field(default=None, max_length=64)
    # Total the customer was shown; a mismatch means prices changed meanwhile.
    quotedTotalKes: int | None = Field(default=None, ge=0)
    # Unlisted route: saved for the team to price; no online payment.
    quoteRequested: bool = False

    @model_validator(mode="after")
    def _check_dates_and_transport(self):
        if date.fromisoformat(self.travelEndDate) < date.fromisoformat(
            self.travelStartDate
        ):
            raise ValueError(
                "Travel end date must be after or equal to travel start date"
            )
        if self.bookingType in {"transport", "both"}:
            if self.tripType is None:
                raise ValueError("Choose one way or return for transport bookings")
            if self.quoteRequested:
                if not (self.transportFrom and self.transportTo):
                    raise ValueError("Pickup and destination are required for a quote request")
            elif not (self.transportFromId and self.transportToId and self.vehicleId):
                raise ValueError(
                    "Choose a listed route and vehicle, or request a quote for this route"
                )
        return self


class InitiateKcbPayment(BaseModel):
    bookingId: str = Field(min_length=1, max_length=128)
    phone: str = Field(min_length=9, max_length=20)


class UpdateBookingStatus(BaseModel):
    status: Literal[
        "new", "contacted", "quoted", "confirmed", "cancelled", "completed"
    ]


class CreateInquiry(BaseModel):
    fullName: str = Field(min_length=2)
    contact: str = Field(min_length=7)
    email: EmailStr
    message: str = Field(min_length=10)


class UpdateInquiryStatus(BaseModel):
    status: Literal["new", "read", "replied", "archived"]
