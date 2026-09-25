import os
import uuid
from decimal import Decimal
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from app.domain.fee_models import FeeReceipt
from app.core.config import settings
from app.services.gdrive_service import gdrive_service


class PDFService:
    @staticmethod
    def _draw_receipt_slip(
        c: canvas.Canvas,
        receipt: FeeReceipt,
        student_name: str,
        admission_number: str,
        slip_title: str,
        slip_badge_bg: str,
        x0: float,
        y0: float,
        width: float,
        height: float,
    ) -> None:
        """
        Draws a single receipt slip (either PARENT SLIP or SCHOOL SLIP) within the given bounding box.
        """
        c.saveState()

        # Outer card border
        c.setStrokeColor(colors.HexColor("#cbd5e1"))
        c.setLineWidth(1)
        c.setFillColor(colors.white)
        c.roundRect(x0, y0, width, height, radius=6, stroke=1, fill=1)

        # Top header banner
        header_h = 54
        header_y = y0 + height - header_h
        c.setFillColor(colors.HexColor("#f8fafc"))
        c.setStrokeColor(colors.HexColor("#e2e8f0"))
        c.roundRect(x0, header_y, width, header_h, radius=6, stroke=1, fill=1)

        # Logo (if available)
        logo_path = os.path.join(os.path.dirname(__file__), "..", "assets", "logo.jpeg")
        text_x = x0 + 14
        if os.path.exists(logo_path):
            try:
                c.drawImage(
                    logo_path,
                    x0 + 12,
                    header_y + 7,
                    width=40,
                    height=40,
                    preserveAspectRatio=True,
                    mask="auto",
                )
                text_x = x0 + 60
            except Exception:
                text_x = x0 + 14

        # School Name & Contact Details
        c.setFillColor(colors.HexColor("#0f172a"))
        c.setFont("Helvetica-Bold", 13)
        c.drawString(text_x, header_y + 34, "PRAGATHI VIDYALAYA CHALLAKERE")

        c.setFillColor(colors.HexColor("#475569"))
        c.setFont("Helvetica", 8.5)
        c.drawString(text_x, header_y + 21, "Challakere, Chitradurga District, Karnataka, India")
        c.drawString(text_x, header_y + 9, "Email: contact@pragathividyalaya.edu.in  |  Phone: +91 98765 43210")

        # Slip Copy Badge (PARENT SLIP / SCHOOL SLIP) + FEE RECEIPT label
        badge_w = 118
        badge_h = 20
        badge_x = x0 + width - badge_w - 12
        badge_y = header_y + 27
        c.setFillColor(colors.HexColor(slip_badge_bg))
        c.roundRect(badge_x, badge_y, badge_w, badge_h, radius=4, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(badge_x + badge_w / 2.0, badge_y + 6, slip_title)

        c.setFillColor(colors.HexColor("#1e293b"))
        c.setFont("Helvetica-Bold", 9.5)
        c.drawRightString(x0 + width - 12, header_y + 10, "OFFICIAL FEE RECEIPT")

        # Metadata Section (Receipt & Student Info)
        meta_top = header_y - 8
        meta_h = 48
        meta_y = meta_top - meta_h

        c.setFillColor(colors.HexColor("#ffffff"))
        c.setStrokeColor(colors.HexColor("#e2e8f0"))
        c.rect(x0 + 12, meta_y, width - 24, meta_h, stroke=1, fill=1)

        receipt_date = (
            receipt.created_at.strftime("%d-%b-%Y")
            if getattr(receipt, "created_at", None)
            else datetime.now().strftime("%d-%b-%Y")
        )
        status_str = receipt.status.value if hasattr(receipt.status, "value") else str(receipt.status)
        grade_name = ""
        try:
            if getattr(receipt, "student", None) and getattr(receipt.student, "grade", None):
                grade_name = receipt.student.grade.name
        except Exception:
            grade_name = ""

        # Left metadata column
        left_x = x0 + 20
        c.setFont("Helvetica-Bold", 8.5)
        c.setFillColor(colors.HexColor("#475569"))
        c.drawString(left_x, meta_y + 33, "Receipt No:")
        c.drawString(left_x, meta_y + 19, "Receipt Date:")
        c.drawString(left_x, meta_y + 5, "Payment Mode:")

        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(colors.HexColor("#0f172a"))
        c.drawString(left_x + 70, meta_y + 33, str(receipt.receipt_number))
        c.setFont("Helvetica", 8.5)
        c.drawString(left_x + 70, meta_y + 19, receipt_date)
        mode_name = receipt.payment_mode.name if getattr(receipt, "payment_mode", None) else "Cash"
        ref_str = f" (Ref: {receipt.transaction_reference})" if getattr(receipt, "transaction_reference", None) else ""
        c.drawString(left_x + 70, meta_y + 5, f"{mode_name}{ref_str}")

        # Right metadata column
        right_x = x0 + (width / 2.0) + 10
        c.setFont("Helvetica-Bold", 8.5)
        c.setFillColor(colors.HexColor("#475569"))
        c.drawString(right_x, meta_y + 33, "Student Name:")
        c.drawString(right_x, meta_y + 19, "Admission No:")
        c.drawString(right_x, meta_y + 5, "Class / Status:")

        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(colors.HexColor("#0f172a"))
        c.drawString(right_x + 72, meta_y + 33, str(student_name)[:28])
        c.setFont("Helvetica", 8.5)
        c.drawString(right_x + 72, meta_y + 19, str(admission_number))
        class_status_text = f"{grade_name}  •  {status_str}" if grade_name else status_str
        c.drawString(right_x + 72, meta_y + 5, class_status_text)

        # Fee Items Table Header
        table_top = meta_y - 8
        th_h = 18
        th_y = table_top - th_h
        c.setFillColor(colors.HexColor("#1e293b"))
        c.rect(x0 + 12, th_y, width - 24, th_h, stroke=0, fill=1)

        col_sno = x0 + 18
        col_desc = x0 + 44
        col_cat = x0 + 215
        col_base = x0 + 325
        col_disc = x0 + 395
        col_net = x0 + 465
        col_paid_right = x0 + width - 18

        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(col_sno, th_y + 5, "#")
        c.drawString(col_desc, th_y + 5, "Fee Description")
        c.drawString(col_cat, th_y + 5, "Category")
        c.drawRightString(col_base, th_y + 5, "Base (Rs.)")
        c.drawRightString(col_disc, th_y + 5, "Discount")
        c.drawRightString(col_net, th_y + 5, "Net Fee")
        c.drawRightString(col_paid_right, th_y + 5, "Paid Now (Rs.)")

        # Table Rows
        row_y = th_y - 16
        sno = 1
        items = list(getattr(receipt, "items", []) or [])
        max_rows = 5
        for idx, item in enumerate(items[:max_rows]):
            if idx % 2 == 1:
                c.setFillColor(colors.HexColor("#f8fafc"))
                c.rect(x0 + 12, row_y - 4, width - 24, 16, stroke=0, fill=1)

            fa = item.fee_assignment
            desc = (fa.description if fa and fa.description else "Fee Payment")[:32]
            cat_name = (fa.fee_category.name if fa and getattr(fa, "fee_category", None) else "Standard")[:16]
            base_amt = Decimal(str(fa.base_amount if fa and fa.base_amount is not None else item.amount_paid))
            disc_amt = Decimal(str(fa.discount_amount if fa and fa.discount_amount is not None else "0.00"))
            net_amt = Decimal(str(fa.net_amount if fa and fa.net_amount is not None else item.amount_paid))
            paid_now = Decimal(str(item.amount_paid))

            c.setFillColor(colors.HexColor("#0f172a"))
            c.setFont("Helvetica", 8.2)
            c.drawString(col_sno, row_y, str(sno))
            c.drawString(col_desc, row_y, desc)
            c.drawString(col_cat, row_y, cat_name)
            c.drawRightString(col_base, row_y, f"{base_amt:,.2f}")
            if disc_amt > 0:
                c.setFillColor(colors.HexColor("#b45309"))
                c.drawRightString(col_disc, row_y, f"-{disc_amt:,.2f}")
                c.setFillColor(colors.HexColor("#0f172a"))
            else:
                c.setFillColor(colors.HexColor("#94a3b8"))
                c.drawRightString(col_disc, row_y, "0.00")
                c.setFillColor(colors.HexColor("#0f172a"))
            c.drawRightString(col_net, row_y, f"{net_amt:,.2f}")
            c.setFont("Helvetica-Bold", 8.5)
            c.drawRightString(col_paid_right, row_y, f"{paid_now:,.2f}")

            row_y -= 16
            sno += 1

        # Bottom line under items
        c.setStrokeColor(colors.HexColor("#cbd5e1"))
        c.setLineWidth(0.75)
        c.line(x0 + 12, row_y + 10, x0 + width - 12, row_y + 10)

        # Total Box & Signatures at bottom of slip
        footer_y = y0 + 10
        total_box_w = 195
        total_box_h = 24
        total_box_x = x0 + width - total_box_w - 12
        total_box_y = row_y - 18

        c.setFillColor(colors.HexColor("#eef2ff"))
        c.setStrokeColor(colors.HexColor("#6366f1"))
        c.roundRect(total_box_x, total_box_y, total_box_w, total_box_h, radius=4, stroke=1, fill=1)

        c.setFillColor(colors.HexColor("#1e1b4b"))
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(total_box_x + 8, total_box_y + 7, "TOTAL PAID:")
        c.drawRightString(
            total_box_x + total_box_w - 8,
            total_box_y + 7,
            f"Rs. {Decimal(str(receipt.total_amount)):,.2f}",
        )

        # Show discount note if applicable
        discount_names = []
        for item in items:
            fa = item.fee_assignment
            if fa and getattr(fa, "discount_type", None) and fa.discount_type:
                d_name = fa.discount_type.name
                if d_name not in discount_names:
                    discount_names.append(d_name)
        if discount_names:
            c.setFillColor(colors.HexColor("#b45309"))
            c.setFont("Helvetica-Bold", 8)
            c.drawString(x0 + 14, total_box_y + 8, f"Discount Plan: {', '.join(discount_names)}")

        # Footer signatures & note
        c.setStrokeColor(colors.HexColor("#94a3b8"))
        c.setLineWidth(0.6)
        c.line(x0 + width - 135, footer_y + 14, x0 + width - 16, footer_y + 14)

        c.setFillColor(colors.HexColor("#475569"))
        c.setFont("Helvetica-Bold", 7.5)
        c.drawCentredString(x0 + width - 75, footer_y + 4, "Authorized Signatory / Cashier")

        c.setFillColor(colors.HexColor("#64748b"))
        c.setFont("Helvetica-Oblique", 7.5)
        c.drawString(
            x0 + 14,
            footer_y + 4,
            "Computer generated receipt • Pragathi Vidyalaya Challakere",
        )

        c.restoreState()

    @staticmethod
    def _draw_scissor_divider(c: canvas.Canvas, page_w: float, cut_y: float) -> None:
        """
        Draws a horizontal dashed cut line with scissor symbols separating Parent Slip and School Slip.
        """
        c.saveState()
        c.setStrokeColor(colors.HexColor("#64748b"))
        c.setDash(5, 4)
        c.setLineWidth(1)
        c.line(18, cut_y, page_w - 18, cut_y)

        # Center pill background for label
        pill_w = 250
        pill_h = 14
        pill_x = (page_w - pill_w) / 2.0
        pill_y = cut_y - (pill_h / 2.0)
        c.setDash()
        c.setFillColor(colors.white)
        c.rect(pill_x, pill_y, pill_w, pill_h, stroke=0, fill=1)

        # Scissor icons using standard PDF ZapfDingbats font (chr(34) = ✂)
        c.setFillColor(colors.HexColor("#334155"))
        c.setFont("ZapfDingbats", 12)
        c.drawString(24, cut_y - 4, chr(34))
        c.drawString(pill_x + 6, cut_y - 4, chr(34))
        c.drawString(pill_x + pill_w - 18, cut_y - 4, chr(34))

        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(
            page_w / 2.0,
            cut_y - 3,
            "CUT HERE  •  TOP: PARENT SLIP  |  BOTTOM: SCHOOL SLIP",
        )
        c.restoreState()

    @staticmethod
    def generate_receipt_pdf(receipt: FeeReceipt, student_name: str, admission_number: str) -> str:
        """
        Generates a 1-page A4 PDF receipt split into two halves:
          - Top Half: PARENT SLIP
          - Middle: Dashed scissor cut line (✂)
          - Bottom Half: SCHOOL SLIP
        Returns the saved file path (relative to static directory or Google Drive link).
        """
        filename = f"{receipt.receipt_number}_{uuid.uuid4().hex[:6]}.pdf"
        receipts_dir = os.path.join("uploads", "receipts")
        os.makedirs(receipts_dir, exist_ok=True)
        filepath = os.path.join(receipts_dir, filename)

        c = canvas.Canvas(filepath, pagesize=A4)
        page_w, page_h = A4  # 595.27 x 841.89 pt
        c.setTitle(f"Fee_Receipt_{receipt.receipt_number}")

        margin_x = 20
        slip_w = page_w - (margin_x * 2)
        slip_h = 386
        cut_y = page_h / 2.0  # 420.94 pt

        # 1. Top Half -> PARENT SLIP
        PDFService._draw_receipt_slip(
            c=c,
            receipt=receipt,
            student_name=student_name,
            admission_number=admission_number,
            slip_title="PARENT SLIP",
            slip_badge_bg="#4f46e5",
            x0=margin_x,
            y0=cut_y + 14,
            width=slip_w,
            height=slip_h,
        )

        # 2. Center Scissor Cut Guide
        PDFService._draw_scissor_divider(c=c, page_w=page_w, cut_y=cut_y)

        # 3. Bottom Half -> SCHOOL SLIP
        PDFService._draw_receipt_slip(
            c=c,
            receipt=receipt,
            student_name=student_name,
            admission_number=admission_number,
            slip_title="SCHOOL SLIP",
            slip_badge_bg="#059669",
            x0=margin_x,
            y0=20,
            width=slip_w,
            height=slip_h,
        )

        c.showPage()
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
                    folder_name="Fee_Receipts",
                )
                if result and result.get("download_url"):
                    return result["download_url"]
                else:
                    print(f"[!] Failed to upload {filename} to Google Drive, falling back to local static URL.")

        return f"/static/receipts/{filename}"

