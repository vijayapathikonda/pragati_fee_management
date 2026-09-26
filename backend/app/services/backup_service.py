import io
import os
import json
import time
import zipfile
import threading
from datetime import datetime, date, timezone
from decimal import Decimal
from typing import Dict, Any, Optional, Tuple
from sqlalchemy import text, inspect
from sqlalchemy.orm import Session
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from loguru import logger

from app.infrastructure.database import SessionLocal
from app.services.gdrive_service import gdrive_service
from app.services.settings_service import SettingsService
from app.domain.student_models import Student
from app.domain.fee_models import FeeAssignment, FeeReceipt, FeePaymentItem
from app.domain.master_models import AcademicYear, Grade, Section, FeeCategory, DiscountType, PaymentMode

BACKUP_TABLES_ORDER = [
    "academic_years",
    "grades",
    "sections",
    "fee_categories",
    "discount_types",
    "payment_modes",
    "roles",
    "users",
    "user_role",
    "system_settings",
    "students",
    "fee_assignments",
    "fee_receipts",
    "fee_payment_items",
]


def _serialize_val(val: Any) -> Any:
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, Decimal):
        return float(val)
    if hasattr(val, "value"):
        return val.value
    return val


def _sql_literal(val: Any) -> str:
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "1" if val else "0"
    if isinstance(val, (int, float, Decimal)):
        return str(val)
    if isinstance(val, (datetime, date)):
        return f"'{val.isoformat()}'"
    s = str(val).replace("'", "''")
    return f"'{s}'"


