# Chi phí + báo cáo vụ (giai đoạn 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ghi khoản chi (có nhóm chi tự thêm được) và xem thu – chi – lãi của từng vụ nuôi.

**Architecture:** Backend thêm resource `expense-category` (catalog + script seed) và `expense`, rồi dịch vụ báo cáo vụ `getCropReport` dựng từ một hàm thuần `buildCropReport` và hàm `summarizeSession` tách ra từ `getSessionSummary` (để tiền trong báo cáo khớp phiếu tính tiền). Frontend thêm quản lý Nhóm chi, form khoản chi dùng chung (`ExpenseForm` + thanh "Hoàn tác"), trang `/chi-phi`, số tạm tính trên thẻ ao và trang báo cáo `/vu-nuoi/:cropId`.

**Tech Stack:** Node/Express/Mongoose + Jest/Supertest/mongodb-memory-server (BE); Vue 3.4 + Vite + Vitest/@vue/test-utils (FE).

**Spec:** `management-fish-be/docs/superpowers/specs/2026-09-27-crop-profit-design.md` — giai đoạn 2 = mục 2.3 (+ script seed), 2.4, 4.1; FE 3.1 (Nhóm chi), 3.3, 3.4, số tạm tính trên thẻ ao (3.2), trang báo cáo vụ (4.1). Nút **In** của báo cáo vụ để giai đoạn 3.

## Global Constraints

- Tiếp tục trên nhánh `feature/crop-profit` của cả hai repo (đã có giai đoạn 1). **Không commit** `management-fish-fe/src/assets/configs/env.js`.
- Commit: `git -c user.name=duongpv2112 -c user.email=duongpd12@gmail.com commit ...`, message kết thúc bằng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- BE giữ đúng quy ước giai đoạn 1: `_id` uuid, `isDelete`, `timestamps`, `writeLog` cho mọi thao tác ghi (thành công và thất bại), service trả `{ ok, data } | { ok: false, message }`, controller mới dùng `app/common/sendResult.js`, ngày dạng ngày lịch qua `app/common/dateOnly.js#toDateOnly`.
- Tiền VND, số nguyên (`Math.round`). Chỉ phiên có `currency` VND (hoặc chưa có trường currency) được tính vào báo cáo.
- Message lỗi (nguyên văn): "Tên nhóm chi không được để trống!", "Tên nhóm chi đã tồn tại!", "Nhóm dùng để tính không hợp lệ!", "Số tiền phải lớn hơn 0!", "Số lượng không hợp lệ!", "Đơn giá không hợp lệ!", "Số kg mỗi đơn vị không hợp lệ!", "Ngày không hợp lệ!", "Không tìm thấy dữ liệu!", "Vụ đã có dữ liệu, không xóa được!".
- 6 nhóm chi mặc định (thứ tự tạo): Giống (`seed`), Cám (`feed`), Thuốc/hóa chất, Điện, Nhân công, Khác (`none`).
- FE: tiền hiển thị bằng `formatMoney(value, "VND")`, nhập bằng `parseMoney(text, "VND")` (`src/common/currency.js`); số lượng/kg bằng `common.parseDecimal`; ngày vụ bằng `formatDateOnly`; ô chọn ngắn dùng `CPSelect`; điện thoại ≥ 44px; mount test không dùng `attachTo`; UI tiếng Việt.

## Review Focus

1. **Khoản chi có số lượng nhưng không có đơn giá (hoặc ngược lại)** → dùng số tiền nhập tay; không có số tiền → "Số tiền phải lớn hơn 0!" (Task 2).
2. **Số lượng lẻ × đơn giá** (2,5 bao × 350.500) → làm tròn về đồng: 876.250 (Task 2).
3. **Vụ chưa có phiên bán hoặc chưa có khoản chi** → báo cáo không chia cho 0: thu 0, `costPerKg`/`fcr` null, `byCategory` rỗng (Task 3).
4. **Cám nhập đơn vị "KG" hay "Bao"** (hoa/thường lẫn lộn) → quy đổi đúng; một khoản cám không có số lượng → `feedKg`/`fcr` null (Task 3).
5. **Sửa khoản chi thuộc vụ đã kết thúc** → form vẫn chọn đúng vụ đó, không tự rơi về "Chung" (Task 5).

---

## Backend (`management-fish-be/`)

### Task 1: Nhóm chi (`expense-category`) + script seed

**Files:**
- Create: `app/models/expenseCategory.js`, `app/services/expenseCategory.service.js`, `app/controllers/expenseCategory.controller.js`, `app/routes/expenseCategory.routes.js`, `scripts/seed-expense-categories.js`
- Modify: `app.js`, `package.json` (script `"migrate:expense-categories": "node scripts/seed-expense-categories.js"`), `scripts/dev-local.js`
- Test: `tests/expenseCategory.test.js`, `tests/seedExpenseCategories.test.js`, thêm case vào `tests/devLocal.test.js`

