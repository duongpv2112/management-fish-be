# Ao + vụ nuôi + gắn phiên bán (giai đoạn 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quản lý ao và vụ nuôi, và gắn mỗi phiên bán vào vụ của một ao, để giai đoạn 2 tính được thu/chi/lãi theo vụ.

**Architecture:** Backend thêm hai resource `pond` và `crop` theo đúng mẫu route → controller → service → model hiện có, thêm trường `crop` vào `weigh-session` và endpoint `updateSessionCrop`. Frontend thêm quản lý Ao trong Danh mục, trang `/vu-nuoi` và thay `window.prompt` của "Phiên mới" bằng sheet chọn ao; thêm sheet "Chọn ao" cho phiên chưa gán.

**Tech Stack:** Node/Express/Mongoose + Jest/Supertest/mongodb-memory-server (BE); Vue 3.4 + Vite + Vitest/@vue/test-utils (FE).

**Spec:** `management-fish-be/docs/superpowers/specs/2026-09-27-crop-profit-design.md` — giai đoạn 1 = mục 2.1, 2.2 (trừ `getCropReport`), 2.5; FE 3.1 (Ao), 3.2 (không có số thu/chi, thẻ chưa bấm vào được), 3.5.

## Global Constraints

- Hai repo độc lập. BE làm trên nhánh `feature/crop-profit` (đã có). FE tạo nhánh `feature/crop-profit` từ nhánh hiện tại `feature/ui-polish`. **Không commit** `management-fish-fe/src/assets/configs/env.js` (đang sửa cục bộ).
- Commit bằng tác giả của repo: `git -c user.name=duongpv2112 -c user.email=duongpd12@gmail.com commit ...`, message kết thúc bằng dòng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Model: `_id` String `uuid.v4()`, `isDelete` (xóa mềm), `createdBy`/`modifiedBy` mặc định `"admin"`, `{ timestamps: true }`.
- Service ghi trả `{ ok: true, data } | { ok: false, message? }`; mọi thao tác ghi (thành công và thất bại) gọi `writeLog(stepName, data)` → `LogTracking` như `basketType.service.js`.
- Controller trả `{ success, data, message }`, HTTP 200 kể cả lỗi nghiệp vụ; message tiếng Việt.
- Message lỗi chính xác (copy nguyên văn): "Tên ao không được để trống!", "Tên ao đã tồn tại!", "Diện tích ao không hợp lệ!", "Ao đang có vụ nuôi, hãy kết thúc vụ trước!", "Ao này đang có vụ nuôi!", "Vụ còn phiên bán đang mở, hãy kết thúc phiên trước!", "Ngày kết thúc phải sau ngày bắt đầu!", "Vụ đã có dữ liệu, không xóa được!", "Vụ đã kết thúc, hãy chọn vụ đang nuôi!", "Tên vụ không được để trống!", "Ngày không hợp lệ!", "Không tìm thấy dữ liệu!".
- Ngày của vụ (`startDate`, `endDate`) là **ngày lịch Việt Nam**, lưu dạng `Date` lúc 00:00 UTC của ngày đó. Nhận `"YYYY-MM-DD"`; bỏ trống = hôm nay theo `Asia/Ho_Chi_Minh`.
- FE: UI tiếng Việt; tên file service viết thường (`pondAPI.js`, `cropAPI.js`); component dùng chung import với tiền tố `CP`; `@media (max-width: 899.98px)` cho điện thoại; chạm ≥ 44px trên điện thoại; mount test **không** dùng `attachTo`.

## Review Focus

1. **Bấm "Bắt đầu vụ" hai lần cùng lúc cho một ao** → chỉ còn đúng một vụ mở, request thứ hai nhận "Ao này đang có vụ nuôi!" (Task 2, test đồng thời).
2. **Kết thúc vụ cùng ngày với ngày thả** → hợp lệ; so sánh theo ngày lịch, không theo giờ (Task 2).
3. **Ao đã xóa mềm** → không bắt đầu vụ mới / mở lại vụ được ("Không tìm thấy dữ liệu!"), nhưng phiên cũ vẫn hiện tên ao (populate không lọc `isDelete`) (Task 2, Task 3).
4. **`cropId` rỗng (`""`/`null`) khi tạo phiên** → tạo phiên không gán vụ, không báo lỗi (Task 3).
5. **Sửa ao có diện tích trống** → ô sửa hiện trống chứ không phải chữ "null"; lưu trống gửi `area: null` (Task 4).

