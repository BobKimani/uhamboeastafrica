from decimal import Decimal

import pytest

from app.services.transport_pricing import PricingSettings, calculate_quote

SETTINGS = PricingSettings(
    fuel_price_kes=Decimal("217"), margin_kes=Decimal("0"), multiplier=Decimal("0.9")
)


def test_return_trip_counts_two_legs_and_half_fuel_for_driver():
    # Nairobi -> Mombasa, 470 km, Noah at 9 km/L, fuel 217 (agreed reference)
    quote = calculate_quote(
        distance_km=Decimal("470"), km_per_litre=Decimal("9"),
        settings=SETTINGS, trip_type="return",
    )

    assert quote.legs == Decimal("2")
    assert quote.fuel_kes.quantize(Decimal("0.01")) == Decimal("22664.44")
    assert quote.driver_allowance_kes.quantize(Decimal("0.01")) == Decimal("11332.22")
    assert quote.total_kes == 30597


def test_one_way_costs_the_same_as_return_because_the_vehicle_comes_back():
    one_way = calculate_quote(
        distance_km=Decimal("470"), km_per_litre=Decimal("9"),
        settings=SETTINGS, trip_type="one_way",
    )
    return_trip = calculate_quote(
        distance_km=Decimal("470"), km_per_litre=Decimal("9"),
        settings=SETTINGS, trip_type="return",
    )

    assert one_way.legs == Decimal("2")
    assert one_way.fuel_kes.quantize(Decimal("0.01")) == Decimal("22664.44")
    assert one_way.driver_allowance_kes.quantize(Decimal("0.01")) == Decimal("11332.22")
    assert one_way.total_kes == return_trip.total_kes == 30597


def test_margin_is_added_before_the_multiplier():
    settings = PricingSettings(
        fuel_price_kes=Decimal("217"), margin_kes=Decimal("1000"), multiplier=Decimal("0.9")
    )
    quote = calculate_quote(
        distance_km=Decimal("470"), km_per_litre=Decimal("9"),
        settings=settings, trip_type="return",
    )
    assert quote.total_kes == 30597 + 900


def test_less_efficient_vehicle_costs_more():
    van = calculate_quote(distance_km=Decimal("100"), km_per_litre=Decimal("9"),
                          settings=SETTINGS, trip_type="return")
    cruiser = calculate_quote(distance_km=Decimal("100"), km_per_litre=Decimal("5"),
                              settings=SETTINGS, trip_type="return")
    assert cruiser.total_kes > van.total_kes


def test_total_rounds_half_up_to_whole_shillings():
    # fuel = 1 km / 1 km/L * 1 * 2 = 2; driver = 1; (3 + 0) * 0.5 = 1.5 -> 2
    settings = PricingSettings(fuel_price_kes=Decimal("1"), margin_kes=Decimal("0"),
                               multiplier=Decimal("0.5"))
    quote = calculate_quote(distance_km=Decimal("1"), km_per_litre=Decimal("1"),
                            settings=settings, trip_type="return")
    assert quote.total_kes == 2


@pytest.mark.parametrize(
    "kwargs",
    [
        {"distance_km": Decimal("0")},
        {"km_per_litre": Decimal("0")},
        {"trip_type": "weekly"},
    ],
)
def test_rejects_invalid_inputs(kwargs):
    args = {"distance_km": Decimal("470"), "km_per_litre": Decimal("9"),
            "settings": SETTINGS, "trip_type": "return", **kwargs}
    with pytest.raises(ValueError):
        calculate_quote(**args)