**Interfaces:**
- Produces: model `mongoose.model("expense-category", ...)`: `categoryName` (String, required, unique), `metric` (`"seed"|"feed"|"none"`, default `"none"`), chung các trường. **Không** có `sortOrder`; danh sách sort `{ createdAt: 1 }`.
- Produces: `GET /api/expense-categories/getExpenseCategories`, `POST .../createExpenseCategories`, `PUT .../updateExpenseCategories/:categoryId`, `DELETE .../deleteExpenseCategories/:categoryId`; messages "Lấy danh sách nhóm chi thành công!", "Tạo nhóm chi thành công!", "Cập nhật nhóm chi thành công!", "Xóa nhóm chi thành công!".
- Produces: `scripts/seed-expense-categories.js` export `DEFAULT_EXPENSE_CATEGORIES: { categoryName, metric }[]` và `seedExpenseCategories({ dryRun: boolean }): Promise<{ created: string[] }>`; chạy trực tiếp thì kết nối bằng `buildDbURI()` giống `migrate-sessions.js` và nhận `--dry-run`.

- [ ] **Step 1: Viết test hỏng**
  - `tests/expenseCategory.test.js` (dựng theo `tests/pond.test.js`): thêm (trim, `metric` mặc định `"none"`, log `/Thêm mới nhóm chi/`); `metric: "abc"` → "Nhóm dùng để tính không hợp lệ!" (create và update); tên rỗng; trùng tên khác hoa thường (create, update) → "Tên nhóm chi đã tồn tại!"; xóa mềm rồi thêm lại → khôi phục cùng `_id`; sửa đổi được `metric`; id không tồn tại → "Không tìm thấy dữ liệu!".
  - `tests/seedExpenseCategories.test.js`: DB trống → `created` là đúng 6 tên theo thứ tự, `Giống.metric === "seed"`, `Cám.metric === "feed"`; chạy lần hai → `created: []`, vẫn 6 bản ghi; đã có "cám" (chữ thường) → không tạo "Cám" lần nữa (5 mới); `dryRun: true` → trả 6 tên nhưng không ghi gì.
  - `tests/devLocal.test.js`: sau `seedDemoData()` có 6 nhóm chi.
