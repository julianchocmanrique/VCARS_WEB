# VCARS - Architecture and Data Ownership Map

This document defines the separation between frontend, backend, and database.

## 1) Repository responsibilities

- `VCARS_WEB` (this repo): UI/UX, client navigation, temporary cache only.
- `vcars-api`: business rules, authorization, server-side validations, PDF generation.
- PostgreSQL (managed by `vcars-api`): source of truth for business data.

## 2) Data ownership (where each datum must live)

### Backend + DB (authoritative)
- Service order metadata:
  - order number, plate, customer/company, billing data, current step.
- Reception:
  - mileage, fuel level, accessory inventory (S/N/C/I), observations, failure report.
- Quotes:
  - internal draft (admin), client quote, line items, totals, iva, margins.
- Approval and workflow:
  - customer decision, timestamps, execution details, delivery closure.
- Signatures:
  - signature image references + timestamps.
- Audit:
  - who changed what and when.

### File/Object storage (referenced by DB)
- Intake photos.
- Signature images.
- Generated PDFs.

### Frontend cache only (non-authoritative)
- Last selected filters and tab state.
- Last opened entry id/plate.
- Session token/profile mirror.

## 3) Current local keys in frontend

- `@vcars_session`
- `@vcars_profile`
- `@vcars_entries`
- `@vcars_current_entry`
- `@vcars_client_identity`
- `@vcars_order_forms`

## 4) Rule to keep architecture clean

- If data affects billing, process status, legal traceability, or reporting:
  - it must be written to backend+db first.
- Frontend localStorage is only for resilience and quick reloads.
- Any local cache must be replaceable from backend responses.

## 5) Migration sequence (recommended)

1. Create backend endpoints for service-order forms by step.
2. Update frontend form writes to backend first, local cache second.
3. Move quote calculations to backend (single source of totals).
4. Store photos/signatures in object storage and keep URLs in DB.
5. Add audit log per step update.
6. Keep frontend local cache as fallback only.

## 6) Acceptance criteria

- Reloading or switching device preserves all order/quote/signature data.
- No business-critical information is lost when browser storage is cleared.
- PDF output always matches backend data, not local cache.
- Admin/client views read from same backend source with role-based fields.
