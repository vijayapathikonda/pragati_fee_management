import os
import uuid
from decimal import Decimal
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from app.domain.fee_models import FeeReceipt
from app.core.config import settings
from app.services.gdrive_service import gdrive_service

class PDFService:
    @staticmethod
    def generate_receipt_pdf(receipt: FeeReceipt, student_name: str, admission_number: str) -> str:
        """
        Generates a PDF receipt and returns the saved file path (relative to static directory or Google Drive link).
        """
        filename = f"{receipt.receipt_number}_{uuid.uuid4().hex[:6]}.pdf"
        receipts_dir = os.path.join("uploads", "receipts")
        os.makedirs(receipts_dir, exist_ok=True)
        filepath = os.path.join(receipts_dir, filename)
        
        c = canvas.Canvas(filepath, pagesize=letter)
        width, height = letter
        
        # Header
        logo_path = os.path.join(os.path.dirname(__file__), "..", "assets", "logo.jpeg")
        if os.path.exists(logo_path):
            c.drawImage(logo_path, 50, height - 90, width=60, height=60, preserveAspectRatio=True, mask='auto')
            text_x = 120
        else:
            text_x = 50

        c.setFont("Helvetica-Bold", 20)
        c.drawString(text_x, height - 50, "Pragathi Vidyalaya Challakere")
        
        c.setFont("Helvetica", 12)
        c.drawString(text_x, height - 70, "Challakere, Chitradurga District, Karnataka, India")
        c.drawString(text_x, height - 85, "Email: contact@pragathividyalaya.edu.in | Phone: +91 98765 43210")
        
        c.line(50, height - 100, width - 50, height - 100)
        
        # Title
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(width / 2.0, height - 130, "FEE RECEIPT")
        
        # Receipt Details
        c.setFont("Helvetica", 11)
        c.drawString(50, height - 160, f"Receipt No: {receipt.receipt_number}")
        c.drawString(50, height - 180, f"Date: {receipt.created_at.strftime('%Y-%m-%d') if receipt.created_at else datetime.now().strftime('%Y-%m-%d')}")
        c.drawString(50, height - 200, f"Status: {receipt.status}")
        
        # Student Details
        c.drawString(350, height - 160, f"Student Name: {student_name}")
        c.drawString(350, height - 180, f"Admission No: {admission_number}")
        
        c.line(50, height - 220, width - 50, height - 220)
        
        # Table Header
        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, height - 250, "S.No")
        c.drawString(100, height - 250, "Fee Description")
        c.drawString(350, height - 250, "Category")
        c.drawRightString(width - 50, height - 250, "Amount Paid")
        
        c.line(50, height - 260, width - 50, height - 260)
        
        # Table Items
        c.setFont("Helvetica", 11)
        y = height - 280
        sno = 1
        for item in receipt.items:
            c.drawString(50, y, str(sno))
            c.drawString(100, y, item.fee_assignment.description)
            c.drawString(350, y, item.fee_assignment.fee_category.name)
            c.drawRightString(width - 50, y, f"Rs. {item.amount_paid:.2f}")
            y -= 20
            sno += 1
            
        c.line(50, y - 10, width - 50, y - 10)
        
        # Total
        y -= 30
        c.setFont("Helvetica-Bold", 12)
        c.drawString(350, y, "Total Amount:")
        c.drawRightString(width - 50, y, f"Rs. {receipt.total_amount:.2f}")
        
        # Payment Mode
        y -= 30
        c.setFont("Helvetica", 11)
        c.drawString(50, y, f"Payment Mode: {receipt.payment_mode.name}")
        if receipt.transaction_reference:
            y -= 20
            c.drawString(50, y, f"Transaction Ref: {receipt.transaction_reference}")
            
        # Footer
        c.setFont("Helvetica-Oblique", 10)
        c.drawCentredString(width / 2.0, 50, "This is a computer generated receipt and does not require a physical signature.")
        
        c.save()
        
        # Cloud Storage via Google Drive
        if settings.STORAGE_PROVIDER == "gdrive":
            if not gdrive_service.is_configured:
                print("[!] STORAGE_PROVIDER is 'gdrive' but Google Drive service is not configured! Check GDRIVE_SERVICE_ACCOUNT_JSON.")
            else:
                result = gdrive_service.upload_local_file(
                    filepath,
                    filename=filename,
                    mime_type="application/pdf",
                    folder_name="Fee_Receipts"
                )
                if result and result.get("download_url"):
                    return result["download_url"]
                else:
                    print(f"[!] Failed to upload {filename} to Google Drive, falling back to local static URL.")

        return f"/static/receipts/{filename}"