- [ ] **Step 2: Chạy** `npx jest --runInBand expenseCategory seedExpenseCategories devLocal` → FAIL.
- [ ] **Step 3: Cài đặt** theo `pond.service.js` (nameFilter trim + `i`, khôi phục tên đã xóa, 11000 → trùng tên, log "Thêm mới nhóm chi"/"Khôi phục nhóm chi"/"Cập nhật nhóm chi"/"Xóa nhóm chi"). Xóa nhóm chi luôn được (xóa mềm) dù đã có khoản chi. Script seed so tên không phân biệt hoa thường với mọi bản ghi (kể cả đã xóa mềm — không hồi sinh), tạo tuần tự để `createdAt` giữ thứ tự. `dev-local.js` gọi `seedExpenseCategories({ dryRun: false })`.
- [ ] **Step 4: Chạy** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(be): expense categories with default seed script`.

### Task 2: Khoản chi (`expense`)

**Files:**
- Create: `app/models/expense.js`, `app/services/expense.service.js`, `app/controllers/expense.controller.js`, `app/routes/expense.routes.js`
- Modify: `app.js`, `app/services/crop.service.js` (`deleteCrop` chặn khi có khoản chi), `scripts/dev-local.js` (2 khoản chi mẫu cho vụ Ao 1: 5.000 con giống × 800 đ; 10 bao cám × 350.000 đ, 25 kg/bao; 1 khoản "Điện" chung 600.000 đ)
- Test: `tests/expense.test.js`, thêm case vào `tests/crop.test.js`

**Interfaces:**
- Consumes: `expense-category` (Task 1), `crop` (giai đoạn 1), `toDateOnly`.
- Produces: model `mongoose.model("expense", ...)`: `date` (Date, required), `category` (String, ref `"expense-category"`, required), `crop` (String, ref `"crop"`, default null), `description`, `quantity` (Number|null), `unit` (String, default ""), `unitPrice` (Number|null), `kgPerUnit` (Number|null), `amount` (Number, required), `note`.
- Produces: `expenseService.{ getListExpense(query), createExpense(data), updateExpense(expenseId, data), deleteExpense(expenseId), getExpenseSuggestions(categoryId) }`.
- Produces: `GET /api/expenses/getExpenses?cropId=&common=1&categoryId=&from=&to=&page=&pageSize=` → `data: { items, total, totalAmount, page, pageSize }` (items populate `category` và `crop.pond`, sort `date: -1, createdAt: -1`, `pageSize` kẹp [1, 100] mặc định 20, `from`/`to` là `"YYYY-MM-DD"` bao gồm cả hai đầu, `totalAmount` là tổng theo bộ lọc không phụ thuộc trang); `POST /api/expenses/createExpenses`, `PUT /api/expenses/updateExpenses/:expenseId`, `DELETE /api/expenses/deleteExpenses/:expenseId`; `GET /api/expenses/getExpenseSuggestions?categoryId=` → `data: [{ description, unit, unitPrice, kgPerUnit }]` (tối đa 10 mô tả khác nhau, không rỗng, mới nhất trước) — FE lấy `data[0].unit` làm đơn vị mặc định của nhóm. Messages: "Lấy danh sách khoản chi thành công!", "Thêm khoản chi thành công!", "Cập nhật khoản chi thành công!", "Xóa khoản chi thành công!", "Lấy gợi ý thành công!".
- Body của create/update: `{ date?, categoryId, cropId? (null/"" = chung), description?, quantity?, unit?, unitPrice?, kgPerUnit?, amount?, note? }`.

- [ ] **Step 1: Viết test hỏng** — `tests/expense.test.js` (tạo sẵn ao, vụ mở, nhóm "Cám" `feed`, nhóm "Điện"):
  - `"số lượng × đơn giá → tự tính, bỏ qua amount gửi lên"`: `{ quantity: 10, unitPrice: 350000, amount: 1 }` → `amount 3500000`, log `/Thêm khoản chi/`.
  - `"số lượng lẻ làm tròn"`: `quantity: 2.5, unitPrice: 350500` → `876250`.
  - `test.each` thiếu một trong hai (chỉ `quantity`, chỉ `unitPrice`) + `amount: 120000.4` → `amount 120000`.
  - `"không có tiền"`: `{}` hoặc `amount: 0` hoặc `amount: -5` → "Số tiền phải lớn hơn 0!"; `quantity: 0` → "Số lượng không hợp lệ!"; `unitPrice: -1` → "Đơn giá không hợp lệ!"; `kgPerUnit: 0` → "Số kg mỗi đơn vị không hợp lệ!"; `date: "abc"` → "Ngày không hợp lệ!"; nhóm hoặc vụ không tồn tại → "Không tìm thấy dữ liệu!".
  - `"cropId rỗng → khoản chung"`; `"gắn được vào vụ đã kết thúc"`; ngày bỏ trống → hôm nay (`toDateOnly()`).
  - `"sửa"`: đổi số tiền/nhóm/vụ, tính lại `amount`; `"xóa mềm"` → biến khỏi danh sách.
  - `"danh sách lọc và phân trang"`: 3 khoản (2 của vụ, 1 chung, ngày khác nhau) → `cropId` trả 2, `common=1` trả 1, `from`/`to` bao gồm hai đầu, `categoryId` lọc đúng, `pageSize=1&page=2` trả phần tử thứ hai với `total 3` và `totalAmount` là tổng cả 3; `pageSize=500` → 100; item có `category.categoryName` và `crop.pond.pondName`.
  - `"nhóm chi đã xóa vẫn hiện tên ở khoản chi cũ"`.
  - `"gợi ý"`: 3 khoản "Cám A" (cũ), "Cám B", "Cám A" (mới nhất, `unit: "bao"`, `kgPerUnit: 25`) → `["Cám A", "Cám B"]`, phần tử đầu có `unit "bao"`, `kgPerUnit 25`; mô tả rỗng bị bỏ.
  - `tests/crop.test.js` thêm: `"xóa vụ có khoản chi → Vụ đã có dữ liệu, không xóa được!"`.
- [ ] **Step 2: Chạy** `npx jest --runInBand expense crop` → FAIL.
- [ ] **Step 3: Cài đặt.** Chuẩn hóa số tùy chọn: `""`/`null`/`undefined` → `null`; `quantity` và `kgPerUnit` phải `> 0`, `unitPrice` `>= 0`. `amount = quantity !== null && unitPrice !== null ? Math.round(quantity × unitPrice) : Math.round(Number(amount))`, sau đó `!(amount > 0)` → lỗi. Kiểm tra nhóm chi và vụ bằng `findOne({ _id, isDelete: false })`. Gợi ý: `find({ category, isDelete: false, description: { $ne: "" } }).sort({ date: -1, createdAt: -1 }).limit(200)` rồi lọc trùng mô tả trong JS. Log "Thêm khoản chi"/"Cập nhật khoản chi"/"Xóa khoản chi" kèm số tiền.
- [ ] **Step 4: Chạy** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(be): expenses with filters, totals and suggestions`.

