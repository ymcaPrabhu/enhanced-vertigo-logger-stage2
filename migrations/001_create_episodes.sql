-- Create episodes table for vertigo episode logging
CREATE TABLE episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    duration_minutes INTEGER,
    severity INTEGER NOT NULL CHECK(severity >= 1 AND severity <= 5),
    triggers TEXT,
    symptoms TEXT,
    location TEXT,
    activities_before TEXT,
    medications_taken TEXT,
    notes TEXT,
    ai_analysis TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_episodes_timestamp ON episodes(timestamp);
CREATE INDEX idx_episodes_severity ON episodes(severity);

-- Insert a test episode for validation
INSERT INTO episodes (severity, symptoms, duration_minutes, notes)
VALUES (3, 'Mild dizziness and slight nausea', 10, 'Test episode for validation');