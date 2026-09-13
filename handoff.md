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
