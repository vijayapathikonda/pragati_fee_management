import os
import io
from typing import List, Dict, Any, Optional
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle
from app.domain.student_models import Student

class HallTicketService:
    @staticmethod
    def _resolve_photo_path(photo_path: Optional[str]) -> Optional[str]:
        """Resolves student photo path across Docker and host environments."""
        if not photo_path:
            return None
        filename = os.path.basename(photo_path)
        candidates = [
            os.path.join("/app", "static_students", filename),
            os.path.join("/app", "uploads", "students", filename),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "public", "students", filename),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "frontend", "public", "students", filename),
            os.path.join("frontend", "public", "students", filename),
            os.path.join("public", "students", filename)
        ]
        for c in candidates:
            if os.path.isfile(c):
                return c
        return None

    @staticmethod
    def _resolve_signature_path() -> Optional[str]:
        """Resolves principal signature image path across Docker and host environments."""
        candidates = [
            os.path.join("/app", "app", "static", "principal_signature.png"),
            os.path.join("/app", "uploads", "principal_signature.png"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "principal_signature.png"),
            os.path.join("uploads", "principal_signature.png"),
            os.path.join("backend", "app", "static", "principal_signature.png"),
            os.path.join("frontend", "public", "principal_signature.png"),
        ]
        for c in candidates:
            if os.path.isfile(c):
                return c
        return None

    @classmethod
    def generate_batch_pdf(
        cls,
        students: List[Student],
        grade_name: str,
        exam_name: str,
        academic_year: str,
        subjects: List[Dict[str, Any]]
    ) -> bytes:
        """
        Generates a consolidated multi-page A4 PDF containing hall tickets for all students in the list.
        Formatted 2 hall tickets per A4 page with a center dashed scissor cut line.
        """
        buffer = io.BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        pdf.setTitle(f"Hall_Tickets_{grade_name.replace(' ', '_')}_{exam_name.replace(' ', '_')}")

        page_w, page_h = A4
        ticket_w = page_w - 40  # 555.27 pt
        ticket_h = 380  # 380 pt per ticket (safely fits 2 per A4 sheet)

        # Pair students: 2 students per page
        for i in range(0, len(students), 2):
            # Student 1 (Top Half)
            student_top = students[i]
            cls._draw_hall_ticket(
                pdf=pdf,
                student=student_top,
                grade_name=grade_name,
                exam_name=exam_name,
                academic_year=academic_year,
                subjects=subjects,
                x0=20,
                y0=432,
                width=ticket_w,
                height=ticket_h
            )

            # Center Scissor Cut Guide
            pdf.saveState()
            pdf.setStrokeColor(colors.HexColor("#94a3b8"))
            pdf.setDash(4, 4)
            pdf.setLineWidth(1)
            pdf.line(15, 417, page_w - 15, 417)
            pdf.setFont("Helvetica-Bold", 8)
            pdf.setFillColor(colors.HexColor("#64748b"))
            pdf.drawCentredString(page_w / 2, 414, "- - - - - - - - - - - - - - - - - ✂ Cut Here to Separate ✂ - - - - - - - - - - - - - - - - -")
            pdf.restoreState()

            # Student 2 (Bottom Half - if exists)
            if i + 1 < len(students):
                student_bottom = students[i + 1]
                cls._draw_hall_ticket(
                    pdf=pdf,
                    student=student_bottom,
                    grade_name=grade_name,
                    exam_name=exam_name,
                    academic_year=academic_year,
                    subjects=subjects,
                    x0=20,
                    y0=24,
                    width=ticket_w,
                    height=ticket_h
                )

            pdf.showPage()

        pdf.save()
        buffer.seek(0)
        return buffer.getvalue()

    @classmethod
    def _draw_hall_ticket(
        cls,
        pdf: canvas.Canvas,
        student: Student,
        grade_name: str,
        exam_name: str,
        academic_year: str,
        subjects: List[Dict[str, Any]],
        x0: float,
        y0: float,
        width: float,
        height: float
    ):
        """Renders an individual, self-contained examination hall ticket."""
        pdf.saveState()

        # 1. Outer Border
        pdf.setStrokeColor(colors.HexColor("#1e293b"))
        pdf.setLineWidth(1.2)
        pdf.roundRect(x0, y0, width, height, radius=5, stroke=1, fill=0)

        # 2. Official School Header (Crimson)
        pdf.setFillColor(colors.HexColor("#b91c1c"))
        pdf.setFont("Helvetica-Bold", 13)
        pdf.drawCentredString(x0 + width / 2, y0 + height - 20, "PRAGATI VIDYALAYA, Challakere")

        pdf.setFillColor(colors.HexColor("#334155"))
        pdf.setFont("Helvetica-Bold", 7.5)
        pdf.drawCentredString(x0 + width / 2, y0 + height - 31, "CBSE Affiliated No. 831401  |  DISE No. 29130220703  |  Mob: 7996622466 / 8660573737")

        pdf.setFillColor(colors.HexColor("#64748b"))
        pdf.setFont("Helvetica", 7)
        pdf.drawCentredString(x0 + width / 2, y0 + height - 41, "Near Bhutappa Temple, Nagaramgere Road, Challakere - 577522, Chitradurga Dist.")

        # 3. Exam Title Banner
        pdf.setFillColor(colors.HexColor("#f1f5f9"))
        pdf.rect(x0 + 1, y0 + height - 60, width - 2, 16, stroke=0, fill=1)
        pdf.setStrokeColor(colors.HexColor("#cbd5e1"))
        pdf.setLineWidth(0.5)
        pdf.line(x0 + 1, y0 + height - 60, x0 + width - 1, y0 + height - 60)
        pdf.line(x0 + 1, y0 + height - 44, x0 + width - 1, y0 + height - 44)

        pdf.setFillColor(colors.HexColor("#0f172a"))
        pdf.setFont("Helvetica-Bold", 9)
        banner_text = f"{exam_name.upper()} – HALL TICKET ({academic_year})"
        pdf.drawCentredString(x0 + width / 2, y0 + height - 56, banner_text)

        # 4. Student Photo Box (Right side)
        photo_w = 60
        photo_h = 75
        photo_x = x0 + width - photo_w - 12
        photo_y = y0 + height - 145

        photo_file = cls._resolve_photo_path(student.photo_path)
        if photo_file:
            try:
                pdf.drawImage(photo_file, photo_x, photo_y, width=photo_w, height=photo_h, preserveAspectRatio=True, mask='auto')
                pdf.setStrokeColor(colors.HexColor("#334155"))
                pdf.setLineWidth(0.8)
                pdf.rect(photo_x, photo_y, photo_w, photo_h, stroke=1, fill=0)
            except Exception:
                cls._draw_avatar_fallback(pdf, student, photo_x, photo_y, photo_w, photo_h)
        else:
            cls._draw_avatar_fallback(pdf, student, photo_x, photo_y, photo_w, photo_h)

        # 5. Student Information Grid (Left of Photo)
        info_left = x0 + 14
        start_y = y0 + height - 76
        line_spacing = 14

        pdf.setFont("Helvetica-Bold", 8)
        pdf.setFillColor(colors.HexColor("#475569"))
        pdf.drawString(info_left, start_y, "STUDENT NAME:")
        pdf.setFont("Helvetica-Bold", 9)
        pdf.setFillColor(colors.HexColor("#0f172a"))
        pdf.drawString(info_left + 85, start_y, student.student_name.upper())

        pdf.setFont("Helvetica-Bold", 8)
        pdf.setFillColor(colors.HexColor("#475569"))
        pdf.drawString(info_left, start_y - line_spacing, "FATHER'S NAME:")
        pdf.setFont("Helvetica", 8.5)
        pdf.setFillColor(colors.HexColor("#0f172a"))
        pdf.drawString(info_left + 85, start_y - line_spacing, (student.father_name or "-").upper())

        pdf.setFont("Helvetica-Bold", 8)
        pdf.setFillColor(colors.HexColor("#475569"))
        pdf.drawString(info_left, start_y - line_spacing * 2, "CLASS / SECTION:")
        pdf.setFont("Helvetica-Bold", 8.5)
        pdf.setFillColor(colors.HexColor("#0f172a"))
        sec_str = f" - Section {student.section.name}" if student.section else ""
        pdf.drawString(info_left + 85, start_y - line_spacing * 2, f"{grade_name}{sec_str}")

        pdf.setFont("Helvetica-Bold", 8)
        pdf.setFillColor(colors.HexColor("#475569"))
        pdf.drawString(info_left + 230, start_y - line_spacing * 2, "ROLL / S.N:")
        pdf.setFont("Helvetica-Bold", 8.5)
        pdf.setFillColor(colors.HexColor("#0f172a"))
        pdf.drawString(info_left + 295, start_y - line_spacing * 2, str(student.serial_number or "-"))

        pdf.setFont("Helvetica-Bold", 8)
        pdf.setFillColor(colors.HexColor("#475569"))
        pdf.drawString(info_left, start_y - line_spacing * 3, "ADMISSION NO:")
        pdf.setFont("Helvetica-Bold", 8.5)
        pdf.setFillColor(colors.HexColor("#0f172a"))
        pdf.drawString(info_left + 85, start_y - line_spacing * 3, student.admission_number or "-")

        pdf.setFont("Helvetica-Bold", 8)
        pdf.setFillColor(colors.HexColor("#475569"))
        pdf.drawString(info_left + 230, start_y - line_spacing * 3, "DATE OF BIRTH:")
        pdf.setFont("Helvetica", 8.5)
        pdf.setFillColor(colors.HexColor("#0f172a"))
        dob_str = student.date_of_birth.strftime("%d-%m-%Y") if student.date_of_birth else "-"
        pdf.drawString(info_left + 295, start_y - line_spacing * 3, dob_str)

        # 6. Subjects Schedule Table
        table_data = [
            ["SL", "SUBJECT", "MAX MARKS", "EXAM DATE", "TIME", "INVIGILATOR SIGN"]
        ]
        for idx, sub in enumerate(subjects, start=1):
            table_data.append([
                str(idx),
                str(sub.get("name", "")),
                str(sub.get("max_marks", "100")),
                str(sub.get("date", "-")),
                str(sub.get("time", "-")),
                ""
            ])

        col_widths = [24, 150, 60, 80, 115, 102]  # Total: 531 pt
        t = Table(table_data, colWidths=col_widths)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7.5),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),  # Align subject names to left
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#64748b")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#fdfdfd")]),
            ('TOPPADDING', (0, 0), (-1, -1), 2.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ]))

        t_w, t_h = t.wrap(width - 20, height)
        t_x = x0 + 12
        t_y = y0 + 44
        t.drawOn(pdf, t_x, t_y)

        # 7. Signature Lines & Footer
        sig_y = y0 + 16
        pdf.setLineWidth(0.6)
        pdf.setStrokeColor(colors.HexColor("#475569"))

        # Student signature
        pdf.line(x0 + 20, sig_y + 12, x0 + 140, sig_y + 12)
        pdf.setFont("Helvetica-Bold", 7.5)
        pdf.setFillColor(colors.HexColor("#334155"))
        pdf.drawCentredString(x0 + 80, sig_y, "STUDENT SIGNATURE")

        # Class teacher signature
        pdf.line(x0 + 215, sig_y + 12, x0 + 345, sig_y + 12)
        pdf.drawCentredString(x0 + 280, sig_y, "CLASS TEACHER")

        # Principal signature
        sig_file = cls._resolve_signature_path()
        if sig_file:
            try:
                pdf.drawImage(
                    sig_file,
                    x0 + 435,
                    sig_y + 13,
                    width=75,
                    height=22,
                    preserveAspectRatio=True,
                    mask='auto'
                )
            except Exception:
                pass

        pdf.line(x0 + 410, sig_y + 12, x0 + 535, sig_y + 12)
        pdf.drawCentredString(x0 + 472, sig_y, "PRINCIPAL")

        pdf.restoreState()

    @classmethod
    def _draw_avatar_fallback(cls, pdf: canvas.Canvas, student: Student, x: float, y: float, w: float, h: float):
        """Renders an attractive initial avatar placeholder if no photo exists."""
        pdf.setFillColor(colors.HexColor("#e2e8f0"))
        pdf.rect(x, y, w, h, stroke=1, fill=1)
        pdf.setFillColor(colors.HexColor("#475569"))
        pdf.setFont("Helvetica-Bold", 22)
        initial = (student.first_name[0] if student.first_name else "S").upper()
        pdf.drawCentredString(x + w / 2, y + h / 2 - 8, initial)