---

## Backend (`management-fish-be/`)

### Task 1: Ao (`pond`) — model, service, API

**Files:**
- Create: `app/models/pond.js`, `app/services/pond.service.js`, `app/controllers/pond.controller.js`, `app/routes/pond.routes.js`
- Modify: `app.js` (require `./app/routes/pond.routes`)
- Test: `tests/pond.test.js`

**Interfaces:**
- Produces: model `mongoose.model("pond", ...)` với `pondName: { type: String, required: true, unique: true }`, `area: { type: Number, default: null }`, `note: { type: String, default: "" }`.
- Produces: `pondService.{ getListPond(), createPond(data), updatePond(pondId, data), deletePond(pondId) }`.
- Produces: `GET /api/ponds/getPonds`, `POST /api/ponds/createPonds`, `PUT /api/ponds/updatePonds/:pondId`, `DELETE /api/ponds/deletePonds/:pondId`. Controller messages: "Lấy danh sách ao thành công!", "Tạo ao thành công!", "Cập nhật ao thành công!", "Xóa ao thành công!" (và "… không thành công!" khi service không có `message`).

- [ ] **Step 1: Viết test hỏng** — `tests/pond.test.js`, dựng theo `tests/basketType.test.js` (helper `create/update/remove` + `authHeader()`):
  - `"thêm ao, tên được trim"`: `create({ pondName: " Ao 1 ", area: 500 })` → `success true`, `message "Tạo ao thành công!"`, `data.pondName "Ao 1"`, `data.area 500`, có 1 log `/Thêm mới ao/`.
  - `"diện tích bỏ trống → null"`: `create({ pondName: "Ao 2", area: "" })` → `data.area === null`; `area: null` cũng vậy.
  - `test.each([0, -5, "abc"])("diện tích %j không hợp lệ")` → `message "Diện tích ao không hợp lệ!"` cho cả create và update.
  - `"tên rỗng"` → "Tên ao không được để trống!".
  - `"trùng tên khác hoa thường"` (create và update) → "Tên ao đã tồn tại!".
  - `"xóa mềm rồi thêm lại tên cũ → khôi phục cùng _id"` → `data._id` bằng id cũ, `area` là giá trị mới; danh sách `getPonds` không chứa ao đã xóa.
  - `"danh sách theo thứ tự tạo"` → `["Ao 1", "Ao 2"]`.
  - `"id không tồn tại"` → update/delete trả "Không tìm thấy dữ liệu!".
- [ ] **Step 2: Chạy** `npx jest --runInBand pond` → FAIL (404 / route chưa có).
- [ ] **Step 3: Cài đặt** model, service, controller, routes theo đúng `basketType.*` (tên so sánh bằng `nameFilter` trim + `i`, khôi phục bản ghi đã xóa, bắt `error.code === 11000` → trùng tên). `parseArea(value)`: `""`/`null`/`undefined` → `null`; số hữu hạn `> 0` → số; còn lại → không hợp lệ. `getListPond` sort `{ createdAt: 1 }`. Log dùng tiền tố "Thêm mới ao", "Khôi phục ao", "Cập nhật ao", "Xóa ao". Chưa có kiểm tra vụ mở khi xóa (Task 2 thêm).
- [ ] **Step 4: Chạy** `npx jest --runInBand pond` → PASS; `npm test` → toàn bộ PASS.
- [ ] **Step 5: Commit** `feat(be): pond catalog`.

### Task 2: Vụ nuôi (`crop`) — model, service, API

