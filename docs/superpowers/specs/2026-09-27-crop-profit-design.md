# Thiết kế: Ao, vụ nuôi, chi phí và báo cáo lời lãi

Ngày: 2026-09-27 · Trạng thái: chờ duyệt · Áp dụng cho `management-fish-be` và `management-fish-fe`

## 1. Mục tiêu

Ứng dụng đang dùng để nhập số cân khi thương lái đến mua cá (thay cho ghi tay). Gia đình nuôi **nhiều ao**, mỗi ao thả và bán vào thời điểm khác nhau. Cần thêm:

- ghi các khoản chi (cá giống, cám, thuốc, điện, nhân công, … — nhóm chi tự thêm được);
- khi hết một vụ của một ao, xem ngay **thu – chi – lãi** của vụ đó;
- báo cáo tổng của cả nhà theo năm / khoảng ngày, có trừ chi phí chung.

**Thành công khi:** cuối vụ mở app thấy ngay tổng thu, tổng chi theo nhóm, lãi/lỗ của vụ, không phải cộng tay.

### Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| Ao | Nhiều ao, tính lãi riêng từng ao (theo vụ) |
| Phiên bán ↔ ao | Mỗi phiên bán chỉ kéo **một ao** → gắn ao/vụ ở cấp phiên, không ở từng lần cân |
| Chi phí dùng chung (điện chung công tơ…) | Không chia cho ao; chỉ trừ trong **báo cáo tổng** |
| Chi tiết khoản chi | Ngày, nhóm, số tiền + tùy chọn số lượng/đơn vị/đơn giá |
| Tiền tệ | Chỉ VND trong báo cáo; phiên USD bị loại và có cảnh báo |
| Nhóm chi | Danh mục tự thêm được (có sẵn 6 nhóm mặc định) |
| Cách mô hình hóa vụ | Vụ là đối tượng thật (mở/kết thúc), không lọc theo khoảng ngày |

### Ngoài phạm vi (YAGNI)

Công nợ với đại lý / thương lái, chia chi phí chung theo diện tích, nhiều loại tiền trong báo cáo, tồn kho cám, phân quyền người dùng.

## 2. Dữ liệu (backend)

Theo quy ước hiện có: `_id` là chuỗi `uuid.v4()`, xóa mềm bằng `isDelete`, `createdBy`/`modifiedBy`, `timestamps: true`; mọi thao tác ghi (thành công và thất bại) đều ghi `LogTracking`; controller trả `{ success, data, message }` với message tiếng Việt; service ghi trả `{ ok: true, data } | { ok: false, message }`.

### 2.1 `pond` — Ao (resource `/api/ponds`)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `pondName` | String, bắt buộc | Duy nhất trong các ao chưa xóa, so sánh đã trim + không phân biệt hoa thường |
| `area` | Number, tùy chọn | m², `> 0` nếu có |
| `note` | String | |

Tạo trùng tên với ao đã xóa mềm → **khôi phục** ao cũ (giữ `_id`), giống `fishType`/`basketType`.
Endpoint: `getPonds`, `createPonds`, `updatePonds/:pondId` (PUT), `deletePonds/:pondId` (DELETE). Không cho xóa ao đang có vụ mở ("Ao đang có vụ nuôi, hãy kết thúc vụ trước!").

### 2.2 `crop` — Vụ nuôi (resource `/api/crops`)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `pond` | String, ref `pond`, bắt buộc | |
| `cropName` | String, bắt buộc | Mặc định `"<Tên ao> · Vụ MM/yyyy"` theo `startDate`, sửa được |
| `startDate` | Date, bắt buộc | Mặc định hôm nay |
| `endDate` | Date | Đặt khi kết thúc vụ; `>= startDate` |
| `status` | `"open"` \| `"closed"` | Mặc định `open` |
| `note` | String | |

Ràng buộc và quy tắc:

- **Mỗi ao tối đa một vụ mở:** index unique `{ pond: 1, status: 1 }` với `partialFilterExpression: { status: "open", isDelete: false }`. Vi phạm → "Ao này đang có vụ nuôi!".
- **Kết thúc vụ** (`closeCrops/:cropId`, body `{ endDate? }`, mặc định hôm nay): từ chối nếu có phiên bán `status: "open"` thuộc vụ → "Vụ còn phiên bán đang mở, hãy kết thúc phiên trước!".
- **Mở lại vụ** (`reopenCrops/:cropId`): xóa `endDate`, `status: "open"`; từ chối nếu ao đã có vụ mở khác.
- Vụ đã kết thúc **vẫn** nhận thêm/sửa khoản chi và gán phiên (hóa đơn đến muộn, dữ liệu cũ). Số liệu báo cáo luôn tính lại, không lưu.
- **Xóa vụ** (xóa mềm) chỉ khi vụ không có phiên bán và không có khoản chi chưa xóa → "Vụ đã có dữ liệu, không xóa được!".

