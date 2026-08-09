# Roadmap

این فایل وضعیت واقعی کارهای باقی‌مانده را نگه می‌دارد. مخزن عمومی باید همیشه
طوری باشد که یک توسعه‌دهنده جدید بتواند بدون دسترسی به فایل‌های خصوصی، مسیر
بعدی را بفهمد.

## انجام شده

- ورک‌بنچ چندمسیره RTL با React، TypeScript و Vite.
- بک‌اند FastAPI با PostgreSQL، Redis، Celery worker/beat و SQLAlchemy.
- جستجوی زنده، ساخت پایش، تاریخچه اجرا، رویدادهای اعلان، بانک آگهی‌ها و مقصدهای
  Rubika.
- مدل اعلان baseline + delta برای ارسال فقط تغییرات بعد از لیست اولیه.
- مدیریت کاربران با نقش‌های `admin`، `operator` و `viewer`.
- اسکرین‌شات‌های عمومی با داده نمونه.
- مستندات فارسی برای اجرا، استقرار، معماری، Rubika و انتشار عمومی.
- مخزن عمومی پاک‌سازی‌شده بدون فایل‌های عملیاتی خصوصی، توکن، دامپ، کلید SSH یا
  فونت تجاری.
- قرارداد فعلی API فرانت‌اند در `docs/api-contract.md` مستند شده است.
- Alembic و migration اولیه schema در مخزن اضافه شده است.
- seed/demo mode محلی برای بازبینی امن UI بدون اتصال به Setad و Rubika اضافه
  شده است.
- جریان‌های اصلی محصول برای بازطراحی UI/UX در `docs/product-workflows.md`
  مستند شده‌اند.
- نسخه نمایشی عمومی browser-only با داده ساختگی روی GitHub Pages منتشر شده است؛
  adapter و verifier آن با بازطراحی اعلان در شاخه release candidate ادغام شده
  است.
- بازطراحی semantics اعلان، کارت رویداد، delivery attempt و system status روی
  public `main` در worktree جدا rebase و برای تست و بازبینی آماده شده است.

## اولویت‌های بعدی

1. تکمیل همه gateهای backend، frontend، migration و demo و انتشار شاخه release
   candidate برای بازبینی.
2. QA تصویری دسکتاپ و موبایل روی نسخه demo ادغام‌شده.
3. ادامه بازطراحی UX/UI فرانت‌اند بر اساس
   [FRONTEND_REDESIGN_BRIEF.md](FRONTEND_REDESIGN_BRIEF.md).
4. آماده‌سازی اولین source release تگ‌شده بعد از تثبیت مرز نسخه.
5. سخت‌تر کردن observability production: structured logs، export خطاها و run
   failure dashboard.
6. مستندسازی و تولید خودکار قرارداد API برای کاهش drift فرانت‌اند و بک‌اند.

## خط قرمزهای انتشار عمومی

- فایل `.env` واقعی وارد مخزن نشود.
- `.ops-private/` وارد مخزن نشود.
- توکن Rubika، chat ID، کلید SSH، دامپ PostgreSQL و اسکرین‌شات خصوصی وارد مخزن
  نشود.
- فونت‌های تجاری یا کاربر-فراهم‌شده بدون مجوز بازنشر وارد مخزن نشوند.
