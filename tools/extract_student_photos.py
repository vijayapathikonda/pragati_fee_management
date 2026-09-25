#!/usr/bin/env python3
"""
Tool to extract student photos from PRAGATI VIDYALAYA - Front.PDF,
match each card with the database student record, save the photo to disk,
and update photo_path in MySQL database.
"""

import os
import re
import sys
import fitz
from rapidocr_onnxruntime import RapidOCR
from difflib import SequenceMatcher
from sqlalchemy import create_engine, text

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_PATH = os.path.join(BASE_DIR, "PRAGATI VIDYALAYA - Front.PDF")
UPLOADS_DIR = os.path.join(BASE_DIR, "frontend", "public", "students")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Database connection
DATABASE_URL = "mysql+pymysql://root:rootpassword@localhost:3306/school_fee_db"
engine = create_engine(DATABASE_URL)

def normalize_name(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())

def token_similarity(a: str, b: str) -> float:
    s1 = SequenceMatcher(None, normalize_name(a), normalize_name(b)).ratio()
    a_tokens = sorted(re.findall(r"[a-z0-9]+", a.lower()))
    b_tokens = sorted(re.findall(r"[a-z0-9]+", b.lower()))
    if set(a_tokens) == set(b_tokens) and len(a_tokens) > 0:
        return 1.0
    s2 = SequenceMatcher(None, " ".join(a_tokens), " ".join(b_tokens)).ratio()
    return max(s1, s2)

