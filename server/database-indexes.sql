-- Performance Optimization: Database Indexes for Pine Hill Farm Employee Management
-- These indexes will significantly improve query performance

-- Work Schedules Performance Indexes
CREATE INDEX IF NOT EXISTS idx_work_schedules_user_date ON work_schedules(user_id, date);
CREATE INDEX IF NOT EXISTS idx_work_schedules_location_date ON work_schedules(location_id, date);
CREATE INDEX IF NOT EXISTS idx_work_schedules_date_range ON work_schedules(date, start_time);

-- Time Off Requests Performance Indexes
CREATE INDEX IF NOT EXISTS idx_time_off_user_status ON time_off_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_time_off_date_range ON time_off_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_time_off_status_date ON time_off_requests(status, requested_at);

-- Shift Coverage Requests Performance Indexes
CREATE INDEX IF NOT EXISTS idx_shift_coverage_status ON shift_coverage_requests(status, requested_at);
CREATE INDEX IF NOT EXISTS idx_shift_coverage_requester ON shift_coverage_requests(requester_id);

-- User Management Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);

-- Messages Performance Indexes
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, created_at);

-- Notifications Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- Training Progress Performance Indexes
CREATE INDEX IF NOT EXISTS idx_training_progress_user ON training_progress(user_id, module_id);

-- Push Subscriptions Performance Indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- Announcements Performance Indexes
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published, created_at);