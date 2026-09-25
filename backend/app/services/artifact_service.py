import os
import zipfile
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional

# Determine Documents directory across both Docker container and host environments
POSSIBLE_PATHS = [
    "/app/Documents",
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "Documents"),
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "Documents"),
    "Documents"
]

DOCUMENTS_DIR = None
for p in POSSIBLE_PATHS:
    if os.path.isdir(p):
        DOCUMENTS_DIR = os.path.abspath(p)
        break

if not DOCUMENTS_DIR:
    DOCUMENTS_DIR = os.path.abspath("Documents")

ARTIFACT_CATALOG = [
    {
        "id": "study-certificate",
        "title": "Study Certificate",
        "category": "Student Certificates",
        "filename": "Study Certificate Formate.docx",
        "description": "Official study, caste, and character certificate for academic verification and admissions.",
        "icon": "School",
        "type": "student",
        "fields": [
            {"key": "student_name", "label": "Student Name (Kum / Chi)", "type": "text"},
            {"key": "parent_name", "label": "Son / Daughter of", "type": "text"},
            {"key": "admission_no", "label": "Admission No", "type": "text"},
            {"key": "grade_from", "label": "Studied From Class", "type": "text"},
            {"key": "grade_to", "label": "Studied To Class", "type": "text"},
            {"key": "academic_years", "label": "Academic Years", "type": "text"},
            {"key": "caste", "label": "Caste / Religion", "type": "text"},
            {"key": "mother_tongue", "label": "Mother Tongue", "type": "text"},
            {"key": "dob", "label": "Date of Birth", "type": "text"},
            {"key": "pen_no", "label": "UDISE+ PEN No", "type": "text"},
            {"key": "sts_no", "label": "STS No", "type": "text"},
            {"key": "issue_date", "label": "Issue Date", "type": "date"},
            {"key": "place", "label": "Place", "type": "text", "default": "Challakere"}
        ]
    },
    {
        "id": "transfer-certificate-request",
        "title": "Transfer Certificate (TC) Request Letter",
        "category": "Student Certificates",
        "filename": "Transfer Certificate requesting letter.docx",
        "description": "Formal requisition to previous school requesting TC, DISE code, and APAAR / PEN ID.",
        "icon": "SyncAlt",
        "type": "student",
        "fields": [
            {"key": "previous_school", "label": "To: Previous School Name & Address", "type": "textarea"},
            {"key": "student_name", "label": "Student Name", "type": "text"},
            {"key": "parent_name", "label": "Father / Mother Name", "type": "text"},
            {"key": "previous_class", "label": "Previous Class", "type": "text"},
            {"key": "previous_year", "label": "Previous Academic Year", "type": "text"},
            {"key": "current_class", "label": "Seeking Admission Class", "type": "text"},
            {"key": "current_year", "label": "Current Academic Year", "type": "text"},
            {"key": "issue_date", "label": "Date", "type": "date"}
        ]
    },
    {
        "id": "student-undertaking",
        "title": "Student Academic Undertaking",
        "category": "Student Certificates",
        "filename": "Student Undertaking.docx",
        "description": "Parental commitment undertaking for academic discipline, homework tracking, and PTM attendance.",
        "icon": "FactCheck",
        "type": "student",
        "fields": [
            {"key": "ref_no", "label": "Reference No", "type": "text"},
            {"key": "issue_date", "label": "Date", "type": "date"},
            {"key": "student_name", "label": "Student Name (Ward)", "type": "text"},
            {"key": "grade", "label": "Class / Grade", "type": "text"},
            {"key": "academic_year", "label": "Academic Year", "type": "text", "default": "2026-2027"},
            {"key": "father_name", "label": "Father Name", "type": "text"},
            {"key": "mother_name", "label": "Mother Name", "type": "text"}
        ]
    },
    {
        "id": "suspension-letter",
        "title": "Suspension Notice",
        "category": "Student Certificates",
        "filename": "Suspension Letter Formate.docx",
        "description": "Disciplinary suspension letter issued to parents citing conduct in school or transport.",
        "icon": "Warning",
        "type": "student",
        "fields": [
            {"key": "parent_name", "label": "To: Parents of", "type": "text"},
            {"key": "student_name", "label": "Student Name", "type": "text"},
            {"key": "grade", "label": "Class", "type": "text"},
            {"key": "days", "label": "Suspension Period (e.g. 1 day)", "type": "text", "default": "1 day"},
            {"key": "suspension_date", "label": "Suspension Effective Date", "type": "date"},
            {"key": "reason", "label": "Reason / Incident", "type": "textarea", "default": "misbehaviour both in classroom and School bus"},
            {"key": "report_date", "label": "Report Back Date", "type": "date"},
            {"key": "report_time", "label": "Report Back Time", "type": "text", "default": "09:00 AM"},
            {"key": "issue_date", "label": "Notice Date", "type": "date"}
        ]
    },
    {
        "id": "hall-ticket",
        "title": "Examination Hall Ticket",
        "category": "Student Certificates",
        "filename": "Hall ticket.docx",
        "description": "Student examination hall ticket with subject schedule, marks, and invigilator sign blocks.",
        "icon": "FactCheck",
        "type": "student",
        "fields": [
            {"key": "exam_name", "label": "Examination Name", "type": "text", "default": "Quarterly Examination"},
            {"key": "academic_year", "label": "Academic Year", "type": "text", "default": "2026-2027"},
            {"key": "student_name", "label": "Student Name", "type": "text"},
            {"key": "father_name", "label": "Father Name", "type": "text"},
            {"key": "grade", "label": "Class / Grade", "type": "text"},
            {"key": "admission_no", "label": "Admission No", "type": "text"}
        ]
    },
    {
        "id": "appointment-letter",
        "title": "Teacher Appointment Letter",
        "category": "Staff & Teachers",
        "filename": "Appointment letter.docx",
        "description": "Formal appointment contract letter for teaching and assistant teaching faculty.",
        "icon": "Badge",
        "type": "staff",
        "fields": [
            {"key": "teacher_name", "label": "Candidate Name (Mr / Ms)", "type": "text"},
            {"key": "address", "label": "Address / Place", "type": "text", "default": "Challakere"},
            {"key": "designation", "label": "Designation (Teacher / Asst. Teacher)", "type": "text", "default": "Teacher"},
            {"key": "subject", "label": "Subject / Department", "type": "text"},
            {"key": "salary", "label": "Salary / Remuneration Details", "type": "text"},
            {"key": "joining_date", "label": "Reporting / Joining Date", "type": "date"},
            {"key": "issue_date", "label": "Letter Date", "type": "date"}
        ]
    },
    {
        "id": "joining-letter",
        "title": "Staff Joining Letter",
        "category": "Staff & Teachers",
        "filename": "joining letter.docx",
        "description": "Offer acceptance and joining confirmation letter submitted by incoming faculty.",
        "icon": "AssignmentTurnedIn",
        "type": "staff",
        "fields": [
            {"key": "teacher_name", "label": "Candidate Name", "type": "text"},
            {"key": "position", "label": "Position / Teacher Type (e.g. TGT/PRT)", "type": "text", "default": "TGT Teacher"},
            {"key": "subject", "label": "Subject (e.g. English, Science)", "type": "text"},
            {"key": "joining_date", "label": "Joining Date", "type": "date"},
            {"key": "issue_date", "label": "Letter Date", "type": "date"}
        ]
    },
    {
        "id": "experience-certificate",
        "title": "Experience Certificate",
        "category": "Staff & Teachers",
        "filename": "Experience Certificate.docx",
        "description": "Official experience credential certifying tenure, subjects, and conduct of faculty.",
        "icon": "WorkspacePremium",
        "type": "staff",
        "fields": [
            {"key": "teacher_name", "label": "Teacher Name (Mrs / Ms / Mr)", "type": "text"},
            {"key": "relation_name", "label": "Wife / Son / Daughter of", "type": "text"},
            {"key": "from_date", "label": "Service From Date", "type": "date"},
            {"key": "to_date", "label": "Service To Date", "type": "date"},
            {"key": "designation", "label": "Designation (e.g. TGT Mathematics)", "type": "text"},
            {"key": "classes_taught", "label": "Classes Taught (e.g. 6 to 10)", "type": "text", "default": "Class 1 to 10"},
            {"key": "issue_date", "label": "Issue Date", "type": "date"}
        ]
    },
    {
        "id": "teachers-undertaking",
        "title": "Teacher Service Undertaking",
        "category": "Staff & Teachers",
        "filename": "Teachers Undertaking Letter.docx",
        "description": "Faculty service commitment assuring completion of the full academic year without mid-term disruption.",
        "icon": "Handshake",
        "type": "staff",
        "fields": [
            {"key": "teacher_name", "label": "Teacher Name", "type": "text"},
            {"key": "cadre", "label": "Cadre (TGT / PRT / NTT)", "type": "text", "default": "TGT"},
            {"key": "subject", "label": "Subject", "type": "text"},
            {"key": "service_till_date", "label": "Continue Service Till", "type": "text", "default": "completion of Academic year"},
            {"key": "academic_year", "label": "Current Academic Year", "type": "text", "default": "2026-27"},
            {"key": "next_academic_year", "label": "Next Academic Year", "type": "text", "default": "2027-28"},
            {"key": "issue_date", "label": "Date", "type": "date"}
        ]
    },
    {
        "id": "original-marks-card-noc",
        "title": "Original Documents & Staff NOC",
        "category": "Administrative",
        "filename": "Original Marks card collection.docx",
        "description": "Staff document submission acknowledgement and multi-department NOC clearance form.",
        "icon": "FolderShared",
        "type": "admin",
        "fields": [
            {"key": "staff_name", "label": "Staff / Teacher Name", "type": "text"},
            {"key": "designation", "label": "Designation", "type": "text"},
            {"key": "date_of_joining", "label": "Date of Joining", "type": "date"},
            {"key": "date_of_leaving", "label": "Date of Leaving (for NOC)", "type": "date"},
            {"key": "doc_1", "label": "Document 1", "type": "text", "default": "SSLC / 10th Marks Card"},
            {"key": "doc_2", "label": "Document 2", "type": "text", "default": "PUC / 12th Marks Card"},
            {"key": "doc_3", "label": "Document 3", "type": "text", "default": "Degree / Graduation Certificate"},
            {"key": "doc_4", "label": "Document 4", "type": "text", "default": "B.Ed / D.Ed Certificate"},
            {"key": "issue_date", "label": "Date", "type": "date"}
        ]
    }
]

