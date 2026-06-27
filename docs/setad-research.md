# Setad Public API Research

## Public Frontend

- Central board: `https://fe.setadiran.ir/centralboard/#/central-board-0`
- Frontend properties endpoint: `https://fe.setadiran.ir/centralboard/core/properties?path=/centralboard`
- Public API base found in frontend config: `https://gw.setadiran.ir/api/centralboard`

## Confirmed Endpoints

- Listings: `GET /cards/`
- Categories: `GET /cards/setadCategory`
- Organizations: `GET /cards/setadOrganization/`
- Provinces/cities: `GET /cards/setadCity`
- Offer history: `GET /cards/offerHistoryGridInfo`

## Filter Inventory

Search:

- `searchTypeCode`: `0` keyword, `1` transaction number
- `queryText`: Persian/English free text

Sort:

- `score`: most relevant
- `onPerforming`: in progress
- `newerInsertDate`: newest
- `olderInsertDate`: oldest
- `newerJalaliSendDeadLineDate`: shortest proposal deadline
- `olderJalaliSendDeadLineDate`: longest proposal deadline

System tree:

- `1`: خرید
- `1431`: کالا
- `1432`: خدمت
- `1435`: خدمت/کالا
- `2`: مناقصه
- `4121`: مناقصه عمومی
- `4130`: خرید خدمات مشاوره
- `4128`: مناقصه عمومی همزمان با ارزیابی
- `4120`: ارزیابی کیفی برای مناقصه عمومی
- `4123`: ارزیابی کیفی برای لیست کوتاه
- `4134`: ارزیابی صلاحیت
- `3`: مزایده
- `31`: اموال منقول
- `32`: اموال غیرمنقول
- `33`: اجاره
- `343`: حراج دستگاه ها
- `342`: حراج اموال تملیکی
- `341`: مزایده قوه قضاییه
- `35`: جزئی

Other filters:

- `selectedOrganization`: organization code list
- `selectedCategory`: Setad category id list
- `selectedProvinces`: root province location id list
- `selectedCities`: city pair list, usually `parentLocId-locId`
- `fromSendDeadlineDate`, `toSendDeadlineDate`
- `fromDocumentDeadlineDate`, `toDocumentDeadlineDate`
- `fromPrice`, `toPrice`
- `classificationId`: hidden/preset, judiciary shortcut uses `80901,80902,80903`
- `notOrgId`: supported by URL handling

## Rate-Limit Concern

The frontend contains messages indicating public-board view limits and possible one-hour blocking. The worker therefore uses conservative intervals, page limits, retries, and backoff. Recommended task intervals are 30-60 minutes unless filters are narrow.