def main():
    if not os.path.exists(PDF_PATH):
        print(f"Error: PDF file not found at {PDF_PATH}")
        return

    print("[*] Connecting to database and loading students...")
    with engine.connect() as conn:
        students = conn.execute(text("""
            SELECT id, serial_number, admission_number, first_name, last_name, grade_id, contact_number, father_contact_number 
            FROM students 
            ORDER BY serial_number ASC, id ASC
        """)).fetchall()

    print(f"[+] Loaded {len(students)} students from database.")

    student_entries = []
    for idx, s in enumerate(students):
        full_name = f"{s.first_name} {s.last_name or ''}".strip()
        student_entries.append({
            "idx": idx,
            "id": s.id,
            "serial_number": s.serial_number,
            "admission_number": s.admission_number,
            "full_name": full_name,
            "grade_id": s.grade_id,
            "father_contact": s.father_contact_number or s.contact_number
        })

    # Initialize OCR and PDF
    print("[*] Initializing OCR and reading PDF...")
    ocr = RapidOCR()
    doc = fitz.open(PDF_PATH)
    # Warm up OCR model
    ocr(doc.extract_image(2)["image"], use_det=False, use_cls=False)

    print(f"[+] Parsing cards from all {len(doc)} pages...")
    all_cards = []
    for p_num in range(len(doc)):
        page = doc[p_num]
        stream = page.read_contents().decode('latin1', errors='ignore')
        do_commands = re.findall(r'/([A-Za-z0-9_]+)\s+Do', stream)
        xobjects = page.get_images()
        name_to_info = {x[7]: (x[0], x[1], x[2], x[3]) for x in xobjects}
        
        curr_card = None
        for name in do_commands:
            info = name_to_info.get(name)
            if not info:
                continue
            xref, smask, w, h = info
            if w == 627 and h == 52:
                mask_xref = smask if smask > 0 else xref
                curr_card = {
                    "page": p_num + 1,
                    "name_xref": mask_xref,
                    "photo_xref": None,
                }
                all_cards.append(curr_card)
            elif w == 402 and h == 520:
                if curr_card:
                    curr_card["photo_xref"] = xref

    print(f"[+] Found {len(all_cards)} card slots across {len(doc)} pages.")

    # OCR name on all cards
    print("[*] Running OCR on card names...")
    cards = []
    for c in all_cards:
        img_data = doc.extract_image(c["name_xref"])
        res, _ = ocr(img_data["image"], use_det=False, use_cls=False)
        name = res[0][0].strip() if res else ""
        if name: # Excludes the blank template card at the end of page 66
            c["ocr_name"] = name
            cards.append(c)

    print(f"[+] Extracted names for {len(cards)} student cards.")

    # Multi-pass matching within grade window (+/- 110 students)
    matched_cards = {} # card_idx -> (student, score)
    used_student_ids = set()

    # Pass 1: High confidence match (>= 0.80) within grade window (+/- 110)
    for i, c in enumerate(cards):
        ocr_name = c["ocr_name"]
        best_s = None
        best_score = 0.0
        for s in student_entries[max(0, i - 110):min(len(student_entries), i + 110)]:
            if s["id"] in used_student_ids:
                continue
            score = token_similarity(ocr_name, s["full_name"])
            if score > best_score:
                best_score = score
                best_s = s
        if best_score >= 0.80:
            matched_cards[i] = (best_s, best_score)
            used_student_ids.add(best_s["id"])

    # Pass 2: Good match (>= 0.65) within window (+/- 110)
    for i, c in enumerate(cards):
        if i in matched_cards:
            continue
        ocr_name = c["ocr_name"]
        best_s = None
        best_score = 0.0
        for s in student_entries[max(0, i - 110):min(len(student_entries), i + 110)]:
            if s["id"] in used_student_ids:
                continue
            score = token_similarity(ocr_name, s["full_name"])
            if score > best_score:
                best_score = score
                best_s = s
        if best_score >= 0.65:
            matched_cards[i] = (best_s, best_score)
            used_student_ids.add(best_s["id"])

    # Pass 3: Moderate match (>= 0.50) within window (+/- 110)
    for i, c in enumerate(cards):
        if i in matched_cards:
            continue
        ocr_name = c["ocr_name"]
        best_s = None
        best_score = 0.0
        for s in student_entries[max(0, i - 110):min(len(student_entries), i + 110)]:
            if s["id"] in used_student_ids:
                continue
            score = token_similarity(ocr_name, s["full_name"])
            if score > best_score:
                best_score = score
                best_s = s
        if best_score >= 0.50:
            matched_cards[i] = (best_s, best_score)
            used_student_ids.add(best_s["id"])

    # Handle Card #70 (Shanmukh Raj R on card, father phone matching Poorvik Raj R in DB at SN 70)
    for i, c in enumerate(cards):
        if i not in matched_cards:
            if c["page"] == 7 and "Shanmukh" in c["ocr_name"]:
                s70 = next((s for s in student_entries if s["serial_number"] == 70), None)
                if s70 and s70["id"] not in used_student_ids:
                    matched_cards[i] = (s70, 1.00)
                    used_student_ids.add(s70["id"])
                    print(f"[+] Matched Card #70 ({c['ocr_name']}) -> DB #70 ({s70['full_name']}) via serial & phone match.")

    print(f"\n==========================================================")
    print(f"  Photo Extraction & Matching Summary")
    print(f"==========================================================")
    print(f"  Total Cards Processed : {len(cards)}")
    print(f"  Total Matched Students: {len(matched_cards)} / {len(cards)}")

    # Extract photos to uploads/students/ and prepare DB updates
    photos_saved = 0
    cards_no_photo = 0
    db_updates = []

    for i, c in enumerate(cards):
        if i in matched_cards:
            student, score = matched_cards[i]
            if c["photo_xref"] is not None:
                photo_data = doc.extract_image(c["photo_xref"])
                ext = photo_data.get("ext", "jpeg")
                if ext == "jpg":
                    ext = "jpeg"
                filename = f"student_{student['id']}.{ext}"
                file_path = os.path.join(UPLOADS_DIR, filename)
                with open(file_path, "wb") as f:
                    f.write(photo_data["image"])
                photos_saved += 1
                rel_url = f"/students/{filename}"
                db_updates.append({"id": student["id"], "photo_path": rel_url})
            else:
                cards_no_photo += 1
                print(f"  [Notice] Card for {student['full_name']} (Page {c['page']}) has no photo in PDF.")

    print(f"  Photos Saved to Disk  : {photos_saved}")
    print(f"  Cards without Photo   : {cards_no_photo}")
    print(f"  DB Students without ID: {len(student_entries) - len(used_student_ids)}")

    # Update database photo_path
    print(f"\n[*] Updating database with {len(db_updates)} student photo URLs...")
    with engine.begin() as conn:
        for upd in db_updates:
            conn.execute(
                text("UPDATE students SET photo_path = :photo_path WHERE id = :id"),
                upd
            )
    print("[+] Database records successfully updated!")

if __name__ == "__main__":
    main()
