# Production Fixes V21

- Generic member support requests are now actionable in Admin Claims with Under Review, Approve, Reject and Close workflow states.
- Notification screens subscribe to the existing Socket.IO notification events so new alerts and state changes appear without waiting for polling.
- Dashboard topbars now calculate unread chat counts from conversation unread counters and refresh when realtime messages arrive.
- SuperAdmin retains access to the Messages entry in the portal topbar.
