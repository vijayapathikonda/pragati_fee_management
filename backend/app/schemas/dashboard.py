from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal

class CategoryFinancialSummary(BaseModel):
    category_name: str
    total_assigned: Decimal
    total_paid: Decimal
    total_outstanding: Decimal
    collection_percentage: float

class DashboardCards(BaseModel):
    total_students: int
    active_students: int
    today_collection: Decimal
    monthly_collection: Decimal
    yearly_collection: Decimal
    total_assigned: Decimal = Decimal("0.00")
    tuition_assigned: Decimal = Decimal("0.00")
    bus_assigned: Decimal = Decimal("0.00")
    total_paid: Decimal = Decimal("0.00")
    tuition_paid: Decimal = Decimal("0.00")
    bus_paid: Decimal = Decimal("0.00")
    outstanding_amount: Decimal
    tuition_outstanding: Decimal = Decimal("0.00")
    bus_outstanding: Decimal = Decimal("0.00")
    total_receipts: int

class ChartSeries(BaseModel):
    name: str
    data: List[float]

class ChartData(BaseModel):
    labels: List[str]
    series: List[float] | List[ChartSeries]

class DashboardCharts(BaseModel):
    category_collection: ChartData
    category_outstanding: ChartData
    daily_collection: ChartData
    monthly_collection: ChartData
    grade_collection: ChartData
    payment_mode_distribution: ChartData

class RecentPayment(BaseModel):
    id: int
    receipt_number: str
    student_name: str
    admission_number: str
    amount: Decimal
    date: str
    mode: str

class TopDefaulter(BaseModel):
    student_id: int
    student_name: str
    admission_number: str
    grade: str
    section: str
    outstanding_amount: Decimal

class DashboardLists(BaseModel):
    recent_payments: List[RecentPayment]
    top_defaulters: List[TopDefaulter]

class DashboardSummary(BaseModel):
    cards: DashboardCards
    charts: DashboardCharts
    lists: DashboardLists
    category_summary: List[CategoryFinancialSummary] = []
