import pytest

from app.payments.pricing import UnknownVehicleError, transport_amount_kes


def test_prices_transport_in_kes_from_server_catalog():
    assert transport_amount_kes("Alphard", 3) == 70_200


def test_rejects_unknown_vehicle():
    with pytest.raises(UnknownVehicleError):
        transport_amount_kes("Made-up vehicle", 2)