Endpoint: `getCrops?pondId=&status=`, `createCrops` (`{ pondId, cropName?, startDate?, note? }`), `updateCrops/:cropId` (tên, ngày bắt đầu, ghi chú), `closeCrops/:cropId`, `reopenCrops/:cropId`, `deleteCrops/:cropId`, `getCropReport/:cropId` (mục 4.1). Danh sách trả kèm `pond` đã populate.

### 2.3 `expense-category` — Nhóm chi (resource `/api/expense-categories`)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `categoryName` | String, bắt buộc | Duy nhất (như `pondName`), tạo lại tên đã xóa → khôi phục |
| `metric` | `"seed"` \| `"feed"` \| `"none"` | "Dùng để tính": Giống / Thức ăn / Không. Mặc định `none` |
| `sortOrder` | Number | Thứ tự hiển thị; mặc định theo `createdAt` |

Endpoint: `getExpenseCategories`, `createExpenseCategories`, `updateExpenseCategories/:id`, `deleteExpenseCategories/:id`. Xóa nhóm đã có khoản chi vẫn cho phép (xóa mềm); khoản chi cũ vẫn hiển thị tên nhóm.

Script `scripts/seed-expense-categories.js` (`npm run migrate:expense-categories [-- --dry-run]`, idempotent, dùng `buildDbURI()`): tạo nếu chưa có (theo tên, không phân biệt hoa thường) — Giống (`seed`), Cám (`feed`), Thuốc/hóa chất, Điện, Nhân công, Khác (`none`). `dev:local` cũng seed các nhóm này.

### 2.4 `expense` — Khoản chi (resource `/api/expenses`)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `date` | Date, bắt buộc | Mặc định hôm nay |
| `category` | String, ref `expense-category`, bắt buộc | |
| `crop` | String, ref `crop`, `null` = **chung** | |
| `description` | String | Ví dụ "Cám Cargill 40 đạm" |
| `quantity` | Number, tùy chọn | `> 0` |
| `unit` | String, tùy chọn | Ví dụ "bao", "kg", "con", "số điện" |
| `unitPrice` | Number, tùy chọn | VND, `>= 0` |
| `kgPerUnit` | Number, tùy chọn | Chỉ dùng cho nhóm `feed` khi `unit` ≠ "kg" (ví dụ 25 kg/bao) |
| `amount` | Number, bắt buộc | VND nguyên, `> 0` |
| `note` | String | |

Quy tắc tính tiền (ở service): nếu có cả `quantity` và `unitPrice` thì `amount = Math.round(quantity × unitPrice)` (bỏ qua `amount` gửi lên); ngược lại dùng `amount` gửi lên, làm tròn về số nguyên. `amount <= 0` → "Số tiền phải lớn hơn 0!". `crop` phải tồn tại và chưa xóa; `category` phải tồn tại.

Endpoint: `getExpenses?cropId=&common=1&from=&to=&page=&pageSize=` (mới nhất trước; `common=1` lọc khoản chung; trả `{ items, total, totalAmount, page, pageSize }`, `pageSize` kẹp [1, 100], mặc định 20), `createExpenses`, `updateExpenses/:expenseId`, `deleteExpenses/:expenseId`, `getExpenseSuggestions?categoryId=` (tối đa 10 `description` gần nhất khác nhau, kèm `unit`, `unitPrice`, `kgPerUnit` của lần gần nhất — dùng cho gợi ý và nhớ đơn vị).

### 2.5 Thay đổi ở `weigh-session`

