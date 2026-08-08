# داده نمونه و نسخه نمایشی عمومی

این پروژه باید بدون دسترسی به سامانه واقعی Setad، Rubika یا اطلاعات خصوصی قابل
بررسی باشد. برای این کار دو مسیر مستقل وجود دارد.

## نسخه نمایشی عمومی و بدون سرور

[نسخه نمایشی آنلاین](https://moroshani.github.io/setadinfo/) یک build استاتیک و
browser-only است. این نسخه از `src/lib/public-demo-api.ts` استفاده می‌کند و
تمام قراردادهای لازم برای صفحه‌های اصلی را با داده ساختگی پاسخ می‌دهد.

مرزهای ایمنی این حالت:

- هیچ credential، chat ID، رکورد واقعی یا متغیر محیطی production داخل bundle
  قرار نمی‌گیرد.
- لایه API قبل از `fetch` درخواست را به adapter نمایشی هدایت می‌کند؛ بنابراین
  مرورگر به `/api`، Setad یا Rubika درخواست نمی‌زند.
- mutationها فقط state درون حافظه را تغییر می‌دهند و بعد از reload پاک می‌شوند.
- `pnpm verify:demo` این مرز را در مرورگر واقعی کنترل می‌کند و در صورت مشاهده
  درخواست `/api` شکست می‌خورد.

ساخت محلی:

```bash
cd frontend-workbench
pnpm install --frozen-lockfile
pnpm verify:demo
```

GitHub Actions خروجی `dist-demo` را بعد از هر تغییر مرتبط در branch اصلی روی
GitHub Pages منتشر می‌کند.

## داده نمونه full-stack برای توسعه محلی

اسکریپت demo seed یک دیتابیس محلی را با داده‌های ساختگی اما شبیه جریان واقعی پر
می‌کند:

- کاربرهای نمونه با نقش‌های `operator` و `viewer`
- مقصد Rubika ساختگی
- سه پایش: مناقصه فیلترمحور، مزایده با پیشنهادها، و پایش تک‌آگهی
- آگهی‌های ذخیره‌شده، پیشنهادهای مزایده، اجرای scheduler و کارت‌های رویداد
- وضعیت‌های ارسال اعلان شامل `sent`، `pending` و `failed`

### اجرای سریع

برای دیتابیس تازه:

```bash
cp .env.example .env
python -m pip install -r backend/requirements.txt
alembic -c alembic.ini upgrade head
PYTHONPATH=backend python -m scripts.seed_demo --yes
```

سپس بک‌اند و ورک‌بنچ را اجرا کنید:

```bash
PYTHONPATH=backend uvicorn app.main:app --host 127.0.0.1 --port 8765
cd frontend-workbench
pnpm install
pnpm dev --host 127.0.0.1 --port 5180
```

ورود نمونه:

```text
demo-operator / SetadInfo-demo-1234
demo-viewer   / SetadInfo-demo-1234
```

ادمین پیش‌فرض همان مقدارهای `ADMIN_USERNAME` و `ADMIN_PASSWORD` در محیط است.

### ایمنی

اسکریپت در حالت `APP_ENV=production` اجرا نمی‌شود. هر بار اجرا فقط رکوردهایی را
حذف و بازسازی می‌کند که شناسه، `source_key` یا `dedupe_key` نمونه دارند؛ بنابراین
برای بازسازی حالت demo نیازی به پاک کردن کل دیتابیس محلی نیست.

این داده‌ها واقعی نیستند و نباید برای تصمیم تجاری، تحلیل قیمت یا ارسال Rubika
استفاده شوند. هدف آن‌ها فقط آماده‌سازی مخزن برای طراحی، تست UI و بررسی جریان
کاری محصول است.
