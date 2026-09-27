# Báo cáo tổng + in (giai đoạn 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xem lãi ròng cả nhà theo năm / khoảng ngày (lãi các vụ − chi phí chung) và in được báo cáo vụ lẫn báo cáo tổng.

**Architecture:** Backend thêm `GET /api/reports/getOverview` trong `app/services/overviewReport.service.js`, dựng lại từ `buildCropReport` (giai đoạn 2) cho từng vụ và một hàm dùng chung `summarizeExpenses` tách ra từ `buildCropReport` cho phần chi phí chung. Frontend thêm trang `/bao-cao` (`ReportView` + biểu đồ `ProfitChart`), và tổng quát hóa quy tắc in trong `_print.scss` bằng class `.print-area` để báo cáo vụ và báo cáo tổng in được như phiếu tính tiền.

**Tech Stack:** Node/Express/Mongoose + Jest/Supertest/mongodb-memory-server (BE); Vue 3.4 + Vite + Vitest/@vue/test-utils + chart.js (FE).

**Spec:** `management-fish-be/docs/superpowers/specs/2026-09-27-crop-profit-design.md` — giai đoạn 3 = mục 4.2, nút In của 4.1 và 4.2.

## Global Constraints

- Tiếp tục trên nhánh `feature/crop-profit` của cả hai repo. **Không commit** `management-fish-fe/src/assets/configs/env.js`.
- Commit: `git -c user.name=duongpv2112 -c user.email=duongpd12@gmail.com commit ...`, message kết thúc bằng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- BE: controller mới dùng `app/common/sendResult.js`; ngày qua `toDateOnly` (ngày lịch Việt Nam, 00:00 UTC); chỉ VND; lỗi nghiệp vụ HTTP 200 + `success: false`.
- Message (nguyên văn): "Ngày không hợp lệ!", "Ngày kết thúc phải sau ngày bắt đầu!", "Lấy báo cáo tổng thành công!".
- FE: tiền `formatMoney(value, "VND")`, ngày vụ `formatDateOnly`, ô chọn `CPSelect`, điện thoại ≥ 44px, lỗ hiển thị chữ "Lỗ" + số không dấu trừ (như báo cáo vụ), mount test không dùng `attachTo`, chart.js được mock trong test như `tests/views/StatisticData.test.js`.

## Review Focus

1. **Vụ kết thúc ngày 31/12 hoặc 01/01** → thuộc đúng năm của ngày kết thúc theo lịch Việt Nam (Task 1).
2. **Kỳ không có vụ nào và không có chi phí chung** → mọi tổng bằng 0, danh sách rỗng, biểu đồ không vẽ, không lỗi (Task 1, Task 3).
3. **Khoảng ngày tùy chọn sai** (từ > đến, hoặc bỏ trống một ô) → báo lỗi ngay trên trang, không gọi API (Task 3); server cũng từ chối (Task 1).
4. **Vụ mở lại sau khi đã kết thúc** → không còn nằm trong danh sách vụ đã kết thúc của kỳ, chuyển sang "Đang nuôi (tạm tính)" (Task 1).
5. **In trên điện thoại** → bộ lọc, nút, công tắc bị ẩn (`no-print`), số liệu vẫn in (Task 2, Task 3).

---

## Backend (`management-fish-be/`)

### Task 1: Báo cáo tổng (`getOverview`)

**Files:**
- Create: `app/services/overviewReport.service.js`, `app/controllers/report.controller.js`, `app/routes/report.routes.js`
- Modify: `app/services/cropReport.service.js` (tách `summarizeExpenses`, thêm `loadCropReport(crop)`), `app.js`
- Test: `tests/overviewReport.test.js`, thêm case `summarizeExpenses` vào `tests/buildCropReport.test.js`