### Task 3: Báo cáo vụ (`getCropReport`)

**Files:**
- Create: `app/services/cropReport.service.js`
- Modify: `app/services/weighSession.service.js` (tách `summarizeSession`), `app/controllers/crop.controller.js`, `app/routes/crop.routes.js`
- Test: `tests/cropReport.test.js`, `tests/buildCropReport.test.js`

**Interfaces:**
- Consumes: `expense` (Task 2), `WeighSession.crop` (giai đoạn 1).
- Produces: `weighSession.service.summarizeSession(session): Promise<summaryData>` — đúng `data` mà `getSessionSummary` đang trả; `getSessionSummary` gọi lại hàm này (không đổi hành vi, `tests/sessionSummary.test.js` vẫn xanh).
- Produces: `cropReport.service.buildCropReport({ crop, sessions: summaryData[], expenses: expenseDoc[] (populate category), today?: Date }): reportData` (thuần, không truy cập DB) và `getCropReport(cropId): Promise<{ ok, data } | { ok: false, message }>`.
- Produces: `GET /api/crops/getCropReport/:cropId`, message "Lấy báo cáo vụ nuôi thành công!"; `data` đúng cấu trúc spec 4.1: `crop { _id, cropName, pond { _id, pondName }, startDate, endDate, status, days }`, `revenue { total, sessions[{ _id, sessionName, buyerName, createdAt, status, totalNet, amount, missingPrice }], excludedForeignCurrency }`, `expense { total, byCategory[{ category { _id, categoryName, metric }, amount, percent, count }] }`, `profit`, `metrics { totalNetKg, costPerKg, seedQuantities[{ unit, quantity }], feedQuantities[{ unit, quantity }], feedKg, fcr }`.

- [ ] **Step 1: Viết test hỏng**
  - `tests/buildCropReport.test.js` (dữ liệu dựng tay, không DB):
    - `"vụ trống"`: không phiên, không chi → `revenue.total 0`, `expense.total 0`, `profit 0`, `byCategory []`, `costPerKg null`, `fcr null`, `feedKg null`, `totalNetKg 0`.
    - `"thu chỉ cộng phiên VND; phiên USD bị đếm"`: phiên VND `totalAmount 1000000`, phiên USD → `revenue.total 1000000`, `excludedForeignCurrency 1`, phiên USD không có trong `revenue.sessions`, `totalNetKg` chỉ từ phiên VND.
    - `"phiên thiếu giá"`: `missingPriceCount 1` → `missingPrice true`, `amount` = `totalAmount` của phiên (chỉ dòng có giá).
    - `"chi theo nhóm"`: Cám 3.500.000 (2 khoản), Giống 4.000.000 (1), Điện 500.000 → `byCategory` sắp giảm dần theo tiền, `percent` 1 chữ số thập phân (Giống 50, Cám 43.8, Điện 6.3), `count` đúng; `profit = thu − chi`.
    - `"quy đổi cám"`: unit "KG" 50 + unit "Bao" 10 với `kgPerUnit` 25 → `feedKg 300`, `feedQuantities` gom theo unit chữ thường (`[{ unit: "bao", quantity: 10 }, { unit: "kg", quantity: 50 }]`), `fcr = feedKg / totalNetKg` làm tròn 2 chữ số; thêm một khoản cám không có `quantity` → `feedKg null`, `fcr null`; một khoản "bao" thiếu `kgPerUnit` → `feedKg null`.
    - `"giống"`: `seedQuantities [{ unit: "con", quantity: 5000 }]`.
    - `"giá vốn/kg"`: `costPerKg = Math.round(expense.total / totalNetKg)`.
    - `"số ngày"`: vụ đóng 2026-09-01 → 2026-09-27 → `days 26`; vụ mở dùng `today`.
  - `tests/cropReport.test.js` (API, DB thật): vụ có 1 phiên (2 lần cân, có giá) + 1 phiên chưa gán vụ + 2 khoản chi của vụ + 1 khoản chung → `revenue.total` bằng đúng `totalAmount` từ `GET /api/weigh-sessions/getSessionSummary/:id` của phiên đó; khoản chung không tính; phiên đã xóa mềm không tính; vụ không tồn tại → "Không tìm thấy dữ liệu!".
