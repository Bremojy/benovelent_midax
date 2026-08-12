# SuperAdmin / Portal Governance Update — 2026-08-12

## Database integrity
- Added deep carousel scanning that fetches public/Cloudinary image URLs and stores SHA-256 content hashes so legacy duplicate uploads can be identified even when their URLs differ.
- Added direct SuperAdmin controls for self-conversations, orphaned chat data, legacy personal monthly-income cleanup, backup, printing, and collection inventory.
- Live snapshot findings are clickable and lead to the protected control room.
- Carousel cleanup remains conservative and keeps the newest matching slide.

## Portal dashboards
- Admin dashboard now includes live support, notification, news, feedback and online-member activity plus quick links.
- Member dashboard now includes personal support/message/notification activity and quick links; monthly income remains excluded.
- SuperAdmin dashboard now includes live cross-portal system metrics, support, communication, finance and content activity plus governance quick links.

## Administrator UI
- Modernized the administrator creation/edit modal, input styling, focus states, spacing and responsive behavior.