class BackupService:
    _lock = threading.Lock()
    _scheduler_started = False

    @classmethod
    def get_backup_config(cls, db: Session) -> Dict[str, Any]:
        raw = SettingsService.get_settings_by_group(db, "backup")
        return {
            "auto_backup_enabled": raw.get("auto_backup_enabled", "true").lower() == "true",
            "interval_hours": int(raw.get("interval_hours", "24") or 24),
            "max_backups_to_keep": int(raw.get("max_backups_to_keep", "30") or 30),
            "backup_folder_name": raw.get("backup_folder_name", "Pragathi_DB_Backups") or "Pragathi_DB_Backups",
            "last_backup_at": raw.get("last_backup_at", ""),
            "last_backup_epoch": int(raw.get("last_backup_epoch", "0") or 0),
            "last_backup_filename": raw.get("last_backup_filename", ""),
            "last_backup_url": raw.get("last_backup_url", ""),
            "last_excel_url": raw.get("last_excel_url", ""),
            "last_backup_status": raw.get("last_backup_status", "Never run"),
            "last_backup_trigger": raw.get("last_backup_trigger", ""),
            "gdrive_configured": gdrive_service.is_configured,
            "gdrive_auth_type": getattr(gdrive_service, "_auth_type", "none"),
        }

    @classmethod
    def generate_sql_and_json_dump(cls, db: Session) -> Tuple[str, str, Dict[str, int]]:
        """
        Exports all database tables into portable SQL INSERT statements and a structured JSON snapshot.
        Works across Turso (libSQL), SQLite, and MySQL.
        """
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        sql_lines = [
            f"-- Pragathi Vidyalaya School Fee Management Database Backup",
            f"-- Generated at: {now_str}",
            "PRAGMA foreign_keys = OFF;",
            "",
        ]
        json_dump: Dict[str, Any] = {
            "generated_at": now_str,
            "tables": {},
            "row_counts": {},
        }
        row_counts: Dict[str, int] = {}

        inspector = inspect(db.get_bind())
        existing_tables = set(inspector.get_table_names())

        for table_name in BACKUP_TABLES_ORDER:
            if table_name not in existing_tables:
                continue
            try:
                res = db.execute(text(f"SELECT * FROM {table_name}"))
                columns = list(res.keys())
                rows = res.fetchall()
                row_counts[table_name] = len(rows)
                table_records = []

                sql_lines.append(f"-- Table: {table_name} ({len(rows)} rows)")
                if rows:
                    col_list_sql = ", ".join(f'"{c}"' for c in columns)
                    for row in rows:
                        row_dict = {col: _serialize_val(val) for col, val in zip(columns, row)}
                        table_records.append(row_dict)
                        vals_sql = ", ".join(_sql_literal(val) for val in row)
                        sql_lines.append(f"INSERT OR REPLACE INTO {table_name} ({col_list_sql}) VALUES ({vals_sql});")
                sql_lines.append("")
                json_dump["tables"][table_name] = table_records
            except Exception as err:
                logger.warning(f"Skipping table {table_name} during backup dump: {err}")

        sql_lines.append("PRAGMA foreign_keys = ON;")
        json_dump["row_counts"] = row_counts
        return "\n".join(sql_lines), json.dumps(json_dump, indent=2), row_counts

    @classmethod
    def generate_excel_snapshot(cls, db: Session) -> bytes:
        """
        Generates a human-readable multi-sheet Excel (.xlsx) workbook of all Students,
        Fee Assignments, Payment Receipts, and Master Data.
        """
        wb = Workbook()
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")

        def style_sheet_header(ws, headers):
            ws.append(headers)
            for col_num in range(1, len(headers) + 1):
                cell = ws.cell(row=1, column=col_num)
                cell.font = header_font
                cell.fill = header_fill

        # 1. Students Sheet
        ws_students = wb.active
        ws_students.title = "Students"
        style_sheet_header(ws_students, [
            "ID", "Serial No", "Admission No", "Student Name", "DOB", "Gender",
            "Grade", "Section", "Academic Year", "Father Name", "Father Contact",
            "Mother Name", "Mother Contact", "Primary Contact", "Address", "Status"
        ])
        students = db.query(Student).order_by(Student.grade_id.asc(), Student.serial_number.asc(), Student.id.asc()).all()
        for s in students:
            ws_students.append([
                s.id,
                s.serial_number,
                s.admission_number,
                f"{s.first_name} {s.last_name or ''}".strip(),
                str(s.date_of_birth) if s.date_of_birth else "",
                s.gender or "",
                s.grade.name if s.grade else "",
                s.section.name if s.section else "",
                s.academic_year.name if s.academic_year else "",
                s.father_name or "",
                s.father_contact_number or "",
                s.mother_name or "",
                s.mother_contact_number or "",
                s.contact_number or "",
                s.address or "",
                s.status.value if hasattr(s.status, "value") else str(s.status or ""),
            ])

        # 2. Fee Assignments Sheet
        ws_fees = wb.create_sheet(title="Fee_Assignments")
        style_sheet_header(ws_fees, [
            "Assignment ID", "Admission No", "Student Name", "Grade", "Academic Year",
            "Fee Category", "Description", "Base Amount", "Discount Type",
            "Discount Amount", "Net Amount", "Paid Amount", "Balance Due", "Status", "Due Date"
        ])
        assignments = db.query(FeeAssignment).order_by(FeeAssignment.id.asc()).all()
        for a in assignments:
            stu = a.student
            net_val = float(a.net_amount or 0)
            paid_val = float(a.paid_amount or 0)
            ws_fees.append([
                a.id,
                stu.admission_number if stu else "",
                f"{stu.first_name} {stu.last_name or ''}".strip() if stu else "",
                stu.grade.name if (stu and stu.grade) else "",
                a.academic_year.name if a.academic_year else "",
                a.fee_category.name if a.fee_category else "",
                a.description or "",
                float(a.base_amount or 0),
                a.discount_type.name if a.discount_type else "None",
                float(a.discount_amount or 0),
                net_val,
                paid_val,
                round(net_val - paid_val, 2),
                a.status.value if hasattr(a.status, "value") else str(a.status or ""),
                str(a.due_date) if a.due_date else "",
            ])

        # 3. Fee Receipts Sheet
        ws_receipts = wb.create_sheet(title="Payment_Receipts")
        style_sheet_header(ws_receipts, [
            "Receipt ID", "Receipt Number", "Date", "Admission No", "Student Name",
            "Grade", "Mother Contact", "Payment Mode", "Transaction Ref",
            "Amount Paid", "Status", "Cancellation Reason"
        ])
        receipts = db.query(FeeReceipt).order_by(FeeReceipt.id.desc()).all()
        for r in receipts:
            stu = r.student
            ws_receipts.append([
                r.id,
                r.receipt_number,
                r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else "",
                stu.admission_number if stu else "",
                f"{stu.first_name} {stu.last_name or ''}".strip() if stu else "",
                stu.grade.name if (stu and stu.grade) else "",
                stu.mother_contact_number if stu else "",
                r.payment_mode.name if r.payment_mode else "",
                r.transaction_reference or "",
                float(r.total_amount or 0),
                r.status.value if hasattr(r.status, "value") else str(r.status or ""),
                r.cancellation_reason or "",
            ])

        # 4. Masters Sheet
        ws_masters = wb.create_sheet(title="Masters_Config")
        style_sheet_header(ws_masters, ["Master Type", "ID", "Name / Title", "Details / Amount / Percentage", "Active"])
        for ay in db.query(AcademicYear).all():
            ws_masters.append(["Academic Year", ay.id, ay.name, f"{ay.start_date} to {ay.end_date}", bool(getattr(ay, "is_active", True))])
        for g in db.query(Grade).all():
            ws_masters.append(["Grade", g.id, g.name, getattr(g, "description", "") or "", True])
        for s_sec in db.query(Section).all():
            ws_masters.append(["Section", s_sec.id, s_sec.name, getattr(s_sec, "description", "") or "", True])
        for fc in db.query(FeeCategory).all():
            ws_masters.append(["Fee Category", fc.id, fc.name, getattr(fc, "description", "") or "", bool(getattr(fc, "is_active", True))])
        for dt in db.query(DiscountType).all():
            ws_masters.append(["Discount Type", dt.id, dt.name, f"{getattr(dt, 'percentage', 0)}% / Flat ₹{getattr(dt, 'flat_amount', 0)}", bool(getattr(dt, "is_active", True))])
        for pm in db.query(PaymentMode).all():
            ws_masters.append(["Payment Mode", pm.id, pm.name, getattr(pm, "description", "") or "", bool(getattr(pm, "is_active", True))])

        excel_buf = io.BytesIO()
        wb.save(excel_buf)
        return excel_buf.getvalue()

    @classmethod
    def create_full_backup_zip_bytes(cls, db: Session, include_uploads: bool = True) -> Tuple[bytes, bytes, Dict[str, int], str]:
        """
        Creates an in-memory ZIP archive containing:
        - database_dump.sql (Full SQL restore script)
        - database_snapshot.json (Full JSON snapshot)
        - school_data_workbook.xlsx (Multi-sheet Excel report)
        - uploads/ (Receipts & Student Photos if present)
        Returns (zip_bytes, excel_bytes, row_counts, timestamp_label)
        """
        ts_label = datetime.now().strftime("%Y-%m-%d_%H%M%S")
        sql_text, json_text, row_counts = cls.generate_sql_and_json_dump(db)
        excel_bytes = cls.generate_excel_snapshot(db)

        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr(f"pragathi_db_dump_{ts_label}.sql", sql_text.encode("utf-8"))
            zf.writestr(f"pragathi_db_snapshot_{ts_label}.json", json_text.encode("utf-8"))
            zf.writestr(f"pragathi_school_data_{ts_label}.xlsx", excel_bytes)

            if include_uploads and os.path.exists("uploads"):
                for root, _dirs, files in os.walk("uploads"):
                    if "temp" in root:
                        continue
                    for file in files:
                        if file.startswith("."):
                            continue
                        file_path = os.path.join(root, file)
                        arcname = os.path.join("uploads", os.path.relpath(file_path, "uploads"))
                        try:
                            zf.write(file_path, arcname)
                        except Exception:
                            pass

        return zip_buf.getvalue(), excel_bytes, row_counts, ts_label

    @classmethod
    def backup_to_google_drive(cls, db: Session, trigger: str = "manual") -> Dict[str, Any]:
        """
        Generates the full DB backup (.zip + .xlsx) and uploads it to Google Drive.
        """
        if not cls._lock.acquire(blocking=False):
            return {
                "success": False,
                "message": "A backup is already in progress.",
            }

        try:
            config = cls.get_backup_config(db)
            folder_name = config.get("backup_folder_name") or "Pragathi_DB_Backups"
            max_keep = config.get("max_backups_to_keep") or 30

            zip_bytes, excel_bytes, row_counts, ts_label = cls.create_full_backup_zip_bytes(db, include_uploads=True)
            zip_filename = f"Pragathi_DB_Backup_{ts_label}.zip"
            excel_filename = f"Pragathi_School_Data_{ts_label}.xlsx"

            if not gdrive_service.is_configured:
                # Save locally in uploads/backups if Google Drive credentials aren't configured yet
                local_backup_dir = os.path.join("uploads", "backups")
                os.makedirs(local_backup_dir, exist_ok=True)
                local_zip_path = os.path.join(local_backup_dir, zip_filename)
                with open(local_zip_path, "wb") as f:
                    f.write(zip_bytes)

                now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                SettingsService.bulk_update(db, "backup", {
                    "last_backup_at": now_iso,
                    "last_backup_epoch": str(int(time.time())),
                    "last_backup_filename": zip_filename,
                    "last_backup_status": "Saved Locally (Google Drive credentials not configured)",
                    "last_backup_trigger": trigger,
                })
                return {
                    "success": False,
                    "saved_locally": True,
                    "filename": zip_filename,
                    "row_counts": row_counts,
                    "message": "Backup saved locally on server, but Google Drive is not configured yet. Please set Google Drive credentials in Render Environment Variables.",
                }

            # 1. Upload Full ZIP Backup (SQL + JSON + Excel + Uploads)
            zip_upload = gdrive_service.upload_file_bytes(
                file_bytes=zip_bytes,
                filename=zip_filename,
                mime_type="application/zip",
                folder_name=folder_name,
                make_public=False,
            )

            # 2. Upload Standalone Excel Workbook for instant viewing in Google Drive / Sheets
            excel_upload = gdrive_service.upload_file_bytes(
                file_bytes=excel_bytes,
                filename=excel_filename,
                mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                folder_name=folder_name,
                make_public=False,
            )

            if not zip_upload:
                raise RuntimeError("Google Drive upload returned empty response.")

            # 3. Rotate old backups in Google Drive if exceeding max_keep * 2 (zip + xlsx pairs)
            try:
                existing_files = gdrive_service.list_folder_files(folder_name=folder_name, limit=100)
                max_files = max(10, max_keep * 2)
                if len(existing_files) > max_files:
                    for old_file in existing_files[max_files:]:
                        if old_file.get("file_id"):
                            gdrive_service.delete_file(old_file["file_id"])
            except Exception as rot_err:
                logger.warning(f"Backup rotation warning: {rot_err}")

            now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            SettingsService.bulk_update(db, "backup", {
                "last_backup_at": now_iso,
                "last_backup_epoch": str(int(time.time())),
                "last_backup_filename": zip_filename,
                "last_backup_url": zip_upload.get("view_url", ""),
                "last_excel_url": excel_upload.get("view_url", "") if excel_upload else "",
                "last_backup_status": f"Success ({row_counts.get('students', 0)} students, {row_counts.get('fee_assignments', 0)} fees, {row_counts.get('fee_receipts', 0)} receipts)",
                "last_backup_trigger": trigger,
            })

            logger.info(f"Database backup uploaded to Google Drive folder '{folder_name}': {zip_filename}")
            return {
                "success": True,
                "filename": zip_filename,
                "excel_filename": excel_filename,
                "view_url": zip_upload.get("view_url"),
                "download_url": zip_upload.get("download_url"),
                "excel_view_url": excel_upload.get("view_url") if excel_upload else None,
                "row_counts": row_counts,
                "last_backup_at": now_iso,
                "message": f"Full Database Backup ({zip_filename} & {excel_filename}) uploaded to Google Drive folder '{folder_name}'!",
            }
        except Exception as e:
            logger.error(f"Google Drive DB backup failed: {e}")
            try:
                SettingsService.bulk_update(db, "backup", {
                    "last_backup_status": f"Failed: {str(e)[:120]}",
                    "last_backup_trigger": trigger,
                })
            except Exception:
                pass
            return {
                "success": False,
                "message": f"Backup failed: {str(e)}",
            }
        finally:
            cls._lock.release()

    @classmethod
    def start_periodic_scheduler(cls):
        """
        Starts a lightweight daemon thread on server startup that checks periodically
        whether a scheduled daily Google Drive database backup is due.
        """
        if cls._scheduler_started:
            return
        cls._scheduler_started = True

        def _scheduler_loop():
            # Initial delay of 45 seconds after server startup so startup is fast
            time.sleep(45)
            while True:
                db = SessionLocal()
                try:
                    cfg = cls.get_backup_config(db)
                    if cfg.get("auto_backup_enabled", True) and gdrive_service.is_configured:
                        interval_sec = max(1, cfg.get("interval_hours", 24)) * 3600
                        last_epoch = cfg.get("last_backup_epoch", 0)
                        if (int(time.time()) - last_epoch) >= interval_sec:
                            logger.info("Scheduled daily Google Drive auto-backup is due. Starting backup...")
                            cls.backup_to_google_drive(db, trigger="scheduled_daily")
                except Exception as err:
                    logger.warning(f"Periodic backup scheduler check error: {err}")
                finally:
                    db.close()
                time.sleep(900)  # Check every 15 minutes

        t = threading.Thread(target=_scheduler_loop, daemon=True)
        t.start()
        logger.info("Automatic daily Google Drive DB Backup scheduler initialized.")
