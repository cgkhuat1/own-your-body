# Database Schema (Supabase)

## `users`
- `id` (UUID, PK)
- `email` (TEXT)
- `full_name` (TEXT)
- `role` (TEXT) - 'pt' hoặc 'client'
- `created_at` (TIMESTAMPTZ)

## `programs`
- `id` (UUID, PK)
- `pt_id` (UUID, FK -> users.id)
- `client_id` (UUID, FK -> users.id)
- `name` (TEXT)
- `created_at` (TIMESTAMPTZ)

## `blocks` (Giai đoạn 4 tuần)
- `id` (UUID, PK)
- `program_id` (UUID, FK -> programs.id)
- `name` (TEXT)
- `order_index` (INTEGER)
- `created_at` (TIMESTAMPTZ)

## `workouts` (Buổi tập trong tuần)
- `id` (UUID, PK)
- `block_id` (UUID, FK -> blocks.id)
- `name` (TEXT) - Vd: "Buổi 1 - Thân Trên"
- `week_number` (INTEGER) - Vd: 1, 2, 3, 4
- `order_index` (INTEGER) - Thứ tự trong tuần
- `is_completed` (BOOLEAN)
- `completed_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)

## `exercises` (Kho bài tập gốc)
- `id` (UUID, PK)
- `name` (TEXT)
- `youtube_id` (TEXT)
- `created_at` (TIMESTAMPTZ)

## `workout_exercises` (Bài tập trong 1 buổi tập)
- `id` (UUID, PK)
- `workout_id` (UUID, FK -> workouts.id)
- `exercise_id` (UUID, FK -> exercises.id)
- `custom_name` (TEXT) - Dùng nếu muốn đặt tên riêng thay cho tên gốc
- `group_code` (TEXT) - VD: '1', '2A', '2B' (để nhóm Superset)
- `order_index` (INTEGER)
- `target_sets` (INTEGER)
- `target_reps` (TEXT) - VD: "8-10"
- `target_rpe` (TEXT) - VD: "@8"
- `rest_time` (INTEGER)
- `notes` (TEXT)
- `created_at` (TIMESTAMPTZ)

## `workout_logs` (Lịch sử khách hàng đã tập)
- `id` (UUID, PK)
- `workout_exercise_id` (UUID, FK -> workout_exercises.id)
- `set_number` (INTEGER)
- `weight` (DECIMAL)
- `reps` (INTEGER)
- `rpe` (DECIMAL)
- `created_at` (TIMESTAMPTZ)

## Luồng Dữ Liệu Coaching (Coaching Loop)

**1. Chiều Coach -> Client (Lên giáo án & Phản hồi kỹ thuật):**
- Coach thiết kế `programs`, chia thành các `blocks` 4 tuần.
- Trong mỗi `workouts`, Coach chọn bài từ kho `exercises`, tạo ra các `workout_exercises` với yêu cầu cực kỳ chi tiết: số sets, target reps (vd: 8-10), target RPE (vd: @8), thời gian nghỉ và ghi chú kỹ thuật.
- **Tính năng Feedback Kỹ Thuật "Đúng Lúc":** Dựa trên lịch sử tập, Coach có thể gắn thêm **Feedback bằng chữ** và **Video hướng dẫn (link Drive)** vào từng bài tập. Những lời dặn dò này sẽ "nảy ra" (pop-up nhắc nhở) ngay trước khi Client chuẩn bị tập bài đó ở tuần kế tiếp, giúp Client điều chỉnh kỹ thuật chính xác nhất.

**2. Chiều Client -> Coach (Thực thi & Phản hồi):**
- **Trong lúc tập:** Khách hàng theo dõi target của Coach và nhập thực tế vào `workout_logs` (ví dụ: Set 1 đẩy được bao nhiêu kg, bao nhiêu reps, cảm nhận RPE thực tế là bao nhiêu).
- **Kết thúc buổi tập:** Khách hàng đánh dấu hoàn thành (`is_completed = true`, ghi nhận `completed_at`), đồng thời gửi lại Feedback tổng quan của buổi tập (cảm nhận độ mệt mỏi, đau nhức, hay có bài nào tập bị đau khớp không,...).
- **Vòng lặp Coaching:** Toàn bộ dữ liệu logs và feedback này được đồng bộ ngay lập tức về Dashboard của Coach. Dựa vào đó, Coach sẽ đánh giá được tiến độ (Progressive Overload) để điều chỉnh mức tạ, RPE hoặc đổi bài tập cho các tuần/block tiếp theo.