- [ ] **Step 2: Chạy** `npx jest --runInBand buildCropReport cropReport sessionSummary` → FAIL (sessionSummary vẫn PASS).
- [ ] **Step 3: Cài đặt.** `summarizeSession` nhận document phiên, giữ nguyên logic hiện có. `getCropReport` tải vụ (populate pond), phiên `{ crop, isDelete: false }` (sort `createdAt: 1`), gọi `summarizeSession` cho từng phiên, tải khoản chi `{ crop, isDelete: false }` populate `category`, rồi `buildCropReport`. Đơn vị so sánh bằng `unit.trim().toLowerCase()`, `seedQuantities`/`feedQuantities` sắp theo unit (a→z), khoản không có `quantity` không góp vào hai danh sách này; một khoản cám quy ra kg khi unit là `"kg"` hoặc có `kgPerUnit`. `days` dùng cùng cách tính ngày lịch như `toDateOnly` (hiệu hai ngày 00:00 UTC / 86400000).
- [ ] **Step 4: Chạy** `npm test` → PASS.
- [ ] **Step 5: Cập nhật** `E:\Source\management-fish\CLAUDE.md` (không commit): resource `expense-category`, `expense`, báo cáo vụ, script seed và thứ tự phát hành (deploy BE → `npm run migrate:expense-categories` → deploy FE).
- [ ] **Step 6: Commit** `feat(be): crop profit report`.

## Frontend (`management-fish-fe/`)

### Task 4: API modules + quản lý Nhóm chi

**Files:**
- Create: `src/services/expenseCategoryAPI.js`, `src/services/expenseAPI.js`, `src/views/Catalog/components/ExpenseCategoryManager.vue`
- Modify: `src/services/cropAPI.js` (`getCropReport(id)`), `src/views/Catalog/components/CatalogManager.vue`, `src/views/Catalog/CatalogView.vue`
- Test: `tests/views/ExpenseCategoryManager.test.js`

**Interfaces:**
- Produces: `ExpenseCategoryAPI.{ getExpenseCategories(), createExpenseCategory(data), updateExpenseCategory(id, data), deleteExpenseCategory(id) }`; `ExpenseAPI.{ getExpenses(params), createExpense(data), updateExpense(id, data), deleteExpense(id), getExpenseSuggestions(categoryId) }`; `CropAPI.getCropReport(id)` — đường dẫn như Task 1–3.
- Produces: field config của `CatalogManager` có thêm `type: "select"` với `options: [{ value, label }]` và `defaultValue`: ô thêm/sửa là `CPSelect` (`idControl` = `` `${idPrefix}-new-${key}` `` / `` `${idPrefix}-edit-${key}` ``), bảng hiển thị `label` của option, gửi `value` nguyên văn, không kiểm tra rỗng.

- [ ] **Step 1: Viết test hỏng** — `tests/views/ExpenseCategoryManager.test.js` (mock `@/services/expenseCategoryAPI`): tiêu đề "Nhóm chi", cột "Tên nhóm chi" và "Dùng để tính"; dòng `metric: "feed"` hiển thị "Thức ăn"; thêm "Xăng dầu" không đổi ô chọn → `createExpenseCategory({ categoryName: "Xăng dầu", metric: "none" })`; chọn "Giống" bằng `chooseOption(wrapper, "#expenseCategory-new-metric", "seed")` → gửi `metric: "seed"`; sửa dòng → ô `#expenseCategory-edit-metric` hiện nhãn đang có; lỗi server hiện nguyên văn.
- [ ] **Step 2: Chạy** `npx vitest run ExpenseCategoryManager` → FAIL.
- [ ] **Step 3: Cài đặt.** `ExpenseCategoryManager` (`title="Nhóm chi"`, `entityLabel="nhóm chi"`, `idPrefix="expenseCategory"`) với fields `categoryName` ("Tên nhóm chi") và `metric` ("Dùng để tính", `type: "select"`, `defaultValue: "none"`, options Giống `seed` / Thức ăn `feed` / Không `none`). `CatalogManager`: `emptyItem()` dùng `defaultValue ?? ""`; `buildPayload` với `select` gán thẳng giá trị. Thêm `<ExpenseCategoryManager />` sau `PondManager`.
- [ ] **Step 4: Chạy** `npm test` → PASS (các test Catalog cũ không đổi).
- [ ] **Step 5: Commit** `feat(fe): expense category catalog and expense API`.

### Task 5: `ExpenseForm` + thanh Hoàn tác

**Files:**
- Create: `src/views/Expenses/components/ExpenseForm.vue`, `src/views/Expenses/components/ExpenseUndoBar.vue`
- Test: `tests/views/ExpenseForm.test.js`, `tests/views/ExpenseUndoBar.test.js`

