from typing import List, Optional
from pydantic import BaseModel
from datetime import date, datetime

# Buffalo Schemas
class BuffaloBase(BaseModel):
    tag_number: str
    name: Optional[str] = None
    breed: str
    date_of_birth: date
    lactation_number: Optional[int] = 1
    pregnancy_status: Optional[bool] = False
    photo_url: Optional[str] = None
    notes: Optional[str] = None

class BuffaloCreate(BuffaloBase):
    pass

class Buffalo(BuffaloBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

# Milk Production Schemas
class MilkProductionBase(BaseModel):
    buffalo_id: str
    date: date
    morning_milk_liters: float = 0.0
    evening_milk_liters: float = 0.0

class MilkProductionCreate(MilkProductionBase):
    pass

class MilkProduction(MilkProductionBase):
    id: str
    total_milk_liters: float
    created_at: datetime
    class Config:
        from_attributes = True

# Milk Sales Schemas
class MilkSalesBase(BaseModel):
    date: date
    milk_center_name: str
    quantity_supplied_liters: float
    price_per_liter: float

class MilkSalesCreate(MilkSalesBase):
    pass

class MilkSales(MilkSalesBase):
    id: str
    total_income: float
    created_at: datetime
    class Config:
        from_attributes = True

# Expense Schemas
class ExpenseBase(BaseModel):
    date: date
    category: str
    amount: float
    description: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class Expense(ExpenseBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

# Health Record Schemas
class HealthRecordBase(BaseModel):
    buffalo_id: str
    record_type: str
    date: date
    details: str
    next_due_date: Optional[date] = None

class HealthRecordCreate(HealthRecordBase):
    pass

class HealthRecord(HealthRecordBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

class DashboardSummary(BaseModel):
    total_buffaloes: int
    pregnant_buffaloes: int
    total_milk_today: float
    upcoming_vaccinations: int
    profit_loss_current_month: float
    total_vendors: int

# Vendor Schemas
class VendorBase(BaseModel):
    name: str
    vendor_type: str
    phone: Optional[str] = None
    transaction_date: Optional[date] = None
    quantity_liters: Optional[float] = 0.0
    price_per_unit: Optional[float] = 0.0
    total_amount: Optional[float] = 0.0
    payment_status: Optional[str] = 'UNPAID'
    notes: Optional[str] = None

class VendorCreate(VendorBase):
    pass

class Vendor(VendorBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True


# Login Log Schemas
class LoginLogSchema(BaseModel):
    id: str
    partner_name: str
    login_date: date
    login_time: str
    ip_address: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True


# Vendor Payment Schemas
class VendorPaymentCreate(BaseModel):
    vendor_id: str
    payment_date: Optional[date] = None
    amount_paid: float
    notes: Optional[str] = None

class VendorPaymentSchema(BaseModel):
    id: str
    vendor_id: str
    payment_date: date
    amount_paid: float
    notes: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class VendorBalance(BaseModel):
    vendor_id: str
    vendor_name: str
    vendor_type: str
    phone: Optional[str] = None
    transaction_date: Optional[date] = None
    total_amount: float
    total_paid: float
    outstanding: float
    payment_status: str
