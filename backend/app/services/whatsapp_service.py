import json
import re
import urllib.parse
import urllib.request
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, Optional

from app.core.config import settings
from app.domain.fee_models import FeeReceipt
from app.domain.student_models import Student


class WhatsAppService:
    """
    Handles automatic WhatsApp receipt & PDF dispatch to the student's Mother Contact Number
    (with fallback to Father/Guardian contact number if Mother Contact is blank).

    Supports:
      1. Automatic Backend Delivery via Meta WhatsApp Cloud API (text + PDF document)
      2. Automatic Backend Delivery via WhatsApp Gateway / UltraMsg / Wati / Custom Webhook
      3. Direct wa.me click-to-chat deep link generation so school staff can also send
         directly from the school's WhatsApp Web / Desktop session with 1 click.
    """

    @staticmethod
    def normalize_phone(raw_phone: Optional[str]) -> Optional[str]:
        if not raw_phone:
            return None
        digits = re.sub(r"\D", "", str(raw_phone))
        if not digits:
            return None
        if len(digits) == 10:
            return f"91{digits}"
        if len(digits) == 11 and digits.startswith("0"):
            return f"91{digits[1:]}"
        if len(digits) == 12 and digits.startswith("91"):
            return digits
        return digits

    @classmethod
    def resolve_recipient_contact(cls, student: Student, override_phone: Optional[str] = None) -> Dict[str, Optional[str]]:
        """
        Prioritizes Mother Contact Number as requested by the school, with graceful fallback
        to Father Contact Number or general Contact Number if Mother's number is missing.
        """
        if override_phone:
            normalized = cls.normalize_phone(override_phone)
            if normalized:
                return {
                    "phone": normalized,
                    "raw_phone": override_phone,
                    "recipient_role": "Mother / Parent",
                    "recipient_name": student.mother_name or student.father_name or "Parent",
                }

        candidates = [
            (student.mother_contact_number, "Mother", student.mother_name or "Mother"),
            (student.father_contact_number, "Father", student.father_name or "Father"),
            (student.contact_number, "Guardian", student.mother_name or student.father_name or "Parent"),
        ]
        for raw, role, name in candidates:
            normalized = cls.normalize_phone(raw)
            if normalized:
                return {
                    "phone": normalized,
                    "raw_phone": raw,
                    "recipient_role": role,
                    "recipient_name": name,
                }

        return {
            "phone": None,
            "raw_phone": None,
            "recipient_role": "Mother",
            "recipient_name": student.mother_name or "Parent",
        }

    @classmethod
    def build_pdf_public_url(cls, pdf_path: Optional[str]) -> Optional[str]:
        if not pdf_path:
            return None
        if pdf_path.startswith("http://") or pdf_path.startswith("https://"):
            return pdf_path
        base = (settings.PUBLIC_BASE_URL or "").rstrip("/")
        path = pdf_path if pdf_path.startswith("/") else f"/{pdf_path}"
        return f"{base}{path}" if base else path

    @classmethod
    def build_receipt_message(cls, receipt: FeeReceipt, student: Student) -> str:
        student_name = f"{student.first_name} {student.last_name or ''}".strip()
        mother_name = student.mother_name or student.father_name or "Parent"
        grade_name = student.grade.name if getattr(student, "grade", None) else ""
        receipt_date = (
            receipt.created_at.strftime("%d-%b-%Y")
            if getattr(receipt, "created_at", None)
            else datetime.now().strftime("%d-%b-%Y")
        )
        mode_name = receipt.payment_mode.name if getattr(receipt, "payment_mode", None) else "Cash"

        fee_lines = []
        total_balance = Decimal("0.00")
        for item in getattr(receipt, "items", []) or []:
            fa = item.fee_assignment
            desc = fa.description if fa else "School Fee"
            paid_amt = Decimal(str(item.amount_paid or 0))
            if fa:
                bal = max(Decimal("0.00"), Decimal(str(fa.net_amount or 0)) - Decimal(str(fa.paid_amount or 0)))
                total_balance += bal
                if fa.discount_amount and Decimal(str(fa.discount_amount)) > 0:
                    disc_label = fa.discount_type.name if getattr(fa, "discount_type", None) else "Discount"
                    fee_lines.append(
                        f"  - {desc}: Paid Rs.{paid_amt:,.2f} (Base: Rs.{Decimal(str(fa.base_amount)):,.0f}, {disc_label}: -Rs.{Decimal(str(fa.discount_amount)):,.0f}, Net: Rs.{Decimal(str(fa.net_amount)):,.0f})"
                    )
                else:
                    fee_lines.append(f"  - {desc}: Paid Rs.{paid_amt:,.2f}")
            else:
                fee_lines.append(f"  - {desc}: Paid Rs.{paid_amt:,.2f}")

        fee_breakdown = "\n".join(fee_lines) if fee_lines else f"  - Fee Payment: Rs.{Decimal(str(receipt.total_amount)):,.2f}"
        pdf_url = cls.build_pdf_public_url(receipt.pdf_path)

        lines = [
            "*PRAGATHI VIDYALAYA CHALLAKERE*",
            "*Official Fee Payment Receipt*",
            "",
            f"Dear *{mother_name}*,",
            f"Greetings from Pragathi Vidyalaya! We confirm the receipt of fee payment for your ward *{student_name}*.",
            "",
            f"• *Receipt No:* {receipt.receipt_number}",
            f"• *Date:* {receipt_date}",
            f"• *Student Name:* {student_name}",
            f"• *Admission No:* {student.admission_number}",
        ]
        if grade_name:
            lines.append(f"• *Class / Grade:* {grade_name}")
        lines.extend([
            f"• *Payment Mode:* {mode_name}",
            f"• *Total Amount Paid:* *Rs. {Decimal(str(receipt.total_amount)):,.2f}*",
            f"• *Balance Due:* Rs. {total_balance:,.2f}",
            "",
            "*Fee Breakdown:*",
            fee_breakdown,
        ])
        if pdf_url:
            lines.extend([
                "",
                f"*Download Official Receipt PDF:*\n{pdf_url}",
            ])
        lines.extend([
            "",
            "Thank you,",
            "*Principal / Office*",
            "*Pragathi Vidyalaya, Challakere*",
        ])
        return "\n".join(lines)

    @classmethod
    def send_receipt_to_mother(
        cls,
        receipt: FeeReceipt,
        student: Student,
        override_phone: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Attempts automatic backend WhatsApp delivery to the Mother's contact number
        (via Meta WhatsApp Cloud API or Gateway Webhook if configured) and always returns
        the pre-filled WhatsApp click-to-chat URL and message payload.
        """
        contact = cls.resolve_recipient_contact(student, override_phone=override_phone)
        phone = contact["phone"]
        message = cls.build_receipt_message(receipt, student)
        pdf_url = cls.build_pdf_public_url(receipt.pdf_path)

        encoded_msg = urllib.parse.quote(message)
        wa_url = f"https://wa.me/{phone}?text={encoded_msg}" if phone else f"https://wa.me/?text={encoded_msg}"

        result: Dict[str, Any] = {
            "whatsapp_sent": False,
            "whatsapp_provider": "wa_link",
            "whatsapp_status": "ready_to_send" if phone else "missing_mother_phone",
            "recipient_phone": phone,
            "recipient_role": contact["recipient_role"],
            "recipient_name": contact["recipient_name"],
            "mother_name": student.mother_name,
            "mother_contact_number": student.mother_contact_number,
            "whatsapp_message": message,
            "whatsapp_url": wa_url,
            "pdf_url": pdf_url,
        }

        if not settings.WHATSAPP_ENABLED or not phone:
            return result

        # 1. Meta WhatsApp Business Cloud API (if configured in environment)
        if settings.WHATSAPP_PHONE_NUMBER_ID and settings.WHATSAPP_ACCESS_TOKEN:
            try:
                api_url = f"https://graph.facebook.com/v20.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
                headers = {
                    "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
                    "Content-Type": "application/json",
                }

                # Send text receipt message
                text_payload = json.dumps({
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": phone,
                    "type": "text",
                    "text": {"preview_url": True, "body": message},
                }).encode("utf-8")
                req = urllib.request.Request(api_url, data=text_payload, headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=10) as _:
                    pass

                # Send PDF receipt document if public URL is accessible
                if pdf_url and pdf_url.startswith("http"):
                    doc_payload = json.dumps({
                        "messaging_product": "whatsapp",
                        "recipient_type": "individual",
                        "to": phone,
                        "type": "document",
                        "document": {
                            "link": pdf_url,
                            "caption": f"Official Fee Receipt {receipt.receipt_number} - {student.first_name}",
                            "filename": f"{receipt.receipt_number}.pdf",
                        },
                    }).encode("utf-8")
                    doc_req = urllib.request.Request(api_url, data=doc_payload, headers=headers, method="POST")
                    with urllib.request.urlopen(doc_req, timeout=10) as _:
                        pass

                result["whatsapp_sent"] = True
                result["whatsapp_provider"] = "meta_cloud_api"
                result["whatsapp_status"] = "sent_automatically"
                return result
            except Exception as exc:
                print(f"[WhatsAppService] Meta Cloud API send failed: {exc}")
                result["whatsapp_status"] = f"cloud_api_failed_fallback_link"

        # 2. Custom WhatsApp Gateway / UltraMsg / Wati Webhook (if configured in environment)
        if settings.WHATSAPP_GATEWAY_URL:
            try:
                headers = {"Content-Type": "application/json"}
                if settings.WHATSAPP_GATEWAY_TOKEN:
                    headers["Authorization"] = f"Bearer {settings.WHATSAPP_GATEWAY_TOKEN}"
                gateway_payload = json.dumps({
                    "to": phone,
                    "from": settings.SCHOOL_WHATSAPP_NUMBER,
                    "token": settings.WHATSAPP_GATEWAY_TOKEN,
                    "body": message,
                    "message": message,
                    "document": pdf_url,
                    "filename": f"{receipt.receipt_number}.pdf",
                    "receipt_number": receipt.receipt_number,
                    "student_name": f"{student.first_name} {student.last_name or ''}".strip(),
                }).encode("utf-8")
                req = urllib.request.Request(
                    settings.WHATSAPP_GATEWAY_URL,
                    data=gateway_payload,
                    headers=headers,
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=10) as _:
                    pass

                result["whatsapp_sent"] = True
                result["whatsapp_provider"] = "gateway_webhook"
                result["whatsapp_status"] = "sent_automatically"
                return result
            except Exception as exc:
                print(f"[WhatsAppService] Gateway webhook send failed: {exc}")
                result["whatsapp_status"] = "gateway_failed_fallback_link"

        return result