**Interfaces:**
- Produces: `cropReport.service.summarizeExpenses(expenses): { total, byCategory }` (đúng phần `expense` hiện có của `buildCropReport`, `buildCropReport` gọi lại hàm này) và `cropReport.service.loadCropReport(crop): Promise<reportData>` (crop đã populate `pond`; `getCropReport` dùng lại).
- Produces: `overviewReport.service.getOverview({ from?, to?, includeOpen? }): Promise<{ ok, data } | { ok: false, message }>`; `GET /api/reports/getOverview?from=&to=&includeOpen=0|1`.
- `data`: `{ period: { from, to }, crops: row[], openCrops: row[], cropsTotal: { revenue, expense, profit }, commonExpense: { total, byCategory }, netProfit, excludedForeignCurrency, includeOpen }` với `row = { crop: <report.crop>, revenue: number, expense: number, profit: number }`. `crops` = vụ `closed`, chưa xóa, `endDate` trong [from, to], sắp theo `endDate` tăng dần; `openCrops` = mọi vụ `open` chưa xóa (không phụ thuộc kỳ), sắp theo `startDate`. `cropsTotal` cộng `crops` (+ `openCrops` khi `includeOpen`); `excludedForeignCurrency` cộng từ các vụ được tính vào tổng; `netProfit = cropsTotal.profit − commonExpense.total`. `from`/`to` bỏ trống → 01/01 và 31/12 của năm hiện tại (giờ Việt Nam); `period` trả dạng `"YYYY-MM-DD"`.

- [ ] **Step 1: Viết test hỏng**
  - `tests/buildCropReport.test.js`: `summarizeExpenses([])` → `{ total: 0, byCategory: [] }`; với 3 khoản như test "chi theo nhóm" hiện có → cùng kết quả như `buildCropReport(...).expense`.
  - `tests/overviewReport.test.js` (dữ liệu tạo trực tiếp bằng model; mỗi vụ một phiên có giá để có thu):
    - `"vụ trong kỳ theo ngày kết thúc"`: vụ A kết thúc 2026-12-31, vụ B kết thúc 2027-01-01, vụ C kết thúc 2025-12-31 → `getOverview?from=2026-01-01&to=2026-12-31` chỉ có A; mỗi dòng có `crop.cropName`, `crop.pond.pondName`, `revenue`, `expense`, `profit` bằng đúng `getCropReport` của vụ đó.
    - `"vụ đang nuôi tách riêng"`: vụ D đang nuôi (kể cả D từng kết thúc rồi được mở lại) nằm trong `openCrops`, không nằm trong `crops`; `includeOpen` bỏ trống/`0` → `cropsTotal` không gồm D; `includeOpen=1` → gồm D và `includeOpen: true`.
    - `"chi phí chung theo ngày"`: khoản chung 2026-03-01 (Điện 600.000) và 2027-01-05 (Điện 1) + khoản của vụ → `commonExpense.total 600000`, `byCategory[0].category.categoryName "Điện"`; `netProfit = cropsTotal.profit − 600000`.
    - `"kỳ trống"`: không có gì → `crops []`, `openCrops []`, `cropsTotal { revenue: 0, expense: 0, profit: 0 }`, `commonExpense { total: 0, byCategory: [] }`, `netProfit 0`.
    - `"mặc định năm hiện tại"`: không truyền ngày → `period.from` là `"<năm VN>-01-01"`, `period.to` là `"<năm VN>-12-31"`.
    - `"ngày sai"`: `from=abc` → "Ngày không hợp lệ!"; `from=2026-12-31&to=2026-01-01` → "Ngày kết thúc phải sau ngày bắt đầu!".
    - `"vụ và khoản chi đã xóa không tính"`.
