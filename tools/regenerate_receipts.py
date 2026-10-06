#!/usr/bin/env python3
"""
Regenerate all 36 Fee Receipts and upload them to Google Drive folder 'Pragathi_Fee_Receipts'.
Updates Turso DB with the Google Drive URLs.
"""
import os
import sys
import ssl
import json
import uuid
import requests
import certifi
from decimal import Decimal
from datetime import datetime
import urllib3
urllib3.disable_warnings()

os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()
ssl._create_default_https_context = ssl._create_unverified_context

# Add project root to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE_DIR, "backend"))

TURSO_HOST = "create-school-fee-db-vijayapathikonda.aws-ap-south-1.turso.io"
TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTAxNTU0MjgsImlkIjoiMDFhMGNkOTMtNWEwMS03MzZkLWE0NGItYzNhNTYyMTg1Mjg2Iiwia2lkIjoiUDl2d2pKT3lHQlByU3FGNWNRd1pEWEZsOWdtUE9pNFljczJlZ3piNjZDUSIsInJpZCI6IjY3MWVjMjgzLTk0OTctNGM4MS1hOGZkLTM5YjhjODQ4OTc5YyJ9.2-CKzuTXiAp-d5LqaCV5ZjYJ2fQm2GfOhwV8DxPHC1zwAmUvqXg3MdFWNqzkNUysjBv6gj7q1SsnOv0g9CbtAQ"
PIPELINE_URL = f"https://{TURSO_HOST}/v2/pipeline"

def query_turso(sql: str, args: list = None):
    stmt = {"sql": sql}
    if args:
        stmt["args"] = [{"type": "text", "value": str(a)} for a in args]
    payload = {"requests": [{"type": "execute", "stmt": stmt}]}
    res = requests.post(
        PIPELINE_URL,
        headers={"Authorization": f"Bearer {TURSO_TOKEN}", "Content-Type": "application/json"},
        json=payload,
        timeout=30,
        verify=False
    )
    if res.status_code != 200:
        raise Exception(f"Turso Error: {res.text}")
    data = res.json()
    item = data.get("results", [])[0]
    if item.get("type") == "error":
        raise Exception(item.get("error", {}).get("message"))
    result = item.get("response", {}).get("result", {})
    cols = [c["name"] for c in result.get("cols", [])]
    rows = []
    for r in result.get("rows", []):
        row_dict = {}
        for idx, col in enumerate(cols):
            row_dict[col] = r[idx].get("value")
        rows.append(row_dict)
    return rows

def execute_turso_update(sql: str, args: list = None):
    stmt = {"sql": sql}
    if args:
        stmt["args"] = [{"type": "text", "value": str(a)} for a in args]
    payload = {"requests": [{"type": "execute", "stmt": stmt}]}
    res = requests.post(
        PIPELINE_URL,
        headers={"Authorization": f"Bearer {TURSO_TOKEN}", "Content-Type": "application/json"},
        json=payload,
        timeout=30,
        verify=False
    )
    return res.status_code == 200

def get_gdrive_service(refresh_token: str, client_id: str, client_secret: str):
    import httplib2
    import google_auth_httplib2
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    credentials = Credentials(
        None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=["https://www.googleapis.com/auth/drive"]
    )
    http = httplib2.Http(ca_certs=certifi.where(), disable_ssl_certificate_validation=True)
    authorized_http = google_auth_httplib2.AuthorizedHttp(credentials, http=http)
    return build("drive", "v3", http=authorized_http, cache_discovery=False)

def get_or_create_folder(service, folder_name: str) -> str:
    query = f"name = '{folder_name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    res = service.files().list(q=query, spaces="drive", fields="files(id, name)").execute()
    files = res.get("files", [])
    if files:
        return files[0]["id"]
    file_metadata = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder"
    }
    folder = service.files().create(body=file_metadata, fields="id").execute()
    return folder.get("id")

def upload_pdf_to_gdrive(service, filepath: str, filename: str, folder_id: str) -> str:
    from googleapiclient.http import MediaFileUpload
    media = MediaFileUpload(filepath, mimetype="application/pdf", resumable=True)
    body = {"name": filename, "parents": [folder_id]}
    f = service.files().create(body=body, media_body=media, fields="id, webViewLink").execute()
    file_id = f.get("id")
    # Make readable by anyone with link
    try:
        service.permissions().create(fileId=file_id, body={"type": "anyone", "role": "reader"}).execute()
    except Exception:
        pass
    return f"https://drive.google.com/uc?export=download&id={file_id}"

