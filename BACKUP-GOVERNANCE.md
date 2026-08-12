# SuperAdmin Database Governance & Backup

The **SuperAdmin → Database Integrity & Cleanup** page now talks directly to the MongoDB database used by the running backend through the existing `MONGO_URI` connection.

## Available SuperAdmin operations

- Live integrity scan against MongoDB.
- Safe cleanup of duplicate accounts, duplicate conversations, orphaned chat data, self-conversations and duplicate carousel records.
- Individual duplicate-member deletion when the record is confirmed as a non-canonical duplicate with no linked financial/support/audit records.
- Carousel-only cleanup.
- **Database backup:** downloads every MongoDB collection currently visible to the application as a JSON snapshot.
- **Print report:** produces a printer-friendly governance/integrity report.

## Backup security

The browser-download backup intentionally redacts credential/token fields such as passwords, reset tokens, access/refresh tokens, API keys, OTPs and private keys. Application data (members, contributions, finance records, support records, dependants, chat, messages, notifications, news, feedback, audit data, carousel content and other collections) remains included.

A true MongoDB credential-level backup should continue to be handled through MongoDB Atlas/`mongodump` rather than exposed through the web portal.

## No extra database credential is required in the ZIP

The backup endpoint uses the backend's existing `MONGO_URI`. Keep the actual `MONGO_URI` only in the Render/backend environment variables and never place it in the frontend or source-controlled `.env` files.

## After deployment

1. Deploy the backend to Render.
2. Deploy the frontend to Vercel.
3. Sign in as SuperAdmin.
4. Open **Data Integrity** and click **Scan Again**.
5. Use **Backup database** for a downloadable application-data snapshot.
6. Use **Print report** for a paper/PDF-ready integrity report.

## Human-readable backup and permanent account deletion

The Data Integrity page also provides **Human backup** and **Print backup** actions. These create the same live application snapshot in a readable HTML format with collection names, record counts and labelled fields so the record can be opened offline, printed or saved as a PDF from the browser.

SuperAdmin deletion of a member or administrator is now **permanent**. Member deletion removes the member account and linked personal, support, contribution/finance, notification, feedback and chat records. Administrator deletion removes the administrator account, its legacy portal chat shadow profile and linked chat records, while dependent financial/support approval references are cleared and administrator-owned news/polls are removed rather than leaving broken database references.

Before a permanent deletion, download a **Human backup** from Data Integrity and store it in a controlled offline location. Technical JSON remains available when machine-readable backup data is needed.

Portal Admin/SuperAdmin chat profiles use a deterministic `portalOwnerId` / `portalOwnerRole` link so deleted administrator accounts cannot leave hidden Member records that block reuse of an email or username.