**Files:**
- Create: `app/models/crop.js`, `app/common/dateOnly.js`, `app/services/crop.service.js`, `app/controllers/crop.controller.js`, `app/routes/crop.routes.js`
- Modify: `app.js`; `app/models/weighSession.js` (thêm `crop: { type: String, ref: "crop", default: null }`); `app/services/pond.service.js` (`deletePond` chặn khi ao có vụ mở)
- Test: `tests/crop.test.js`, `tests/dateOnly.test.js`, thêm case vào `tests/pond.test.js`

**Interfaces:**
- Consumes: model `pond` (Task 1).
- Produces: `dateOnly.js` → `toDateOnly(value?: string|Date): Date|null` (bỏ trống → hôm nay theo `Asia/Ho_Chi_Minh`; `"YYYY-MM-DD"` → `new Date(Date.UTC(y, m-1, d))`; `Date` → ngày lịch VN của thời điểm đó; sai định dạng/ngày không tồn tại → `null`) và `formatMonthYear(date: Date): string` → `"MM/yyyy"`.
- Produces: model `mongoose.model("crop", ...)`: `pond` (String, ref `"pond"`, required), `cropName` (String, required), `startDate` (Date, required), `endDate` (Date, default null), `status` (`"open"|"closed"`, default `"open"`), `note`, cùng các trường chung. Index `{ pond: 1, status: 1 }` unique, `partialFilterExpression: { status: "open", isDelete: false }`.
- Produces: `cropService.{ getListCrop({ pondId?, status? }), createCrop({ pondId, cropName?, startDate?, note? }), updateCrop(cropId, { cropName, startDate, note }), closeCrop(cropId, { endDate? }), reopenCrop(cropId), deleteCrop(cropId) }`.
- Produces: `GET /api/crops/getCrops?pondId=&status=`, `POST /api/crops/createCrops`, `PUT /api/crops/updateCrops/:cropId`, `PUT /api/crops/closeCrops/:cropId`, `PUT /api/crops/reopenCrops/:cropId`, `DELETE /api/crops/deleteCrops/:cropId`. Mỗi phần tử danh sách có `pond` đã populate (`{ _id, pondName, isDelete }`). Controller messages: "Lấy danh sách vụ nuôi thành công!", "Bắt đầu vụ nuôi thành công!", "Cập nhật vụ nuôi thành công!", "Kết thúc vụ nuôi thành công!", "Mở lại vụ nuôi thành công!", "Xóa vụ nuôi thành công!".

- [ ] **Step 1: Viết test hỏng**
  - `tests/dateOnly.test.js`: `toDateOnly("2026-09-27").toISOString() === "2026-09-27T00:00:00.000Z"`; `toDateOnly("2026-02-30") === null`; `toDateOnly("abc") === null`; `toDateOnly(new Date("2026-09-27T20:00:00Z")).toISOString() === "2026-09-28T00:00:00.000Z"` (đã sang ngày 28 ở VN); `formatMonthYear(toDateOnly("2026-03-05")) === "03/2026"`.
  - `tests/crop.test.js` (tạo sẵn `ao1 = Pond.create({ pondName: "Ao 1" })`):
    - `"bắt đầu vụ với tên mặc định"`: `createCrops({ pondId: ao1._id, startDate: "2026-03-05" })` → `status "open"`, `cropName "Ao 1 · Vụ 03/2026"`, `startDate "2026-03-05T00:00:00.000Z"`, có log `/Bắt đầu vụ/`.
    - `"ao đã có vụ mở"` → lần hai trả "Ao này đang có vụ nuôi!".
    - `"hai request đồng thời"`: `Promise.all` hai `createCrops` cùng ao → đúng 1 `success true`, còn lại message "Ao này đang có vụ nuôi!", `Crop.countDocuments({ status: "open" }) === 1`.
    - `"ao khác nhau mỗi ao một vụ mở"` → cả hai thành công.
    - `"ao không tồn tại hoặc đã xóa"` → "Không tìm thấy dữ liệu!"; `startDate: "abc"` → "Ngày không hợp lệ!".
    - `"kết thúc vụ cùng ngày thả"`: start `"2026-09-27"`, `closeCrops` với `{ endDate: "2026-09-27" }` → `status "closed"`, `endDate` đúng ngày.
    - `"kết thúc trước ngày thả"` → "Ngày kết thúc phải sau ngày bắt đầu!".
    - `"kết thúc khi còn phiên mở"`: `WeighSession.create({ sessionName: "P", crop: crop._id })` → "Vụ còn phiên bán đang mở, hãy kết thúc phiên trước!"; phiên `status: "closed"` thì kết thúc được.
    - `"kết thúc xong bắt đầu vụ mới"` → thành công, ao có 1 vụ mở + 1 vụ đóng.
    - `"mở lại vụ"` → `status "open"`, `endDate null`; khi ao đã có vụ mở khác → "Ao này đang có vụ nuôi!"; khi ao đã bị xóa → "Không tìm thấy dữ liệu!".
    - `"sửa vụ"`: đổi tên (trim) và ngày thả; tên rỗng → "Tên vụ không được để trống!"; ngày thả sau `endDate` của vụ đã đóng → "Ngày kết thúc phải sau ngày bắt đầu!".
    - `"xóa vụ"`: vụ trống → xóa mềm; vụ có phiên (`WeighSession.create({ crop })`) → "Vụ đã có dữ liệu, không xóa được!".
    - `"danh sách"`: lọc `pondId`, `status`; vụ mở đứng trước, rồi `startDate` giảm dần; `pond.pondName` có trong kết quả.
  - `tests/pond.test.js` thêm: `"không xóa ao đang có vụ mở"` → "Ao đang có vụ nuôi, hãy kết thúc vụ trước!"; vụ đã đóng thì xóa được.