def run_regeneration(refresh_token: str):
    client_secret_path = os.path.join(BASE_DIR, "client_secret.json")
    with open(client_secret_path, "r") as f:
        cs_data = json.load(f)["installed"]
    client_id = cs_data["client_id"]
    client_secret = cs_data["client_secret"]

    print(f"[*] Initializing Google Drive connection...")
    service = get_gdrive_service(refresh_token, client_id, client_secret)
    folder_id = get_or_create_folder(service, "Pragathi_Fee_Receipts")
    print(f"[+] Google Drive folder 'Pragathi_Fee_Receipts' ready (ID: {folder_id})")

    # Fetch all receipts
    receipts = query_turso("""
        SELECT r.id, r.receipt_number, r.total_amount, r.created_at, r.transaction_reference,
               s.admission_number, s.first_name, s.last_name, g.name as grade_name,
               pm.name as payment_mode_name
        FROM fee_receipts r
        JOIN students s ON r.student_id = s.id
        LEFT JOIN grades g ON s.grade_id = g.id
        LEFT JOIN payment_modes pm ON r.payment_mode_id = pm.id
        ORDER BY r.id ASC;
    """)

    print(f"[*] Found {len(receipts)} receipts to generate and upload...")

    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors

    logo_path = os.path.join(BASE_DIR, "backend", "app", "assets", "logo.jpeg")

    def draw_receipt_slip(c, receipt, student_name, admission_number, slip_title, slip_badge_bg, x0, y0, width, height):
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

        # Logo
        text_x = x0 + 14
        if os.path.exists(logo_path):
            try:
                c.drawImage(logo_path, x0 + 12, header_y + 7, width=40, height=40, preserveAspectRatio=True, mask="auto")
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

        # Slip Copy Badge
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

        # Metadata Section
        meta_top = header_y - 8
        meta_h = 48
        meta_y = meta_top - meta_h

        c.setFillColor(colors.HexColor("#ffffff"))
        c.setStrokeColor(colors.HexColor("#e2e8f0"))
        c.rect(x0 + 12, meta_y, width - 24, meta_h, stroke=1, fill=1)

        receipt_date = receipt.created_at.strftime("%d-%b-%Y") if getattr(receipt, "created_at", None) else datetime.now().strftime("%d-%b-%Y")
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

        # Total Box
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

        # Discount note
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

        # Footer signatures
        c.setStrokeColor(colors.HexColor("#94a3b8"))
        c.setLineWidth(0.6)
        c.line(x0 + width - 135, footer_y + 14, x0 + width - 16, footer_y + 14)

        c.setFillColor(colors.HexColor("#475569"))
        c.setFont("Helvetica-Bold", 7.5)
        c.drawCentredString(x0 + width - 75, footer_y + 4, "Authorized Signatory / Cashier")

        c.setFillColor(colors.HexColor("#64748b"))
        c.setFont("Helvetica-Oblique", 7.5)
        c.drawString(x0 + 14, footer_y + 4, "Computer generated receipt • Pragathi Vidyalaya Challakere")

        c.restoreState()

    def draw_scissor_divider(c, page_w, cut_y):
        c.saveState()
        c.setStrokeColor(colors.HexColor("#64748b"))
        c.setDash(5, 4)
        c.setLineWidth(1)
        c.line(18, cut_y, page_w - 18, cut_y)

        pill_w = 250
        pill_h = 14
        pill_x = (page_w - pill_w) / 2.0
        pill_y = cut_y - (pill_h / 2.0)
        c.setDash()
        c.setFillColor(colors.white)
        c.rect(pill_x, pill_y, pill_w, pill_h, stroke=0, fill=1)

        c.setFillColor(colors.HexColor("#334155"))
        c.setFont("ZapfDingbats", 12)
        c.drawString(24, cut_y - 4, chr(34))
        c.drawString(pill_x + 6, cut_y - 4, chr(34))
        c.drawString(pill_x + pill_w - 18, cut_y - 4, chr(34))

        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(page_w / 2.0, cut_y - 3, "CUT HERE  •  TOP: PARENT SLIP  |  BOTTOM: SCHOOL SLIP")
        c.restoreState()

    uploads_dir = os.path.join(BASE_DIR, "uploads", "receipts")
    os.makedirs(uploads_dir, exist_ok=True)

    success_count = 0
    for r in receipts:
        rid = r["id"]
        rec_num = r["receipt_number"]
        amt = r["total_amount"]
        dt_str = r["created_at"]
        adm_no = r["admission_number"]
        st_name = f"{r['first_name']} {r['last_name'] or ''}".strip()
        gr_name = r["grade_name"] or ""
        pm_name = r["payment_mode_name"] or "Cash"

        # Fetch items
        items_data = query_turso(f"""
            SELECT pi.amount_paid, fa.description, fc.name as cat_name, fa.base_amount, fa.discount_amount, fa.net_amount, dt.name as discount_name
            FROM fee_payment_items pi
            JOIN fee_assignments fa ON pi.fee_assignment_id = fa.id
            LEFT JOIN fee_categories fc ON fa.fee_category_id = fc.id
            LEFT JOIN discount_types dt ON fa.discount_type_id = dt.id
            WHERE pi.receipt_id = {rid};
        """)

        # Build mock receipt object
        class MockItem:
            def __init__(self, d):
                self.amount_paid = Decimal(str(d["amount_paid"]))
                class MockFA:
                    pass
                fa = MockFA()
                fa.description = d["description"]
                fa.base_amount = Decimal(str(d["base_amount"])) if d.get("base_amount") is not None else None
                fa.discount_amount = Decimal(str(d["discount_amount"])) if d.get("discount_amount") is not None else None
                fa.net_amount = Decimal(str(d["net_amount"])) if d.get("net_amount") is not None else None
                class MockCat:
                    pass
                cat = MockCat()
                cat.name = d["cat_name"] or "Standard"
                fa.fee_category = cat
                if d.get("discount_name"):
                    class MockDisc:
                        pass
                    disc = MockDisc()
                    disc.name = d["discount_name"]
                    fa.discount_type = disc
                else:
                    fa.discount_type = None
                self.fee_assignment = fa

        class MockReceipt:
            def __init__(self):
                self.receipt_number = rec_num
                self.total_amount = Decimal(str(amt))
                self.status = "SUCCESS"
                self.created_at = datetime.fromisoformat(dt_str) if dt_str else datetime.now()
                self.transaction_reference = r.get("transaction_reference")
                class MockMode:
                    pass
                pm = MockMode()
                pm.name = pm_name
                self.payment_mode = pm
                class MockStu:
                    pass
                stu = MockStu()
                class MockGr:
                    pass
                gr = MockGr()
                gr.name = gr_name
                stu.grade = gr
                self.student = stu
                self.items = [MockItem(it) for it in items_data]

        mock_receipt = MockReceipt()
        filename = f"{rec_num}_{uuid.uuid4().hex[:6]}.pdf"
        filepath = os.path.join(uploads_dir, filename)

        # Generate PDF using canvas
        c = canvas.Canvas(filepath, pagesize=A4)
        page_w, page_h = A4
        c.setTitle(f"Fee_Receipt_{rec_num}")
        margin_x = 20
        slip_w = page_w - (margin_x * 2)
        slip_h = 386
        cut_y = page_h / 2.0

        draw_receipt_slip(
            c=c, receipt=mock_receipt, student_name=st_name, admission_number=adm_no,
            slip_title="PARENT SLIP", slip_badge_bg="#4f46e5",
            x0=margin_x, y0=cut_y + 14, width=slip_w, height=slip_h
        )
        draw_scissor_divider(c=c, page_w=page_w, cut_y=cut_y)
        draw_receipt_slip(
            c=c, receipt=mock_receipt, student_name=st_name, admission_number=adm_no,
            slip_title="SCHOOL SLIP", slip_badge_bg="#059669",
            x0=margin_x, y0=20, width=slip_w, height=slip_h
        )
        c.showPage()
        c.save()

        # Upload to Google Drive
        download_url = upload_pdf_to_gdrive(service, filepath, filename, folder_id)

        # Update Turso DB
        update_sql = f"UPDATE fee_receipts SET pdf_path = '{download_url}' WHERE id = {rid};"
        execute_turso_update(update_sql)

        success_count += 1
        print(f"[{success_count}/{len(receipts)}] {rec_num} ({st_name}) -> Uploaded to GDrive & Updated DB")

    print(f"\n[DONE] Successfully regenerated and uploaded all {success_count} fee receipts to 'Pragathi_Fee_Receipts' folder in Google Drive!")

if __name__ == "__main__":
    token = sys.argv[1] if len(sys.argv) > 1 else None
    if not token:
        token = input("Enter your GDRIVE_REFRESH_TOKEN: ").strip()
    if not token:
        print("Error: Refresh token required.")
        sys.exit(1)
    run_regeneration(token)
