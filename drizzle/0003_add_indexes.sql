CREATE INDEX IF NOT EXISTS idx_chores_org_id ON chores(org_id);
CREATE INDEX IF NOT EXISTS idx_chores_residence_id ON chores(residence_id);
CREATE INDEX IF NOT EXISTS idx_chores_assigned_to ON chores USING GIN(assigned_to);
CREATE INDEX IF NOT EXISTS idx_chores_is_recurring ON chores(is_recurring);
CREATE INDEX IF NOT EXISTS idx_chores_progress ON chores(progress);

CREATE INDEX IF NOT EXISTS idx_chore_history_org_id ON chore_history(org_id);
CREATE INDEX IF NOT EXISTS idx_chore_history_chore_id ON chore_history(chore_id);
CREATE INDEX IF NOT EXISTS idx_chore_history_user_id ON chore_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chore_history_timestamp ON chore_history(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_chore_feedback_org_id ON chore_feedback(org_id);
CREATE INDEX IF NOT EXISTS idx_chore_feedback_chore_id ON chore_feedback(chore_id);
CREATE INDEX IF NOT EXISTS idx_chore_feedback_user_id ON chore_feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_chore_streaks_org_id ON chore_streaks(org_id);
CREATE INDEX IF NOT EXISTS idx_chore_streaks_user_id ON chore_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_chore_streaks_chore_id ON chore_streaks(chore_id);