- [ ] **Step 2: Chạy** `npx jest --runInBand overviewReport buildCropReport cropReport` → FAIL (buildCropReport cũ vẫn PASS).
- [ ] **Step 3: Cài đặt.** `loadCropReport` là phần thân hiện tại của `getCropReport` sau khi tìm được vụ. `getOverview` tìm vụ bằng `Crop.find({ isDelete: false, status: "closed", endDate: { $gte: from, $lte: to } }).populate("pond")` và `Crop.find({ isDelete: false, status: "open" }).populate("pond")`, gọi `loadCropReport` tuần tự hoặc `Promise.all`, chi phí chung `Expense.find({ crop: null, isDelete: false, date: { $gte: from, $lte: to } }).populate("category")` → `summarizeExpenses`. Năm hiện tại lấy từ `toDateOnly()` (`getUTCFullYear()`).
- [ ] **Step 4: Chạy** `npm test` → PASS.
- [ ] **Step 5: Cập nhật** `E:\Source\management-fish\CLAUDE.md` (không commit): `/api/reports/getOverview`, `summarizeExpenses`/`loadCropReport`.
- [ ] **Step 6: Commit** `feat(be): overview profit report`.

## Frontend (`management-fish-fe/`)

### Task 2: In báo cáo vụ

**Files:**
- Modify: `src/assets/scss/_print.scss`, `src/views/Crops/CropReportView.vue`
- Test: thêm case vào `tests/views/CropReportView.test.js`

**Interfaces:**
- Produces: class `.print-area` trong `_print.scss` — khi in chỉ vùng `.price-summary__print-area` hoặc `.print-area` hiện (cùng quy tắc `visibility`/`position` hiện có); `.no-print` ẩn khi in (đã có).

- [ ] **Step 1: Viết test hỏng** — `tests/views/CropReportView.test.js`: vùng báo cáo (`.report`) có class `print-area`; nút `.btn-print-report` ("In báo cáo") gọi `window.print` (spy); link "← Vụ nuôi", các nút hành động (`.report-header__actions`) và nút In nằm trong phần tử có class `no-print`.
- [ ] **Step 2: Chạy** `npx vitest run CropReportView` → FAIL.
- [ ] **Step 3: Cài đặt.** Thêm `.print-area` vào hai selector in của `_print.scss` (không đổi quy tắc cũ). Thêm nút `CPButton` "In báo cáo" vào `.report-header__actions`; gắn `no-print` cho link quay lại, `.report-header__actions`, `.report__action-error`. Khi in, danh sách khoản chi của nhóm đang mở vẫn in (không ẩn).
- [ ] **Step 4: Chạy** `npm test` → PASS (test in phiếu tính tiền cũ không đổi). Chạy thử trên `dev:local`: trang báo cáo vụ tải được (SCSS biên dịch), stylesheet đã nạp có quy tắc `@media print` chứa `.print-area` (đọc qua `document.styleSheets`). Công cụ trình duyệt không giả lập được media print nên không xem trước bản in — ghi Ruling nếu vậy.
- [ ] **Step 5: Commit** `feat(fe): print crop report`.

### Task 3: Trang Báo cáo tổng (`/bao-cao`)

**Files:**
- Create: `src/services/reportAPI.js`, `src/views/Report/ReportView.vue`, `src/views/Report/components/ProfitChart.vue`
- Modify: `src/router/index.js`, `src/components/AppNav.vue`, `src/components/AppTopBar.vue`, `tests/router.test.js`, `tests/App.test.js`, `tests/components/AppTopBar.test.js`
- Test: `tests/views/ReportView.test.js`, `tests/views/ProfitChart.test.js`

**Interfaces:**
- Consumes: `GET /api/reports/getOverview` (Task 1).
- Produces: `ReportAPI.getOverview(params: { from, to, includeOpen: 0|1 })`; route `{ path: "/bao-cao", name: "report", component: ReportView }`; link `{ name: "report", text: "Báo cáo" }` sau "Chi phí" (menu: Cân cá, Vụ nuôi, Chi phí, Báo cáo, Danh mục, Nhật ký).
- Produces: `ProfitChart.vue` props `{ rows: { label: string, profit: number }[] }` — vẽ `chart.js` dạng `bar`, cột lãi màu `$color-primary`, lỗ màu `$color-error` (lấy bằng hằng số hex giống `StatisticData`), không vẽ khi `rows` rỗng (hiện "Chưa có vụ nào trong kỳ."), hủy biểu đồ cũ khi `rows` đổi và khi unmount.