- Thêm trường `crop` (String, ref `crop`, mặc định `null`).
- `createWeighSessions` nhận thêm `cropId` (tùy chọn ở API để không phá luồng cũ; FE luôn gửi). Nếu có, vụ phải tồn tại và đang mở.
- `getOrCreateOpenSession()` (tự tạo phiên khi cân mà chưa có phiên mở) **giữ nguyên**, phiên tạo ra có `crop: null`.
- Endpoint mới `PUT /api/weigh-sessions/updateSessionCrop/:sessionId { cropId | null }` — gán/bỏ gán vụ cho phiên bất kỳ (mở hoặc đã kết thúc, vụ mở hoặc đã kết thúc). Đây cũng là cách xử lý dữ liệu cũ, không cần migration.
- `getWeighSessions` / `getOpenWeighSession` populate `crop` và `crop.pond` (để FE hiện tên ao).
- `closeCrops` kiểm tra phiên mở như mục 2.2.

## 3. Màn hình (frontend)

Route mới (hash history): `/vu-nuoi` (`crops`), `/vu-nuoi/:cropId` (`crop-report`), `/chi-phi` (`expenses`), `/bao-cao` (`report`). Thêm vào `AppNav` và menu ☰ của `AppTopBar`. API modules mới: `PondAPI`, `CropAPI`, `ExpenseCategoryAPI`, `ExpenseAPI`, `ReportAPI` trên `baseAPI`.

### 3.1 Trang Danh mục

Thêm hai quản lý dùng `CatalogManager`: **Ao** (tên, diện tích) và **Nhóm chi** (tên, "Dùng để tính" bằng `CPSelect`: Giống / Thức ăn / Không).

### 3.2 Trang Vụ nuôi (`/vu-nuoi`)

- Mỗi ao chưa xóa là một thẻ (`PondCard`).
  - Có vụ mở: tên vụ, "Thả ngày dd/MM/yyyy · n ngày", **thu / chi / lãi tạm tính** (từ `getCropReport`), nút "＋ Chi phí" (mở form chi với vụ chọn sẵn) và "Kết thúc vụ" (hỏi ngày kết thúc, xác nhận).
  - Không có vụ: nút "Bắt đầu vụ mới" (tên và ngày mặc định, sửa được).
  - Chạm thẻ → `/vu-nuoi/:cropId`.
- Dưới cùng: "Vụ đã kết thúc" — danh sách gọn (ao, vụ, khoảng ngày, lãi), chạm để mở báo cáo.
- Chưa có ao nào → hướng dẫn "Thêm ao trong Danh mục" kèm link.

### 3.3 Form khoản chi (`ExpenseForm`)

Trên điện thoại mở trong `BottomSheet` (nút Lưu ghim đáy), trên desktop là dialog. Dùng chung cho thêm và sửa.

- **Nhóm chi:** `ChoiceGrid` (thứ tự theo danh mục).
- **Ao / vụ:** `ChoiceGrid` gồm các vụ đang mở (nhãn là tên ao) + "Chung". Khi sửa khoản chi thuộc vụ đã kết thúc, vụ đó được thêm vào lưới.
- **Ngày:** mặc định hôm nay.
- **Mô tả:** ô nhập với gợi ý từ `getExpenseSuggestions`; chọn gợi ý thì điền luôn đơn vị, đơn giá, kg/bao.
- **Số lượng · Đơn vị · Đơn giá** (tùy chọn); nhóm `feed` và đơn vị khác "kg" hiện thêm **"kg / 1 <đơn vị>"**.
- **Số tiền:** khi có số lượng và đơn giá thì hiển thị kết quả tự tính (chỉ đọc), ngược lại nhập tay. Định dạng bằng `formatMoney`/`parseMoney`, số lượng bằng `parseDecimal`.
- Nút Lưu bị khóa đến khi có nhóm và số tiền > 0. Lưu xong đóng form, hiện "Hoàn tác" 10 giây (xóa khoản vừa thêm).

### 3.4 Trang Chi phí (`/chi-phi`)

Danh sách khoản chi (ngày, nhóm, mô tả, ao/"Chung", số tiền), lọc bằng `CPSelect` theo **vụ / Chung / Tất cả** và theo **tháng**, dòng tổng tiền theo bộ lọc, phân trang server. Chạm một dòng → `ExpenseForm` ở chế độ sửa (có nút Xóa, `window.confirm`). Nút "＋ Chi phí" (desktop: đầu trang; điện thoại: hành động bên phải của `AppTopBar`).

### 3.5 Trang cân (thay đổi)

