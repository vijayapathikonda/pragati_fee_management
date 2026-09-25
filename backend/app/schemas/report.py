from pydantic import BaseModel
from typing import List, Dict, Any

class ReportColumn(BaseModel):
    field: str
    headerName: str
    type: str = "string" # string, number, date

class ReportData(BaseModel):
    title: str
    columns: List[ReportColumn]
    rows: List[Dict[str, Any]]
