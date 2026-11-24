"""Route-pricing tables (see db/migrations/20261119_transport_route_pricing.sql)."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, SmallInteger, Text, func
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class TransportPricingSettings(Base):
    __tablename__ = "transport_pricing_settings"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, default=1)
    fuel_price_kes: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    margin_kes: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    multiplier: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_by: Mapped[UUID | None] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("admin_users.id", ondelete="SET NULL")
    )


class TransportPlace(Base):
    __tablename__ = "transport_places"

    id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class TransportRoute(Base):
    __tablename__ = "transport_routes"

    id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    place_a_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True),
        ForeignKey("transport_places.id", ondelete="CASCADE"),
        nullable=False,
    )
    place_b_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True),
        ForeignKey("transport_places.id", ondelete="CASCADE"),
        nullable=False,
    )
    distance_km: Mapped[Decimal] = mapped_column(Numeric(7, 1), nullable=False)
    needs_review: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