- [ ] **Step 2: Chạy** `npx jest --runInBand crop dateOnly pond` → FAIL.
- [ ] **Step 3: Cài đặt.** `createCrop` gọi `Crop.init()` trước khi ghi (giống `ensureIndexes` của phiên) và map `error.code === 11000` → "Ao này đang có vụ nuôi!". Tên mặc định: `` `${pond.pondName} · Vụ ${formatMonthYear(startDate)}` ``. So sánh ngày: `endDate.getTime() < startDate.getTime()` → lỗi. Kiểm tra phiên mở: `WeighSession.exists({ crop: cropId, status: "open", isDelete: false })`. `deleteCrop` chặn khi `WeighSession.exists({ crop: cropId, isDelete: false })` (giai đoạn 2 sẽ thêm khoản chi). `getListCrop` sort theo `status` (`open` trước) rồi `startDate: -1`, populate `pond`. Log: "Bắt đầu vụ", "Cập nhật vụ", "Kết thúc vụ", "Mở lại vụ", "Xóa vụ" + tên vụ.
- [ ] **Step 4: Chạy** `npm test` → toàn bộ PASS.
- [ ] **Step 5: Commit** `feat(be): crops per pond with one open crop each`.

### Task 3: Gắn phiên bán vào vụ

**Files:**
- Modify: `app/services/weighSession.service.js`, `app/controllers/weighSession.controller.js`, `app/routes/weighSession.routes.js`, `scripts/dev-local.js`
- Test: `tests/sessionCrop.test.js`

**Interfaces:**
- Consumes: model `crop`, `pond` (Task 1–2); trường `WeighSession.crop` (Task 2).
- Produces: `createWeighSession({ sessionName?, buyerName?, currency?, cropId? })`; `updateSessionCrop(sessionId, cropId|null)`; `PUT /api/weigh-sessions/updateSessionCrop/:sessionId` body `{ cropId }`, message "Cập nhật ao cho phiên thành công!".
- Produces: `getWeighSessions` và `getOpenWeighSession` trả `crop` dạng `{ _id, cropName, status, pond: { _id, pondName } } | null` (populate `{ path: "crop", populate: { path: "pond" } }`).