**Interfaces:**
- Consumes: `ExpenseCategoryAPI.getExpenseCategories`, `CropAPI.getCrops`, `ExpenseAPI.{ createExpense, updateExpense, deleteExpense, getExpenseSuggestions }`.
- Produces: `ExpenseForm.vue` props `{ open: Boolean, expense: Object|null (null = thêm mới), defaultCropId: String|null (null = "Chung"; bỏ trống = không chọn sẵn) }`, emits `close`, `saved({ expense, isNew })`, `deleted(expense)`. Mỗi lần `open` → true: tải nhóm chi + `getCrops({ status: "open" })`, điền form (sửa: từ `expense`; thêm: ngày hôm nay, vụ = `defaultCropId`).
- Produces: `ExpenseUndoBar.vue` props `{ expense: Object|null }`, hiện "Đã lưu <mô tả hoặc tên nhóm> · <số tiền>" + nút "Hoàn tác" trong 10 giây kể từ khi `expense` đổi; bấm → `ExpenseAPI.deleteExpense(expense._id)` → emit `undone`; hết giờ → emit `expired`.

- [ ] **Step 1: Viết test hỏng**
  - `tests/views/ExpenseForm.test.js` (mock 3 API; nhóm Giống `seed`, Cám `feed`, Điện `none`; vụ mở `c1` của Ao 1):
    - lưới nhóm chi (`#expenseCategory` `ChoiceGrid`) và lưới vụ (`#expenseCrop`: "Ao 1" + "Chung"); `defaultCropId: "c1"` → "Ao 1" `aria-pressed="true"`; `defaultCropId: null` → "Chung" được chọn.
    - nút Lưu bị khóa khi chưa chọn nhóm hoặc số tiền ≤ 0.
    - nhập số lượng `"10"` và đơn giá `"350.000"` → hiện "3.500.000 đ" (chỉ đọc), ô số tiền ẩn; lưu → `createExpense` với `{ categoryId, cropId: "c1", date: todayInputValue(), description, quantity: 10, unit, unitPrice: 350000, kgPerUnit: null, amount: 3500000, note: "" }` → emit `saved` với `isNew: true`.
    - chỉ nhập số tiền `"600.000"` → `amount: 600000`, `quantity: null`, `unitPrice: null`.
    - chọn nhóm Cám → gọi `getExpenseSuggestions("cam-id")`; ô đơn vị điền sẵn `data[0].unit` ("bao"); đơn vị khác "kg" → hiện ô "kg / 1 bao" (`#expense-kgPerUnit`); nhóm Điện → không có ô này.
    - chọn một gợi ý mô tả (`.expense-form__suggestion`) → điền mô tả, đơn vị, đơn giá, kg/bao.
    - sửa khoản chi của vụ đã kết thúc (`expense.crop = { _id: "c0", cropName: "Ao 2 · Vụ 01/2026", status: "closed", pond: { pondName: "Ao 2" } }`) → lưới vụ có thêm "Ao 2" và đang được chọn; lưu → `updateExpense("e1", { ..., cropId: "c0" })`, emit `saved` với `isNew: false`.
    - chế độ sửa có nút "Xóa" → `window.confirm("Xóa khoản chi này?")` → `deleteExpense("e1")` → emit `deleted`.
    - lỗi server → hiện message, không emit.
  - `tests/views/ExpenseUndoBar.test.js` (`vi.useFakeTimers()`): hiện chữ và nút; bấm "Hoàn tác" → `deleteExpense` + emit `undone`; sau 10.000 ms → ẩn + emit `expired`; `expense` null → không hiện gì.
