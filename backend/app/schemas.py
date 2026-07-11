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
    minimumBudget: float = Field(ge=0)
    maximumBudget: float = Field(ge=0)
    transportFrom: str | None = Field(default=None, min_length=2)
    transportTo: str | None = Field(default=None, min_length=2)
    transportDays: int | None = Field(default=None, ge=1, le=365)
    vehicleType: str | None = Field(default=None, min_length=2)
    transportAmountKes: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def _check_budget_and_dates(self):
        if self.maximumBudget < self.minimumBudget:
            raise ValueError(
                "Maximum budget must be greater than or equal to minimum budget"
            )
        if date.fromisoformat(self.travelEndDate) < date.fromisoformat(
            self.travelStartDate
        ):
            raise ValueError(
                "Travel end date must be after or equal to travel start date"
            )
        if self.bookingType in {"transport", "both"}:
            if not all(
                [
                    self.transportFrom,
                    self.transportTo,
                    self.transportDays,
                    self.vehicleType,
                ]
            ):
                raise ValueError(
                    "Transport route, days, and vehicle are required for transport bookings"
                )
        return self


class InitiateKcbPayment(BaseModel):
    bookingId: str = Field(min_length=1, max_length=128)
    phone: str = Field(min_length=9, max_length=20)
    amountKes: int | None = Field(default=None, ge=1)


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