- [ ] **Step 1: Viết test hỏng** — `tests/sessionCrop.test.js`:
  - `"tạo phiên với vụ đang mở"` → `data.crop === crop._id`; `getWeighSessions` trả `crop.cropName` và `crop.pond.pondName "Ao 1"`.
  - `test.each(["", null, undefined])("cropId %j → phiên không gán vụ")` → `success true`, `crop null`.
  - `"vụ đã kết thúc"` → "Vụ đã kết thúc, hãy chọn vụ đang nuôi!"; `"vụ không tồn tại"` → "Không tìm thấy dữ liệu!"; cả hai không tạo phiên và **không đóng** phiên đang mở.
  - `"phiên tự tạo khi cân không có vụ"`: `getOrCreateOpenSession()` → `crop null`.
  - `"gán / đổi / bỏ gán vụ"`: `updateSessionCrop` với vụ đã kết thúc vẫn được (phiên cũ), `{ cropId: null }` → `crop null`; có log `/Gán ao cho phiên/`; phiên hoặc vụ không tồn tại → "Không tìm thấy dữ liệu!".
  - `"ao đã xóa mềm vẫn hiện tên"`: gán phiên vào vụ đã đóng, xóa mềm ao → `getWeighSessions` vẫn có `crop.pond.pondName`.
  - `"getOpenWeighSession có crop.pond"`.
- [ ] **Step 2: Chạy** `npx jest --runInBand sessionCrop` → FAIL.
- [ ] **Step 3: Cài đặt.** Trong `createWeighSession`, kiểm tra `cropId` (nếu truthy) **trước** `closeSessionDocument(open)`: vụ chưa xóa → nếu `status !== "open"` trả lỗi. `updateSessionCrop` chấp nhận vụ mở hoặc đã đóng, log "Gán ao cho phiên: '<sessionName>' …". Controller `updateSessionCrop` đọc `req.body?.cropId`. `scripts/dev-local.js`: seed thêm "Ao 1" (có vụ mở), "Ao 2" (không có vụ) và gán phiên demo vào vụ của Ao 1.
- [ ] **Step 4: Chạy** `npm test` → PASS. Chạy `npm run dev:local`, gọi `GET /api/weigh-sessions/getWeighSessions` (sau khi login mật khẩu `dev-local`) → phiên demo có `crop.pond.pondName "Ao 1"`.
- [ ] **Step 5: Cập nhật tài liệu** trong `E:\Source\management-fish\CLAUDE.md` (không thuộc repo, không commit): mục Backend — thêm resource `pond`, `crop` vào danh sách, quy tắc một vụ mở mỗi ao, `dateOnly`, `crop` trên phiên, `updateSessionCrop`.
- [ ] **Step 6: Commit** `feat(be): attach weigh sessions to crops`.

## Frontend (`management-fish-fe/`)

### Task 4: Nhánh FE, API modules, quản lý Ao trong Danh mục

**Files:**
- Create: `src/services/pondAPI.js`, `src/services/cropAPI.js`, `src/views/Catalog/components/PondManager.vue`
- Modify: `src/services/weighSessionAPI.js`, `src/views/Catalog/components/CatalogManager.vue`, `src/views/Catalog/CatalogView.vue`
- Test: `tests/views/PondManager.test.js`

**Interfaces:**
- Produces: `PondAPI.{ getPonds(), createPond(data), updatePond(id, data), deletePond(id) }`; `CropAPI.{ getCrops(params?: { pondId?, status? }), createCrop(data), updateCrop(id, data), closeCrop(id, data?), reopenCrop(id), deleteCrop(id) }` — đường dẫn đúng như Task 1–2; `WeighSessionAPI.updateSessionCrop(id, cropId)` → `PUT /weigh-sessions/updateSessionCrop/:id { cropId }`.
- Produces: field config của `CatalogManager` có thêm `optional: true` (chỉ cho `type: "number"`): ô trống → gửi `null`, không báo lỗi.

- [ ] **Step 1: Tạo nhánh** `git checkout -b feature/crop-profit` (từ `feature/ui-polish`); `git status` chỉ còn `env.js` đã sửa.
- [ ] **Step 2: Viết test hỏng** — `tests/views/PondManager.test.js` (mock `@/services/pondAPI`, dựng theo `tests/views/BasketTypeManager.test.js`):
  - hiển thị tiêu đề "Ao", cột "Tên ao" và "Diện tích (m²)".
  - thêm "Ao 3" để trống diện tích → `createPond` được gọi với `{ pondName: "Ao 3", area: null }`.
  - thêm "Ao 4" với diện tích `"1200,5"` → `createPond({ pondName: "Ao 4", area: 1200.5 })` (dùng `common.parseDecimal`).
  - sửa ao có `area: null` → ô sửa `#pond-edit-area` có giá trị `""` (không phải `"null"`).
  - server trả lỗi "Tên ao đã tồn tại!" → hiện nguyên văn.
