import os
import uuid
import csv
from io import StringIO
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas
from openpyxl import Workbook
from fastapi.responses import FileResponse, StreamingResponse
from app.schemas.report import ReportData

class ExportService:
    @staticmethod
    def _get_temp_path(ext: str) -> str:
        filename = f"export_{uuid.uuid4().hex}.{ext}"
        os.makedirs("uploads/temp", exist_ok=True)
        return os.path.join("uploads", "temp", filename)

    @staticmethod
    def to_csv(data: ReportData) -> StreamingResponse:
        output = StringIO()
        writer = csv.writer(output)
        
        # Headers
        headers = [col.headerName for col in data.columns]
        writer.writerow(headers)
        
        # Rows
        for row in data.rows:
            writer.writerow([row.get(col.field, "") for col in data.columns])
            
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]), 
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={data.title.replace(' ', '_')}.csv"}
        )

    @staticmethod
    def to_excel(data: ReportData) -> FileResponse:
        filepath = ExportService._get_temp_path("xlsx")
        wb = Workbook()
        ws = wb.active
        ws.title = "Report"
        
        # Title
        ws.append([data.title])
        ws.append([])
        
        # Headers
        headers = [col.headerName for col in data.columns]
        ws.append(headers)
        
        # Rows
        for row in data.rows:
            ws.append([row.get(col.field, "") for col in data.columns])
            
        wb.save(filepath)
        return FileResponse(
            filepath, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=f"{data.title.replace(' ', '_')}.xlsx"
        )

    @staticmethod
    def to_pdf(data: ReportData) -> FileResponse:
        filepath = ExportService._get_temp_path("pdf")
        
        # Use landscape for reports as they usually have many columns
        c = canvas.Canvas(filepath, pagesize=landscape(letter))
        width, height = landscape(letter)
        
        # Header
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, height - 50, "School Fee Management System")
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, height - 70, data.title)
        
        c.line(50, height - 85, width - 50, height - 85)
        
        # Table calculation
        col_width = (width - 100) / max(len(data.columns), 1)
        
        # Draw Headers
        y = height - 110
        c.setFont("Helvetica-Bold", 10)
        for i, col in enumerate(data.columns):
            x = 50 + (i * col_width)
            c.drawString(x, y, str(col.headerName)[:int(col_width/5)]) # simple truncation
            
        c.line(50, y - 10, width - 50, y - 10)
        
        # Draw Rows
        c.setFont("Helvetica", 9)
        y -= 30
        
        for row in data.rows:
            if y < 50:
                c.showPage()
                y = height - 50
                c.setFont("Helvetica", 9)
                
            for i, col in enumerate(data.columns):
                x = 50 + (i * col_width)
                val = str(row.get(col.field, ""))
                c.drawString(x, y, val[:int(col_width/5)])
                
            y -= 20
            
        c.save()
        
        return FileResponse(
            filepath,
            media_type="application/pdf",
            filename=f"{data.title.replace(' ', '_')}.pdf"
        )