- [ ] **Step 1: Viết test hỏng**
  - `tests/views/ProfitChart.test.js` (mock chart.js như `StatisticData.test.js`): `rows` 2 phần tử → `ctor` gọi với `type: "bar"`, `labels` là 2 nhãn, `data` là 2 số lãi, màu cột thứ hai (lỗ) khác cột thứ nhất; đổi `rows` → `destroy` được gọi rồi vẽ lại; `rows []` → không gọi `ctor`, có chữ "Chưa có vụ nào trong kỳ."; unmount → `destroy`.
  - `tests/views/ReportView.test.js` (mock `@/services/reportAPI`, chart.js; router bộ nhớ có route `crop-report`):
    - mặc định gọi `getOverview({ from: "<năm nay>-01-01", to: "<năm nay>-12-31", includeOpen: 0 })`; `#reportPeriod` có năm nay và 4 năm trước + "Tùy chọn" (`custom`).
    - hiện mỗi vụ trong kỳ một dòng `.report-crop-row` (tên ao, tên vụ, khoảng ngày, thu, chi, lãi/lỗ); bấm dòng → route `crop-report` của vụ đó.
    - dòng tổng các vụ, khối "Chi phí chung" theo nhóm (`Điện · 600.000 đ`), dòng `.report-net` "Lãi ròng cả nhà" (hoặc "Lỗ ròng cả nhà" + class `report-net--loss`).
    - nhóm "Đang nuôi (tạm tính)" liệt kê `openCrops`; bật công tắc `#includeOpen` → gọi lại với `includeOpen: 1`.
    - chọn năm trước bằng `chooseOption(wrapper, "#reportPeriod", "<năm trước>")` → gọi với năm đó.
    - "Tùy chọn": hiện `#reportFrom`, `#reportTo`, nút "Xem" (`.btn-apply-range`); từ > đến → "Ngày kết thúc phải sau ngày bắt đầu!" và không gọi API; bỏ trống một ô → "Vui lòng chọn đủ từ ngày và đến ngày."; hợp lệ → gọi với hai ngày đó.
    - `excludedForeignCurrency > 0` → "Có n phiên bằng USD không được tính".
    - kỳ trống → "Chưa có vụ nào kết thúc trong kỳ." và các tổng 0 đ.
    - `ProfitChart` nhận `rows` từ `crops` (+ `openCrops` khi bật công tắc), nhãn là tên ao · tên vụ.
    - vùng trang có class `print-area`; bộ lọc, công tắc, nút In (`.btn-print-overview` → `window.print`) nằm trong phần tử `no-print`.
    - lỗi tải → "Không thể tải báo cáo tổng, vui lòng thử lại sau."
  - Cập nhật test menu có sẵn với "Báo cáo" và route `report`.
- [ ] **Step 2: Chạy** `npx vitest run ReportView ProfitChart router App AppTopBar` → FAIL.
- [ ] **Step 3: Cài đặt.** Năm tính theo giờ máy. Công tắc là `<input type="checkbox" id="includeOpen">` trong `label` cao ≥ 44px. Dòng vụ là `button` (hoặc phần tử `role="link"`) dùng `useRouter().push`. Trên điện thoại (`@media (max-width: 899.98px)`) mỗi dòng xếp dọc như thẻ; desktop là lưới 5 cột.
- [ ] **Step 4: Chạy** `npm test` → PASS. Chạy thử với `dev:local` (khởi động lại `dev-backend`): kết thúc vụ Ao 1, mở `/bao-cao`, xem dòng vụ, bật công tắc, chọn "Tùy chọn", bấm In; khổ 375px không tràn ngang.
- [ ] **Step 5: Cập nhật** `E:\Source\management-fish\CLAUDE.md` (không commit): `/bao-cao`, `ProfitChart`, `.print-area`.
- [ ] **Step 6: Commit** `feat(fe): overview profit report page`.

## Phát hành giai đoạn 3

Deploy BE → deploy FE (không có migration).