- [ ] **Step 3: Chạy** `npx vitest run PondManager` → FAIL.
- [ ] **Step 4: Cài đặt.** `PondManager.vue` như `BasketTypeManager.vue` với `title="Ao"`, `entityLabel="ao"`, `idPrefix="pond"`, fields `pondName` ("Tên ao", placeholder "Nhập tên ao") và `area` ("Diện tích (m²)", `type: "number"`, `optional: true`, placeholder "Không bắt buộc", `invalidMessage: "Diện tích ao không hợp lệ!"`). `CatalogManager`: trong `buildPayload`, field `optional` với giá trị trống → `null`; `startEdit` đổi `null`/`undefined` → `""`. Thêm `<PondManager />` vào `CatalogView` sau `BasketTypeManager`. Viết `pondAPI.js`, `cropAPI.js` và `updateSessionCrop` theo mẫu `basketTypeAPI.js` (`getCrops(params)` dùng `get(url, { params })`).
- [ ] **Step 5: Chạy** `npm test` → toàn bộ PASS (các test Catalog cũ không đổi).
- [ ] **Step 6: Commit** `feat(fe): pond catalog and crop API` (không add `env.js`).

### Task 5: Trang Vụ nuôi (`/vu-nuoi`)

**Files:**
- Create: `src/views/Crops/CropsView.vue`, `src/views/Crops/components/PondCard.vue`, `src/views/Crops/components/CropSheet.vue`, `src/common/dateInput.js`
- Modify: `src/router/index.js`, `src/components/AppNav.vue`, `src/components/AppTopBar.vue`
- Test: `tests/views/CropsView.test.js`, `tests/views/CropSheet.test.js`, `tests/common/dateInput.test.js`, cập nhật `tests/components/AppTopBar.test.js` nếu có kiểm tra danh sách link

**Interfaces:**
- Consumes: `PondAPI.getPonds`, `CropAPI.{ getCrops, createCrop, closeCrop }` (Task 4).
- Produces: route `{ path: "/vu-nuoi", name: "crops", component: CropsView }`; link `{ name: "crops", text: "Vụ nuôi" }` đứng sau "Cân cá" trong `AppNav` và `AppTopBar`.
- Produces: `dateInput.js` → `todayInputValue(): string` (`"YYYY-MM-DD"` theo giờ máy) và `daysBetween(start: string|Date, end?: string|Date): number` (số ngày theo lịch, `end` mặc định hôm nay, tối thiểu 0).
- Produces: `CropSheet.vue` props `{ open: Boolean, mode: "start"|"close", pond: Object|null, crop: Object|null }`, emits `close`, `saved(crop)`.
- Produces: `PondCard.vue` props `{ pond, openCrop: Object|null }`, emits `start(pond)`, `close(crop)`.

- [ ] **Step 1: Viết test hỏng**
  - `tests/common/dateInput.test.js`: `daysBetween("2026-09-01", "2026-09-27") === 26`; `daysBetween("2026-09-27", "2026-09-27") === 0`; `todayInputValue()` khớp `/^\d{4}-\d{2}-\d{2}$/`.
  - `tests/views/CropsView.test.js` (mock `pondAPI`, `cropAPI`; ponds `Ao 1`, `Ao 2`; crops: vụ mở của Ao 1 `startDate "2026-09-01"`, một vụ đã đóng của Ao 2):
    - mỗi ao một `.pond-card`; thẻ Ao 1 có tên vụ, "Thả ngày 01/09/2026" và "ngày" (số ngày), nút "Kết thúc vụ"; thẻ Ao 2 có nút "Bắt đầu vụ mới".
    - mục "Vụ đã kết thúc" liệt kê vụ đã đóng với khoảng ngày.
    - không có ao → chữ "Chưa có ao" và link tới `#/danh-muc`.
    - lỗi tải → hiện thông báo lỗi.
  - `tests/views/CropSheet.test.js`:
    - mode `start`: ô ngày mặc định `todayInputValue()`, ô tên trống có placeholder "Để trống để tự đặt tên"; bấm "Bắt đầu vụ" → `createCrop({ pondId, cropName: undefined, startDate })` (tên trim, trống → không gửi) → emit `saved`.
    - mode `close`: bấm "Kết thúc vụ" → `closeCrop(crop._id, { endDate })` → emit `saved`; server trả "Vụ còn phiên bán đang mở, hãy kết thúc phiên trước!" → hiện lỗi, không emit.
