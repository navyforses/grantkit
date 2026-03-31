# Admin.tsx String Replacement Map

## Strategy
- The main Admin() component needs `useLanguage()` import
- Sub-components (StatusBadge, RoleBadge, GrantFormModal, DeleteConfirmModal, SendNotificationModal) need `t` passed as prop
- categoryLabels object should use t.admin.cat* keys
- All toast messages in mutations need t.admin.toast* keys

## Key areas:
1. StatusBadge (line 78-92): labels Active/Cancelled/Past Due/Paused/None → t.admin.status*
2. RoleBadge (line 94-108): Admin/User → t.admin.role*
3. categoryLabels (line 111-121): 9 categories → t.admin.cat*
4. GrantFormModal (line 140-573): ~40 labels/placeholders → t.admin.form*/ph*
5. DeleteConfirmModal (line 575-618): title/confirm/buttons → t.admin.delete*
6. SendNotificationModal (line 620-762): title/search/buttons → t.admin.send*/select*
7. Main Admin component (line 766-2041): header, stats, tabs, tables, pagination, newsletter, import modal

## Approach: Pass t.admin as prop to sub-components, use t.admin directly in main component