- `SessionBar` / `SessionSheet` / `sessionLabel()` hiện tên ao: "Phiên 27/09 · Ao 1 · đang mở".
- "Phiên mới" mở bước chọn ao (`ChoiceGrid` các ao). Ao có vụ mở → tạo phiên với vụ đó. Ao chưa có vụ → hỏi "Ao này chưa có vụ, bắt đầu vụ mới?" → tạo vụ rồi tạo phiên.
- Phiên có `crop: null` hiện nút "Chọn ao" → chọn vụ (nhóm theo ao, vụ mở trước, vụ đã kết thúc sau) → `updateSessionCrop`. Cho phép đổi ao của phiên với cùng giao diện.

## 4. Báo cáo

Tính ở server, không lưu kết quả. Phần thu dùng lại chính logic của `getSessionSummary` (tách thành hàm dùng chung, ví dụ `summarizeSession(session, weighIns)`) để số tiền trong báo cáo khớp phiếu tính tiền.

### 4.1 Báo cáo vụ — `GET /api/crops/getCropReport/:cropId`

Đầu vào: vụ + các phiên chưa xóa có `crop = cropId` + khoản chi chưa xóa có `crop = cropId`.

```
data: {
  crop: { _id, cropName, pond: { _id, pondName }, startDate, endDate, status, days },
  revenue: {
    total,                       // tổng amount các dòng có giá của phiên VND
    sessions: [{ _id, sessionName, buyerName, createdAt, status, totalNet, amount, missingPrice }],
    excludedForeignCurrency,     // số phiên không phải VND (không tính)
  },
  expense: {
    total,
    byCategory: [{ category: { _id, categoryName, metric }, amount, percent, count }],
  },
  profit,                        // revenue.total − expense.total
  metrics: {
    totalNetKg,                  // tổng kg tịnh các phiên VND
    costPerKg,                   // expense.total / totalNetKg, null nếu totalNetKg = 0
    seedQuantities: [{ unit, quantity }],   // cộng quantity nhóm metric=seed theo unit
    feedQuantities: [{ unit, quantity }],   // cộng quantity nhóm metric=feed theo unit
    feedKg,                      // null nếu có khoản cám không quy được ra kg
    fcr,                         // feedKg / totalNetKg, null nếu không tính được
  }
}
```

- `days` = số ngày từ `startDate` đến `endDate` (hoặc hôm nay nếu đang nuôi).
- `missingPrice = true` khi phiên có ít nhất một loại cá chưa có giá; `amount` của phiên chỉ cộng các dòng có giá.
- Một khoản cám quy ra kg khi `unit` là "kg" (không phân biệt hoa thường) hoặc có `kgPerUnit`; khoản không có `quantity` hoặc không quy được → `feedKg = fcr = null`.
- `percent` làm tròn 1 chữ số thập phân.

FE (`/vu-nuoi/:cropId`, `CropReportView`): đầu trang (ao, vụ, ngày, số ngày, trạng thái + nút Kết thúc/Mở lại vụ); ba ô Tổng thu / Tổng chi / Lãi-Lỗ (lãi màu xanh, lỗ màu đỏ, đều có chữ "Lãi"/"Lỗ" chứ không chỉ dựa vào màu); mục Thu (danh sách phiên, ⚠ "Chưa có giá, chưa tính vào thu" kèm link sang trang cân với phiên đó; cảnh báo "Có n phiên bằng USD không được tính"); mục Chi theo nhóm (chạm để mở danh sách khoản chi của nhóm trong vụ); mục Chỉ số (kg bán, giá vốn/kg, số giống, thức ăn, hệ số thức ăn nếu có); nút "＋ Chi phí"; nút **In** (vùng in theo `_print.scss`).

### 4.2 Báo cáo tổng — `GET /api/reports/getOverview?from=&to=&includeOpen=0|1`

- `from`/`to` là ngày (bao gồm cả hai đầu); FE mặc định là năm hiện tại.
- **Vụ trong kỳ:** vụ `closed` có `endDate` trong [from, to]. Mỗi vụ một dòng `{ crop, revenue, expense, profit }` (cùng cách tính 4.1).
- **Vụ đang nuôi:** trả riêng trong `openCrops` (tạm tính); chỉ cộng vào tổng khi `includeOpen=1`.
- **Chi phí chung:** khoản chi `crop = null` có `date` trong [from, to], tổng theo nhóm.
- Kết quả: `{ crops, openCrops, cropsTotal: { revenue, expense, profit }, commonExpense: { total, byCategory }, netProfit, excludedForeignCurrency }` với `netProfit = cropsTotal.profit − commonExpense.total`.