- [ ] **Step 2: Chạy** `npx vitest run ExpenseForm ExpenseUndoBar` → FAIL.
- [ ] **Step 3: Cài đặt.** `ExpenseForm` trong `BottomSheet` (tiêu đề "Thêm khoản chi" / "Sửa khoản chi"); các ô: nhóm (`ChoiceGrid`, `maxVisible` 8), ao/vụ (`ChoiceGrid`, giá trị "Chung" là chuỗi đặc biệt `"__common"` ở UI, gửi `cropId: null`), ngày (`<input type="date" id="expense-date">`), mô tả (`CPInput` `#expense-description` + danh sách gợi ý lọc theo chữ đã gõ bằng `normalizeVi`), số lượng `#expense-quantity`, đơn vị `#expense-unit`, đơn giá `#expense-unitPrice`, kg/đơn vị `#expense-kgPerUnit` (chỉ nhóm `feed` và đơn vị khác "kg"), số tiền `#expense-amount` (ẩn khi đã tự tính), ghi chú `#expense-note`; nút `primary` "Lưu" (`.btn-expense-save`) và `danger` "Xóa" (`.btn-expense-delete`, chỉ khi sửa). `ExpenseUndoBar` là thanh cố định phía dưới (trên điện thoại nằm trên `MobileTabBar` nếu có, ở đây các trang không có tab bar nên `bottom: 16px`).
- [ ] **Step 4: Chạy** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(fe): expense form with suggestions and undo`.

### Task 6: Trang Chi phí (`/chi-phi`)

**Files:**
- Create: `src/views/Expenses/ExpensesView.vue`
- Modify: `src/router/index.js`, `src/components/AppNav.vue`, `src/components/AppTopBar.vue`, `tests/router.test.js`, `tests/App.test.js`, `tests/components/AppTopBar.test.js`
- Test: `tests/views/ExpensesView.test.js`

**Interfaces:**
- Consumes: `ExpenseAPI.getExpenses`, `CropAPI.getCrops`, `ExpenseForm`, `ExpenseUndoBar` (Task 5).
- Produces: route `{ path: "/chi-phi", name: "expenses", component: ExpensesView }`; link `{ name: "expenses", text: "Chi phí" }` sau "Vụ nuôi" trong `AppNav`/`AppTopBar` (menu: Cân cá, Vụ nuôi, Chi phí, Danh mục, Nhật ký).

- [ ] **Step 1: Viết test hỏng** — `tests/views/ExpensesView.test.js` (mock `expenseAPI`, `cropAPI`, `expenseCategoryAPI`):
  - tải `getExpenses({ page: 1, pageSize: 20 })` và hiện mỗi khoản một dòng `.expense-row` gồm ngày "dd/MM/yyyy", tên nhóm, mô tả, tên ao hoặc "Chung", "3.500.000 đ"; dòng tổng "Tổng: <totalAmount>".
  - bộ lọc `#expenseScope` (`CPSelect`: "Tất cả" `all`, "Chung" `common`, rồi mỗi vụ `crop:<id>` với nhãn tên vụ) → chọn "Chung" gọi `getExpenses({ common: 1, page: 1, pageSize: 20 })`; chọn vụ gọi với `cropId`.
  - bộ lọc `#expenseMonth` ("Tất cả tháng" `""` + 12 tháng gần nhất `"YYYY-MM"`, nhãn "09/2026") → gửi `from`/`to` là ngày đầu và cuối tháng.
  - phân trang: `total 45` → "Trang 1 / 3", "Sau" gọi `page: 2`, "Trước" bị khóa ở trang 1.
  - bấm "＋ Chi phí" (`.btn-add-expense`) mở `ExpenseForm` với `expense null`; `saved` với `isNew: true` → tải lại + `ExpenseUndoBar` nhận khoản vừa lưu; `undone` → tải lại.
  - bấm một dòng → `ExpenseForm` với `expense` đó.
  - danh sách trống → "Chưa có khoản chi."
  - cập nhật các test menu có sẵn (`router.test.js`, `App.test.js`, `AppTopBar.test.js`) với "Chi phí" và route `expenses`.
- [ ] **Step 2: Chạy** `npx vitest run ExpensesView router App AppTopBar` → FAIL.
- [ ] **Step 3: Cài đặt.** Trên điện thoại (`useIsMobile`) đặt `setTopBarAction("＋ Chi phí", openAdd)` và xóa khi rời trang (như `ManagementFishViews`); desktop hiện nút ở đầu trang. Bộ lọc tháng tính từ ngày hiện tại của máy.
- [ ] **Step 4: Chạy** `npm test` → PASS. Chạy thử với `dev:local` (preview `dev-backend` + `fe-dev`): thêm khoản cám có số lượng × đơn giá, hoàn tác, lọc theo vụ/tháng, xem khổ 375px không tràn ngang.
- [ ] **Step 5: Commit** `feat(fe): expenses page with filters and paging`.

### Task 7: Báo cáo vụ + số tạm tính trên thẻ ao

**Files:**
- Create: `src/views/Crops/CropReportView.vue`
- Modify: `src/router/index.js`, `src/components/AppTopBar.vue` (tiêu đề theo `route.meta.title` khi không có trong menu), `src/views/Crops/CropsView.vue`, `src/views/Crops/components/PondCard.vue`, `src/views/ManagementFish/ManagementFishViews.vue` (nhận `?session=`)
- Test: `tests/views/CropReportView.test.js`, cập nhật `tests/views/CropsView.test.js`, `tests/components/AppTopBar.test.js`, thêm case vào `tests/views/ManagementFishViews.mobile.test.js`

**Interfaces:**
- Consumes: `CropAPI.{ getCropReport, closeCrop, reopenCrop }`, `ExpenseAPI.getExpenses`, `ExpenseForm`, `ExpenseUndoBar`, `CropSheet` (giai đoạn 1).
- Produces: route `{ path: "/vu-nuoi/:cropId", name: "crop-report", component: CropReportView, meta: { title: "Báo cáo vụ" } }`.
- Produces: `PondCard` props thêm `report: Object|null` (kết quả `getCropReport` của vụ mở), emits thêm `open(crop)` và `addExpense(crop)`; thẻ hiện "Thu", "Chi", "Lãi tạm tính"/"Lỗ tạm tính" khi có `report`.
- Produces: `ManagementFishViews` khi mount có `route.query.session` trùng một phiên → chọn phiên đó thay vì phiên đang mở.

