from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
import datetime
import uuid

from database import Base


class Buffalo(Base):
    __tablename__ = "buffaloes"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    tag_number = Column(String, unique=True, index=True)
    name = Column(String, nullable=True)
    breed = Column(String)
    date_of_birth = Column(Date)
    lactation_number = Column(Integer, default=1)
    pregnancy_status = Column(Boolean, default=False)
    photo_url = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    milk_records = relationship("MilkProduction", back_populates="buffalo")
    health_records = relationship("HealthRecord", back_populates="buffalo")

class MilkProduction(Base):
    __tablename__ = "milk_production"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    buffalo_id = Column(String, ForeignKey("buffaloes.id"))
    date = Column(Date)
    morning_milk_liters = Column(Float, default=0.0)
    evening_milk_liters = Column(Float, default=0.0)
    total_milk_liters = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    buffalo = relationship("Buffalo", back_populates="milk_records")

class MilkSales(Base):
    __tablename__ = "milk_sales"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    date = Column(Date)
    milk_center_name = Column(String)
    quantity_supplied_liters = Column(Float)
    price_per_liter = Column(Float)
    total_income = Column(Float)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    date = Column(Date)
    category = Column(String) # PETROL, DIESEL, SALARY, FEED, VET, MISC
    amount = Column(Float)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class HealthRecord(Base):
    __tablename__ = "health_records"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    buffalo_id = Column(String, ForeignKey("buffaloes.id"))
    record_type = Column(String) # VACCINATION, PREGNANCY_CHECK, TREATMENT, GENERAL
    date = Column(Date)
    details = Column(Text)
    next_due_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    buffalo = relationship("Buffalo", back_populates="health_records")

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True)
    vendor_type = Column(String)  # FEED, MEDICINE, EQUIPMENT, LABOUR, MILK, OTHER
    phone = Column(String, nullable=True)
    transaction_date = Column(Date, default=datetime.date.today)
    quantity_liters = Column(Float, nullable=True, default=0.0)
    price_per_unit = Column(Float, nullable=True, default=0.0)
    total_amount = Column(Float, nullable=True, default=0.0)
    payment_status = Column(String, default='UNPAID')  # PAID, UNPAID
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    payments = relationship("VendorPayment", back_populates="vendor", cascade="all, delete-orphan")


class VendorPayment(Base):
    """Tracks individual payment installments against a vendor transaction."""
    __tablename__ = "vendor_payments"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    vendor_id = Column(String, ForeignKey("vendors.id"))
    payment_date = Column(Date, default=datetime.date.today)
    amount_paid = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    vendor = relationship("Vendor", back_populates="payments")


class LoginLog(Base):
    __tablename__ = "login_logs"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    partner_name = Column(String, index=True)
    login_date = Column(Date, default=datetime.date.today)
    login_time = Column(String)   # stored as HH:MM:SS
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