FE (`/bao-cao`, `ReportView`): chọn năm (`CPSelect`) hoặc "Tùy chọn" từ ngày – đến ngày; bảng vụ (điện thoại: thẻ); nhóm "Đang nuôi (tạm tính)" với công tắc "Tính cả vụ đang nuôi"; khối "Chi phí chung" theo nhóm; dòng **Lãi ròng cả nhà**; biểu đồ cột lãi theo vụ bằng `chart.js`; nút In.

## 5. Lỗi (message tiếng Việt, HTTP 200 + `success: false`)

| Tình huống | Message |
|---|---|
| Trùng tên ao | "Tên ao đã tồn tại!" |
| Trùng tên nhóm chi | "Tên nhóm chi đã tồn tại!" |
| Tạo vụ khi ao đang có vụ mở | "Ao này đang có vụ nuôi!" |
| Kết thúc vụ còn phiên mở | "Vụ còn phiên bán đang mở, hãy kết thúc phiên trước!" |
| Ngày kết thúc trước ngày bắt đầu (cùng ngày vẫn hợp lệ) | "Ngày kết thúc không được trước ngày bắt đầu!" |
| Xóa vụ có dữ liệu | "Vụ đã có dữ liệu, không xóa được!" |
| Xóa ao có vụ mở | "Ao đang có vụ nuôi, hãy kết thúc vụ trước!" |
| Tạo phiên với vụ đã kết thúc | "Vụ đã kết thúc, hãy chọn vụ đang nuôi!" |
| Số tiền ≤ 0 | "Số tiền phải lớn hơn 0!" |
| Không tìm thấy ao/vụ/nhóm/khoản chi | "Không tìm thấy dữ liệu!" |

## 6. Kiểm thử

**Backend (Jest + Supertest, `tests/`):**
- `pond.test.js`, `expenseCategory.test.js`: CRUD, trùng tên, khôi phục tên đã xóa, không xóa ao có vụ mở.
- `crop.test.js`: một vụ mở mỗi ao (kể cả hai request đồng thời), kết thúc khi còn phiên mở, mở lại, xóa vụ có dữ liệu, ngày kết thúc < ngày bắt đầu.
- `expense.test.js`: tự tính `amount`, làm tròn, `amount <= 0`, lọc `cropId`/`common`/`from`/`to`, `totalAmount`, gợi ý mô tả.
- `sessionCrop.test.js`: tạo phiên với `cropId`, `updateSessionCrop`, phiên tự tạo có `crop: null`.
- `cropReport.test.js`: thu khớp `getSessionSummary`, phiên thiếu giá, phiên USD bị loại, giá vốn/kg, quy đổi cám và `fcr = null` khi thiếu `kgPerUnit`.
- `overviewReport.test.js`: chọn vụ theo `endDate`, `includeOpen`, chi phí chung theo ngày, `netProfit`.
- `seedExpenseCategories.test.js`: idempotent, `--dry-run` không ghi.

**Frontend (Vitest, `tests/`):** `ExpenseForm` (tự tính tiền, khóa nút Lưu, gợi ý điền đơn vị, ô kg/bao chỉ với nhóm thức ăn, hoàn tác), `PondCard`/trang Vụ nuôi (các trạng thái thẻ, kết thúc vụ), `CropReportView` (hiển thị lãi/lỗ, cảnh báo thiếu giá và USD, ẩn hệ số thức ăn khi null), `ReportView` (công tắc tạm tính), chọn ao khi tạo phiên và "Chọn ao" cho phiên chưa gán.

## 7. Triển khai và giai đoạn

Thứ tự phát hành mỗi giai đoạn: deploy BE → (chạy script nếu có) → deploy FE. Cập nhật `CLAUDE.md` ở cuối mỗi giai đoạn.

1. **Giai đoạn 1 — Ao + vụ + gắn phiên:** mục 2.1, 2.2 (trừ `getCropReport`), 2.5; FE 3.1 (Ao), 3.2 (không có số thu/chi), 3.5.
2. **Giai đoạn 2 — Chi phí + báo cáo vụ:** mục 2.3 + script seed, 2.4, 4.1; FE 3.1 (Nhóm chi), 3.3, 3.4, số tạm tính trên thẻ ao, trang báo cáo vụ.
3. **Giai đoạn 3 — Báo cáo tổng + in:** mục 4.2; FE `/bao-cao`, in báo cáo vụ và báo cáo tổng.

Mỗi giai đoạn dùng được độc lập và có kế hoạch triển khai riêng.