- [ ] **Step 2: Chạy** `npx vitest run CropsView CropSheet dateInput` → FAIL.
- [ ] **Step 3: Cài đặt.** `CropsView` tải song song `getPonds()` và `getCrops()`, map `openCrop` theo `crop.pond._id` và `status === "open"`; mở `CropSheet` từ sự kiện của `PondCard`; sau `saved` tải lại. Trang có tiêu đề "Vụ nuôi" giống `CatalogView`. `CropSheet` dùng `BottomSheet` + `<input type="date">` + `CPInput` + `CPButton` (`primary` cho "Bắt đầu vụ", `danger` cho "Kết thúc vụ"), mode `close` hiện câu "Sau khi kết thúc, phiên bán mới không gắn được vào vụ này." Thẻ trong giai đoạn 1 **không** bấm vào được và không hiện số tiền. Ngày hiển thị bằng `common.formatDateWithType(date, "DD/MM/YYYY")`. Trên desktop các thẻ xếp lưới `repeat(auto-fill, minmax(280px, 1fr))`, điện thoại một cột.
- [ ] **Step 4: Chạy** `npm test` → PASS. Chạy thử với `npm run dev:local` (BE) + `npm run dev` (FE, `env.js` trỏ localhost): bắt đầu vụ cho Ao 2, kết thúc vụ Ao 1 khi còn phiên mở thấy lỗi đúng, xem trên cả khung điện thoại 375px.
- [ ] **Step 5: Commit** `feat(fe): crops page with pond cards`.

### Task 6: Phiên mới chọn ao + "Chọn ao" cho phiên

**Files:**
- Create: `src/views/ManagementFish/components/NewSessionSheet.vue`, `src/views/ManagementFish/components/SessionCropSheet.vue`
- Modify: `src/common/sessionLabel.js`, `src/views/ManagementFish/components/SessionBar.vue`, `src/views/ManagementFish/components/SessionSheet.vue`, `src/views/ManagementFish/ManagementFishViews.vue`
- Test: `tests/views/NewSessionSheet.test.js`, `tests/views/SessionCropSheet.test.js`; cập nhật `tests/views/SessionBar.test.js`, `tests/views/SessionSheet.test.js`, `tests/views/ManagementFishViews.test.js`, `tests/views/ManagementFishViews.mobile.test.js`

**Interfaces:**
- Consumes: `PondAPI.getPonds`, `CropAPI.{ getCrops, createCrop }`, `WeighSessionAPI.{ createWeighSession, updateSessionCrop }`; phiên từ API có `crop: { _id, cropName, status, pond: { _id, pondName } } | null` (Task 3).
- Produces: `sessionPondName(session): string` (`session?.crop?.pond?.pondName ?? ""`) trong `sessionLabel.js`; `sessionLabel` → `"Phiên 27/09/2026 · Ao 1 · đang mở"` (bỏ phần ao nếu trống).
- Produces: `NewSessionSheet.vue` props `{ open }`, emits `close`, `created(session)`. `SessionCropSheet.vue` props `{ open, session }`, emits `close`, `updated(session)`.
- Produces: `SessionBar` và `SessionSheet` không còn gọi `createWeighSession`; nút "Phiên mới" emit `requestNew`, nút "Chọn ao" (phiên chưa có vụ) / "Đổi ao" emit `requestCrop`. `SessionSheet` emit thêm `close` sau hai sự kiện này.

