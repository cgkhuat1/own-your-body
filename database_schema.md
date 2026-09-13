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
