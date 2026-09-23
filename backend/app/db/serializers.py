from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from app.db.models import Booking, Hotel, Inquiry, Payment, Vehicle


def _json_value(value):
    if isinstance(value, Decimal):
        if value == value.to_integral_value():
            return int(value)
        return float(value)
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


def booking_to_api(booking: Booking) -> dict:
    return {
        "id": str(booking.id),
        "fullName": booking.full_name,
        "email": booking.email,
        "phone": booking.phone,
        "destination": booking.destination,
        "travelStartDate": booking.travel_start_date.isoformat(),
        "travelEndDate": booking.travel_end_date.isoformat(),
        "travellingWith": booking.travelling_with,
        "bookingType": booking.booking_type,
        "numberOfTravellers": booking.number_of_travellers,
        "numberOfRooms": booking.number_of_rooms,
        "selectedHotelId": str(booking.selected_hotel_id)
        if booking.selected_hotel_id
        else None,
        "transportFrom": booking.transport_from,
        "transportTo": booking.transport_to,
        "transportDays": booking.transport_days,
        "vehicleType": booking.vehicle_type,
        "transportAmountKes": booking.transport_amount_kes,
        "status": booking.status,
        "paymentStatus": booking.payment_status,
        "amount_usd": _json_value(booking.amount_usd),
        "exchange_rate": _json_value(booking.exchange_rate),
        "amount_kes": booking.amount_kes,
        "currency_source": booking.currency_source,
        "rate_locked_at": _json_value(booking.rate_locked_at),
        "createdAt": _json_value(booking.created_at),
        "updatedAt": _json_value(booking.updated_at),
    }


def inquiry_to_api(inquiry: Inquiry) -> dict:
    return {
        "id": str(inquiry.id),
        "fullName": inquiry.full_name,
        "contact": inquiry.contact,
        "email": inquiry.email,
        "message": inquiry.message,
        "status": inquiry.status,
        "createdAt": _json_value(inquiry.created_at),
        "updatedAt": _json_value(inquiry.updated_at),
    }


def payment_to_api(payment: Payment) -> dict:
    return {
        "id": str(payment.id),
        "bookingId": str(payment.booking_id) if payment.booking_id else None,
        "paymentReference": payment.payment_reference,
        "invoiceNumber": payment.invoice_number,
        "merchantRequestId": payment.merchant_request_id,
        "checkoutRequestId": payment.checkout_request_id,
        "mpesaReceiptNumber": payment.mpesa_receipt_number,
        "phoneNumber": payment.phone_number,
        "accountNumber": payment.account_number,
        "provider": payment.provider,
        "providerReference": payment.provider_reference,
        "status": payment.status,
        "amount": _json_value(payment.amount),
        "currency": payment.currency,
        "paidAt": _json_value(payment.paid_at),
        "queriedAt": _json_value(payment.queried_at),
        "createdAt": _json_value(payment.created_at),
        "updatedAt": _json_value(payment.updated_at),
    }


def hotel_to_api(hotel: Hotel) -> dict:
    return {
        "id": str(hotel.id),
        "name": hotel.name,
        "country": hotel.country,
        "region": hotel.region,
        "destination": hotel.destination,
        "pricePerNight": _json_value(hotel.price_per_night),
        "rating": _json_value(hotel.rating),
        "image": hotel.image,
        "tags": hotel.tags,
        "description": hotel.description,
        "topRated": hotel.top_rated,
        "isAvailable": hotel.is_available,
        "rates": hotel.rates,
        "createdAt": _json_value(hotel.created_at),
        "updatedAt": _json_value(hotel.updated_at),
    }


def vehicle_to_api(vehicle: Vehicle) -> dict:
    return {
        "id": str(vehicle.id),
        "name": vehicle.name,
        "type": vehicle.type,
        "capacity": vehicle.capacity,
        "pricePerDay": _json_value(vehicle.price_per_day),
        "bestFor": vehicle.best_for,
        "features": vehicle.features,
        "image": vehicle.image,
        "region": vehicle.region,
        "isAvailable": vehicle.is_available,
        "createdAt": _json_value(vehicle.created_at),
        "updatedAt": _json_value(vehicle.updated_at),
    }
