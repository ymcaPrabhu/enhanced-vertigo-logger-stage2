-- Create episodes table in PostgreSQL
CREATE TABLE IF NOT EXISTS episodes (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    duration_minutes INTEGER,
    severity INTEGER NOT NULL CHECK(severity >= 1 AND severity <= 5),
    triggers TEXT,
    symptoms TEXT,
    location TEXT,
    activities_before TEXT,
    medications_taken TEXT,
    notes TEXT,
    ai_analysis TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_episodes_timestamp ON episodes(timestamp);
CREATE INDEX IF NOT EXISTS idx_episodes_severity ON episodes(severity);

-- Sample data (replace with your actual data export)
-- You'll need to export your SQLite data and insert it hereINSERT INTO episodes (timestamp, duration_minutes, severity, triggers, symptoms, location, activities_before, medications_taken, notes, created_at) VALUES ('2025-09-23 14:40:56', 10, 3, NULL, 'Mild dizziness and slight nausea', NULL, NULL, NULL, 'Test episode for validation', '2025-09-23 14:40:56');
INSERT INTO episodes (timestamp, duration_minutes, severity, triggers, symptoms, location, activities_before, medications_taken, notes, created_at) VALUES ('2025-09-23 14:42:06', 25, 4, 'Standing up quickly', 'Severe dizziness with nausea', 'At home', NULL, NULL, NULL, '2025-09-23 14:42:06');
INSERT INTO episodes (timestamp, duration_minutes, severity, triggers, symptoms, location, activities_before, medications_taken, notes, created_at) VALUES ('2025-09-23 14:46:50', 200, 3, 'Unknown', 'ismein bhi throughout the day but sometime it''s feels and sometimes it feel very normal but you take concentrated remains throughout the day swaproximately 200 minutes I am getting this', 'Home office', 'Wake up', 'Routine only ', 'Its becoming recurrent', '2025-09-23 14:46:50');
INSERT INTO episodes (timestamp, duration_minutes, severity, triggers, symptoms, location, activities_before, medications_taken, notes, created_at) VALUES ('2025-09-23 14:54:28', 1440, 1, '', '', '', NULL, NULL, 'Boundary test - max duration', '2025-09-23 14:54:28');
INSERT INTO episodes (timestamp, duration_minutes, severity, triggers, symptoms, location, activities_before, medications_taken, notes, created_at) VALUES ('2025-09-23 14:55:46', 5, 2, NULL, 'Load test episode 1', NULL, NULL, NULL, NULL, '2025-09-23 14:55:46');
INSERT INTO episodes (timestamp, duration_minutes, severity, triggers, symptoms, location, activities_before, medications_taken, notes, created_at) VALUES ('2025-09-23 14:55:46', 10, 3, NULL, 'Load test episode 2', NULL, NULL, NULL, NULL, '2025-09-23 14:55:46');
INSERT INTO episodes (timestamp, duration_minutes, severity, triggers, symptoms, location, activities_before, medications_taken, notes, created_at) VALUES ('2025-09-23 14:55:46', 15, 4, NULL, 'Load test episode 3', NULL, NULL, NULL, NULL, '2025-09-23 14:55:46');
INSERT INTO episodes (timestamp, duration_minutes, severity, triggers, symptoms, location, activities_before, medications_taken, notes, created_at) VALUES ('2025-09-23 14:55:46', 20, 5, NULL, 'Load test episode 4', NULL, NULL, NULL, NULL, '2025-09-23 14:55:46');
INSERT INTO episodes (timestamp, duration_minutes, severity, triggers, symptoms, location, activities_before, medications_taken, notes, created_at) VALUES ('2025-09-23 14:55:46', 25, 1, NULL, 'Load test episode 5', NULL, NULL, NULL, NULL, '2025-09-23 14:55:46');