class ArtifactService:
    @staticmethod
    def get_documents_dir() -> str:
        return DOCUMENTS_DIR

    @staticmethod
    def list_artifacts() -> List[Dict[str, Any]]:
        results = []
        for item in ARTIFACT_CATALOG:
            filepath = os.path.join(DOCUMENTS_DIR, item["filename"])
            exists = os.path.exists(filepath)
            size_bytes = os.path.getsize(filepath) if exists else 0
            results.append({
                **item,
                "file_exists": exists,
                "file_size": size_bytes
            })
        return results

    @staticmethod
    def get_artifact_by_id(artifact_id: str) -> Optional[Dict[str, Any]]:
        item = next((x for x in ARTIFACT_CATALOG if x["id"] == artifact_id), None)
        if not item:
            return None

        filepath = os.path.join(DOCUMENTS_DIR, item["filename"])
        content_text = ""
        paragraphs = []
        
        if os.path.exists(filepath):
            try:
                with zipfile.ZipFile(filepath) as z:
                    xml_content = z.read("word/document.xml")
                    tree = ET.fromstring(xml_content)
                    for p in tree.iter():
                        if p.tag.endswith('}p'):
                            t = "".join([node.text for node in p.iter() if node.tag.endswith('}t') and node.text]).strip()
                            if t:
                                cleaned = t.replace('\ufffd', '-').strip()
                                paragraphs.append(cleaned)
                    content_text = "\n\n".join(paragraphs)
            except Exception as e:
                content_text = f"Error reading document: {e}"

        return {
            **item,
            "filepath": filepath,
            "paragraphs": paragraphs,
            "raw_text": content_text
        }

    @staticmethod
    def get_artifact_filepath(artifact_id: str) -> Optional[str]:
        item = next((x for x in ARTIFACT_CATALOG if x["id"] == artifact_id), None)
        if not item:
            return None
        filepath = os.path.join(DOCUMENTS_DIR, item["filename"])
        return filepath if os.path.exists(filepath) else None
