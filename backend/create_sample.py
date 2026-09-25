from openpyxl import Workbook
import os

wb = Workbook()
ws = wb.active
ws.title = "Students"

headers = ["First Name", "Last Name", "DOB", "Gender", "Email", "Phone", "Address", "Grade", "Section", "Academic Year"]
ws.append(headers)

sample_data = [
    ["John", "Doe", "2010-05-14", "Male", "john.doe@example.com", "9876543210", "123 Main St", "Grade 1", "A", "2026-2027"],
    ["Jane", "Smith", "2011-08-22", "Female", "jane.smith@example.com", "9123456780", "456 Oak Ave", "Grade 2", "B", "2026-2027"]
]

for row in sample_data:
    ws.append(row)

output_path = os.path.join(os.path.dirname(__file__), 'app', 'uploads', 'Sample_Students.xlsx')
os.makedirs(os.path.dirname(output_path), exist_ok=True)
wb.save(output_path)

print(f"Sample Excel created at: {output_path}")
