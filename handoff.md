# CK Coaching App - Project Handoff

## 1. Thông tin chung
- **Dự án:** CK Coaching (Web App quản lý và theo dõi lịch tập luyện).
- **Tech Stack:** Next.js (App Router), TailwindCSS v4, Lucide React, Supabase (Database & Auth).
- **Trạng thái Database:** Đã có schema hoàn chỉnh (programs, blocks, workouts, workout_exercises, workout_logs). Đang chạy chế độ Tắt RLS (Run without RLS) để Client Component có thể chèn data trực tiếp.

## 2. Triết lý thiết kế (Cực kỳ quan trọng)
- **Màu sắc & UI:** Giao diện tối giản, sang trọng. Dùng tông Vàng Gold (#D4AF37) cho việc hoàn thành xuất sắc, Xanh ngọc (Emerald) cho hoàn thành một phần. Nền nhạt (Paper), Chữ đậm (Moss Deep).
- **Tâm lý khách hàng:** Đề cao sự linh hoạt. Không ép buộc tập đúng ngày (Thứ 2, 4, 6), không phán xét nếu tập thiếu bài. Khách tập là có thành tựu.
- **Trải nghiệm UX:** Mọi thao tác phải mượt mà. Hạn chế popup mặc định của trình duyệt (dùng Toast), tự động khôi phục dữ liệu tạ cũ nếu khách ấn nhầm, tính giờ nghỉ thông minh bằng RPE khách nhập.

## 3. Tiến độ hiện tại
✅ **Client Dashboard (`/`):** Hoàn thiện 100%. Đã gọi API Supabase, nhóm theo tuần, tính toán tỷ lệ hoàn thành (Perfect/Partial) dựa trên số set đã tập vs target.
✅ **Workout Execution (`/workout`):** Hoàn thiện 100%. Lấy bài tập từ Supabase, gom nhóm Superset (không tính giờ nghỉ cho bài đầu), tự động tính Rest Timer theo RPE. Đã có logic xóa log cũ khi nộp lại.
✅ **Coach Dashboard (`/coach`):** Hoàn thiện 100%. Quản lý danh sách học viên, tự động tính toán Compliance (Tỷ lệ tuân thủ) của tuần và của cả khóa. Đã chặn truy cập chéo bằng Role (pt vs client).

## 4. Nhiệm vụ TIẾP THEO (Bắt đầu làm ở chat mới)
**Xây dựng màn hình: Coach Program Builder (`/coach/program`)**
- Khi Coach bấm "Giáo án" của 1 khách, URL sẽ là: `/coach/program?clientId=...&programId=...`
- Cần tạo giao diện dạng Grid/Bảng tính (Spreadsheet) để HLV có thể nhìn tổng quan 4 tuần của Block.
- Cho phép HLV sửa đổi Progressive Overload (Tạ, Rep, RPE mục tiêu) cho từng bài tập.
- Hiển thị so sánh: Tạ/Rep mục tiêu vs Tạ/Rep khách hàng thực tế đã log (để HLV biết đường điều chỉnh tuần sau).

## 5. Roadmap hoàn thiện Dự án (Các bước còn lại)
Dự án đã hoàn thành ~60% (Core flow: Client xem lịch, tập luyện, log tạ; Coach xem dashboard tổng quan). Dưới đây là 5 bước để Release bản Production:

**Bước 1: Màn hình Tạo Giáo Án cho HLV (Coach Program Builder) - *Việc ngay tiếp theo***
- Xây dựng Giao diện Spreadsheet (Bảng tính 4 tuần) để Coach thiết kế Overload (Tạ, Rep, RPE).
- So sánh Thực tế (Actual đã tập) vs Mục tiêu (Target) để Coach điều chỉnh thông số tuần kế tiếp.
- Lưu đồng bộ các cập nhật vào bảng `workout_exercises`.

**Bước 2: Quản lý Kho bài tập & Giáo án mẫu (Templates)**
- Kho bài tập (Exercise Library): CRUD danh sách bài tập kèm link Youtube.
- Giáo án mẫu (Program Templates): Tạo sẵn các block 4 tuần chuẩn và Assign (gán/clone) nhanh cho khách hàng mới.

**Bước 3: Biểu đồ Tiến độ & Phân tích (Analytics)**
- Vẽ biểu đồ tăng tiến Volume/1RM theo thời gian cho Khách hàng.
- Báo cáo cảnh báo (chững tạ, bỏ tập) hiển thị trên Dashboard của HLV.

**Bước 4: Bảo mật Database (RLS) & Tối ưu UX/UI**
- Bật và cấu hình Supabase Row Level Security (RLS) (Khách chỉ xem/sửa data của mình, HLV xem/sửa data của khách thuộc quyền quản lý).
- Tối ưu Loading Skeletons, Error handling.

**Bước 5: Triển khai (Deployment) & PWA**
- Deploy Next.js lên Vercel.
- Cấu hình PWA (Progressive Web App) để khách hàng có thể "Add to Home Screen" trên iOS/Android như một App Native.