- [ ] **Step 1: Viết test hỏng**
  - `tests/views/CropReportView.test.js` (router bộ nhớ tại `/vu-nuoi/c1`; mock `cropAPI`, `expenseAPI`, `expenseCategoryAPI`; `report` mẫu lãi và mẫu lỗ):
    - đầu trang: tên ao, tên vụ, "Thả ngày 01/09/2026", "26 ngày", trạng thái; ba ô `.report-kpi` "Tổng thu" / "Tổng chi" / "Lãi" với số tiền; khi `profit < 0` ô thứ ba ghi "Lỗ" và có class `report-kpi--loss` (số hiển thị không dấu trừ).
    - mục Thu: mỗi phiên một dòng; phiên `missingPrice` có "⚠ Chưa có giá, chưa tính vào thu" và link `href="#/?session=<id>"`; `excludedForeignCurrency 2` → "Có 2 phiên bằng USD không được tính".
    - mục Chi: mỗi nhóm "Cám · 43,8%"; bấm nhóm → `getExpenses({ cropId: "c1", categoryId, page: 1, pageSize: 100 })` và hiện các khoản bên dưới; bấm lại → thu gọn.
    - mục Chỉ số: "Giá vốn / kg", "Giống: 5.000 con", "Thức ăn: 10 bao · 50 kg", "Hệ số thức ăn: 1,25"; `fcr null` → không có dòng hệ số; `costPerKg null` → "—".
    - vụ đang nuôi có nút "Kết thúc vụ" (mở `CropSheet` mode `close`); vụ đã kết thúc có nút "Mở lại vụ" → `reopenCrop("c1")` → tải lại.
    - "＋ Chi phí" mở `ExpenseForm` với `defaultCropId: "c1"`; `saved` → tải lại báo cáo + `ExpenseUndoBar`.
    - lỗi tải → "Không thể tải báo cáo vụ, vui lòng thử lại sau."
  - `tests/views/CropsView.test.js`: với vụ mở, gọi `getCropReport("c1")` và thẻ hiện "Thu", "Chi", "Lãi tạm tính"; bấm thẻ (`.pond-card__body`) → `router.push({ name: "crop-report", params: { cropId: "c1" } })`; bấm dòng vụ đã kết thúc → cùng route; nút "＋ Chi phí" trên thẻ mở `ExpenseForm` với `defaultCropId: "c1"`; `getCropReport` lỗi → thẻ vẫn hiện, không có số tiền.
  - `tests/components/AppTopBar.test.js`: route có `meta.title "Báo cáo vụ"` → tiêu đề "Báo cáo vụ".
  - `tests/views/ManagementFishViews.mobile.test.js`: `mountAt("/?session=s1")` → `getDataFish` gọi với `"s1"`; `?session=khong-co` → phiên đang mở.
- [ ] **Step 2: Chạy** `npx vitest run CropReportView CropsView AppTopBar ManagementFishViews` → FAIL.
- [ ] **Step 3: Cài đặt.** `CropsView` gọi `getCropReport` song song cho các vụ mở sau khi tải danh sách (lỗi từng vụ bỏ qua). `CropsView` dùng `inject(routerKey)` như `ManagementFishViews` để test không router vẫn chạy. Phần trăm hiển thị dấu phẩy thập phân (`43,8%`), số lượng bằng `toLocaleString("vi-VN")`. Mục Chi mỗi nhóm là `button` cao ≥ 44px.
- [ ] **Step 4: Chạy** `npm test` → PASS. Chạy thử với `dev:local`: thẻ Ao 1 có số tạm tính, mở báo cáo, bấm nhóm Cám xem khoản chi, thêm chi phí từ báo cáo, link phiên thiếu giá mở đúng phiên; khổ 375px không tràn ngang.
- [ ] **Step 5: Cập nhật** `E:\Source\management-fish\CLAUDE.md` (không commit): `/chi-phi`, `ExpenseForm`/`ExpenseUndoBar`, `/vu-nuoi/:cropId`, `route.meta.title`, `?session=`, `type: "select"` của `CatalogManager`.
- [ ] **Step 6: Commit** `feat(fe): crop report page and provisional totals on pond cards`.

## Phát hành giai đoạn 2

Deploy BE → `npm run migrate:expense-categories -- --dry-run` rồi chạy thật → deploy FE.
