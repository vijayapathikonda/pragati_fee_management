# Vendor Guide: Machine-Bound Cryptographic License Generation
## School Fee Management & Institutional System

This operational guide explains how to generate, bind, and renew machine-locked annual licenses for client schools.

---

## 1. How Machine-Binding Works

Every school server has a unique **Server ID** formatted as:
```text
SCH-XXXX-XXXX-XXXX
```
*(Example: `SCH-2B79-DF99-3310`)*

### Key Security Features:
- **Hardware Lock**: The Server ID is bound to the client host's physical motherboard and persistent hardware fingerprint (`uploads/.server_id`).
- **Cryptographic Signing (Ed25519)**: Licenses are signed with your private vendor key (`tools/keys/private_key.pem`). The school's application only has the public key, making it mathematically impossible for anyone to forge or alter a license.
- **Copy Protection**: If a client attempts to copy the Docker container or database to an unauthorized machine, the Server ID will mismatch and write access will be blocked (`403 Forbidden`).
- **Anti-Clock Tampering**: The engine records a monotonic time sequence. Rolling back the computer's system clock will immediately flag a tampering anomaly and lock modifications.

---

## 2. Step 1: Getting the School's Server ID

Before issuing a license, ask the school administrator to provide their **Server ID**.

They can retrieve it using any of the following 3 methods:

### Method A: From the Web Portal (Recommended for School Admins)
1. Log in to the application at `http://localhost` (or `http://<SERVER_IP>`).
2. Click the **License Status Pill** in the top navigation bar (or navigate to **System Settings -> "License & Renewal"** tab).
3. Click the **"Copy Server ID"** button next to their ID.

### Method B: Via Web Browser / API
Open this URL in any browser on the school network:
```text
http://<SERVER_IP>:8002/api/license/fingerprint
```
Output:
```json
{
  "server_id": "SCH-2B79-DF99-3310"
}
```

### Method C: Directly from Host Server File
Open the file on the server machine:
```text
C:\FeeManagement\uploads\.server_id
```

---

## 3. Step 2: Generating the License File (.lic)

As the software vendor, run the license generator on **your** computer.

### Option 1: Using the 1-Click Interactive Wizard (Easiest)
1. Double-click [`generate_license.bat`](file:///d:/personal/school/repo/fee_management/generate_license.bat).
2. Follow the on-screen prompts:
   - **Enter School Name**: e.g., `Pragati Vidyalaya`
   - **Enter Server ID**: Paste the client's Server ID (e.g., `SCH-2B79-DF99-3310`)
   - **Enter Validity Days**: `365` (or `30` for a trial period)
   - **Output File**: Press **Enter** to accept default (e.g., `Pragati_Vidyalaya_license.lic`)
3. The script outputs a cryptographically signed `.lic` file.

### Option 2: Using the Command Line (CLI)

Run via Command Prompt or PowerShell:
```cmd
.\generate_license.bat issue --school "Pragati Vidyalaya" --server-id "SCH-2B79-DF99-3310" --days 365 --output pragati_2026.lic
```
Or directly with Python:
```cmd
python tools\generate_license.py issue --school "Pragati Vidyalaya" --server-id "SCH-2B79-DF99-3310" --days 365 --output pragati_2026.lic
```

### Option 3: Generating an Unconstrained License (Developer / Internal Use)
To create a license that runs on **any machine** without hardware locking, omit the `--server-id` argument:
```cmd
.\generate_license.bat issue --school "Demo Internal School" --days 365 --output demo_license.lic
```

---

## 4. Step 3: Inspecting & Verifying a License File

To inspect what is inside any `.lic` file and check its cryptographic validity:

```cmd
.\generate_license.bat inspect pragati_2026.lic
```

Output:
```text
[+] Cryptographic Signature: VALID
{
  "school_name": "Pragati Vidyalaya",
  "client_email": "",
  "server_id": "SCH-2B79-DF99-3310",
  "issued_at": "2026-09-16T05:30:00Z",
  "expires_at": "2027-09-16T05:30:00Z",
  "duration_days": 365,
  "license_version": "1.0",
  "features": [
    "STUDENTS",
    "FINANCE",
    "REPORTS",
    "ADMIN"
  ]
}
```

---

## 5. Step 4: Activating / Renewing at the Client School

1. **Deliver the File**: Send the `.lic` file (e.g., via email or WhatsApp) to the school administrator.
2. **Upload**:
   - The school admin opens the portal -> **System Settings -> "License & Renewal"** tab.
   - Clicks **"Upload License File"** and selects the `.lic` file.
3. **Instant Activation**:
   - The backend validates the signature, records the new term in the database, and unlocks full system operations.
   - The top header pill immediately updates:
     `🟢 Valid till: 16 Sep 2027 (365 days left)`

---

## 6. What Happens When a License Expires?

- **30 Days Before Expiration**: An amber warning banner appears across all pages reminding the administrator to renew.
- **On Expiration**:
  - The banner turns red: `License Expired`.
  - **Read Access Remains Available**: Staff can still view student history, search records, and print audit reports.
  - **Write Access is Blocked**: Creating new fee receipts, updating student data, or recording payments will return `403 Forbidden` until a renewal `.lic` file is uploaded.

---

## 7. Important Vendor Key Security Rules

> [!CAUTION]
> - Keep `tools/keys/private_key.pem` **STRICTLY CONFIDENTIAL**. Never distribute this file to client schools or include it in client release packages.
> - Client distribution packages generated by `build_distribution.bat` automatically exclude `tools/keys/` and include only the application's compiled binaries and embedded `public_key.pem`.
