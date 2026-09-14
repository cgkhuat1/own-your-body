# CK Coaching App - Project Handoff

## 1. Thông tin chung
- **Dự án:** CK Coaching (Web App quản lý và theo dõi lịch tập luyện).
- **Tech Stack:** Next.js (App Router), TailwindCSS v4, Lucide React, Supabase (Database & Auth).
- **Trạng thái Database:** Đã có schema hoàn chỉnh (programs, blocks, workouts, workout_exercises, workout_logs). Đang chạy chế độ Tắt RLS (Run without RLS) để Client Component có thể chèn data trực tiếp.

## 2. Triết lý thiết kế (Cực kỳ quan trọng)
- **Màu sắc & UI:** Giao diện tối giản, sang trọng. Dùng tông Vàng Gold (#D4AF37) cho việc hoàn thành xuất sắc, Xanh ngọc (Emerald) cho hoàn thành một phần. Nền nhạt (Paper), Chữ đậm (Moss Deep).
- **Tâm lý khách hàng:** Đề cao sự linh hoạt. Không ép buộc tập đúng ngày (Thứ 2, 4, 6), không phán xét nếu tập thiếu bài. Khách tập là có thành tựu.
- **Trải nghiệm UX:** Mọi thao tác phải mượt mà. Hạn chế popup mặc định của trình duyệt (dùng Toast), thao tác edit inline tự động lưu (auto-save).
- **Quy ước bài tập:** Khung chương trình (Block) duy trì trong 4 tuần. Superset đi theo nhóm (1A, 1B). Thứ tự bài tập tự động sắp xếp lại khi kéo thả.

## 3. Tiến độ hiện tại (Đã hoàn thiện Core Flow)
✅ **Client Dashboard (`/`):** Hoàn thiện. Đã gọi API Supabase, nhóm theo tuần, tính toán tỷ lệ hoàn thành (Perfect/Partial).
✅ **Workout Execution (`/workout`):** Hoàn thiện. Lấy bài tập từ Supabase, gom nhóm Superset (không tính giờ nghỉ cho bài đầu), tự động tính Rest Timer theo RPE. Đã có logic xóa log cũ khi nộp lại.
✅ **Coach Dashboard (`/coach`):** Hoàn thiện. Quản lý danh sách học viên, tự động tính toán Compliance (Tỷ lệ tuân thủ) của tuần và của cả khóa.
✅ **Coach Program Builder (`/coach/program`):** Hoàn thiện (Siêu tính năng). 
  - Giao diện Spreadsheet (Bảng tính 4 tuần) chia tab theo từng buổi tập.
  - Sửa trực tiếp (Inline Edit) tên bài, tên buổi, Target Sets/Reps/RPE.
  - Kéo thả (Drag & Drop) bài tập, tự động nhóm thành Cụm Superset (Drag Units) và đánh lại số thứ tự (`1, 2A, 2B, 3`) liền mạch vào DB.
  - Sửa chéo Ad-hoc: Cho phép thay thế (Swap) 1 bài tập cụ thể ở riêng 1 tuần mà không làm vỡ Template gốc.
  - Nhân bản Block: Nút "+ Tạo Phase tiếp" copy y nguyên khung bài tập và Target sang Block 2, Block 3 để Coach dễ dàng tinh chỉnh.

## 4. Nhiệm vụ TIẾP THEO (Bắt đầu làm ở chat mới)
Dự án đã xong khoảng 85% core business. Các tính năng cốt lõi cho Client tập và Coach tạo bài đều đã chạy mượt.

**Các tính năng cần triển khai tiếp (Roadmap):**

**Bước 1: Quản lý Kho bài tập & Giáo án mẫu (Templates)**
- Kho bài tập (Exercise Library): Có trang quản trị (CRUD) danh sách bài tập kèm link video/hình ảnh hướng dẫn.
- Giáo án mẫu (Program Templates): Tính năng cho phép HLV lưu một Program (ví dụ 3 Blocks) thành "Mẫu" và gán (assign) siêu nhanh cho người dùng mới.

**Bước 2: Biểu đồ Tiến độ & Phân tích (Analytics cho Khách & HLV)**
- Bảng vẽ biểu đồ tự động tracking Volume, Max Weight (1RM estimation) theo thời gian cho các bài Compound chính.
- Báo cáo cảnh báo (VD: Khách bỏ tập 2 tuần) nổi lên ở Dashboard của Coach.

**Bước 3: Tối ưu Bảo mật (RLS) & UX/UI Cấp cao**
- Bật cấu hình Supabase Row Level Security (RLS) để cô lập dữ liệu người dùng.
- Tối ưu Loading Skeletons, Skeleton State khi tải data để tránh giật lag UI (hiện tại đang dùng icon xoay).

**Bước 4: Triển khai (Deployment) & PWA**
- Đưa mã nguồn lên GitHub Repo chính thức.
- Deploy Next.js lên Vercel.
- Cấu hình PWA (Progressive Web App) + Manifest + Icons để khách hàng cài đặt như App điện thoại.