- [ ] **Step 1: Viết test hỏng**
  - `sessionLabel` (trong `tests/views/SessionSheet.test.js`): có ao → `"Phiên 26/09/2026 · Ao 1 · đang mở"`; không ao → như cũ.
  - `tests/views/NewSessionSheet.test.js` (ponds `Ao 1` có vụ mở `c1`, `Ao 2` không có vụ):
    - nút "Tạo phiên" disabled tới khi chọn ao; nhãn phụ "Ao 1" là tên vụ, "Ao 2" là "Chưa có vụ".
    - chọn Ao 1, nhập người mua " Anh Tuấn " → `createWeighSession({ buyerName: "Anh Tuấn", cropId: "c1" })`, emit `created` rồi `close`.
    - chọn Ao 2, `window.confirm` → true: `createCrop({ pondId })` rồi `createWeighSession` với `cropId` của vụ mới; confirm → false: không gọi API nào.
    - không có ao → "Chưa có ao. Thêm ao trong Danh mục." với link `#/danh-muc`.
    - lỗi từ server → hiện message, không emit.
  - `tests/views/SessionCropSheet.test.js`: liệt kê vụ theo ao (vụ mở trước, vụ đã kết thúc có nhãn "đã kết thúc"); chọn một vụ → `updateSessionCrop(session._id, cropId)` → emit `updated`; phiên đang có vụ thì có nút "Bỏ gán ao" → `updateSessionCrop(id, null)`.
  - `SessionBar.test.js` / `SessionSheet.test.js`: thay các test dùng `window.prompt` bằng: bấm "Phiên mới" emit `requestNew` và **không** gọi `createWeighSession`; phiên đang chọn chưa có vụ hiện "Chọn ao", có vụ hiện "Đổi ao", bấm emit `requestCrop`; nhãn phiên trong danh sách có tên ao.
  - `ManagementFishViews` (desktop và mobile): bấm "Phiên mới" mở `NewSessionSheet`; `created` → tải lại phiên và chọn phiên mở; `requestCrop` mở `SessionCropSheet` với phiên đang chọn; `updated` → tải lại danh sách phiên; nút "Phiên mới" ở panel phiên đã kết thúc (mobile) mở thẳng `NewSessionSheet`.
- [ ] **Step 2: Chạy** `npx vitest run NewSessionSheet SessionCropSheet SessionBar SessionSheet ManagementFishViews` → FAIL.
- [ ] **Step 3: Cài đặt.** `NewSessionSheet` tải `getPonds()` + `getCrops({ status: "open" })` mỗi lần `open` chuyển sang `true`; chọn ao bằng `ChoiceGrid` (`textField="pondName"`, `subText` = tên vụ mở hoặc "Chưa có vụ"); ô người mua `CPInput`; nút `primary` "Tạo phiên" ghim đáy như các sheet khác. `SessionCropSheet` tải `getCrops()`, nhóm theo `crop.pond.pondName`. `ManagementFishViews` sở hữu hai sheet (`isNewSessionOpen`, `isSessionCropOpen`) và nối các sự kiện; `handleSessionChanged` dùng lại cho `created`/`updated`. Xóa `window.prompt` cũ.
- [ ] **Step 4: Chạy** `npm test` → PASS. Thử thật với `dev:local`: tạo phiên cho Ao 2 (tự bắt đầu vụ), phiên demo hiện "Ao 1" trên `SessionBar` và top bar điện thoại, gán ao cho một phiên tự tạo khi cân.
- [ ] **Step 5: Cập nhật tài liệu** `E:\Source\management-fish\CLAUDE.md` (không commit): mục Frontend — route `/vu-nuoi`, `PondManager`, `optional` của `CatalogManager`, `NewSessionSheet`/`SessionCropSheet`, `sessionLabel` có tên ao.
- [ ] **Step 6: Commit** `feat(fe): pick pond for new sessions and assign pond to sessions`.

## Phát hành giai đoạn 1

Deploy BE (Vercel) → deploy FE (`npm run deploy`). Không có migration: phiên cũ hiện "Chọn ao".
