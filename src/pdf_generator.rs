use printpdf::{PdfDocument, Mm};
use std::io::BufWriter;

use crate::models::{Episode, AnalyticsData, PatternAnalysis};

pub struct PDFReportGenerator;

impl PDFReportGenerator {
    pub fn generate_medical_report(
        episodes: &[Episode],
        analytics: &AnalyticsData,
        patterns: &PatternAnalysis
    ) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let (doc, page1, layer1) = PdfDocument::new("Vertigo Episode Medical Report", Mm(210.0), Mm(297.0), "Layer 1");
        let current_layer = doc.get_page(page1).get_layer(layer1);

        // Use built-in font
        let font = doc.add_builtin_font(printpdf::BuiltinFont::HelveticaBold)?;
        let font_regular = doc.add_builtin_font(printpdf::BuiltinFont::Helvetica)?;

        let mut y_position = Mm(270.0);

        // Title
        current_layer.use_text("VERTIGO EPISODE MEDICAL REPORT", 16.0, Mm(20.0), y_position, &font);
        y_position -= Mm(15.0);

        // Date
        let today = chrono::Utc::now().format("%B %d, %Y").to_string();
        current_layer.use_text(format!("Report Date: {}", today), 12.0, Mm(20.0), y_position, &font_regular);
        y_position -= Mm(15.0);

        // Summary Statistics
        current_layer.use_text("SUMMARY STATISTICS", 14.0, Mm(20.0), y_position, &font);
        y_position -= Mm(10.0);

        current_layer.use_text(format!("Total Episodes: {}", analytics.total_episodes), 11.0, Mm(25.0), y_position, &font_regular);
        y_position -= Mm(6.0);

        current_layer.use_text(format!("Average Severity: {:.1}/5", analytics.average_severity), 11.0, Mm(25.0), y_position, &font_regular);
        y_position -= Mm(6.0);

        current_layer.use_text(format!("Average Duration: {:.0} minutes", analytics.duration_stats.average_minutes), 11.0, Mm(25.0), y_position, &font_regular);
        y_position -= Mm(6.0);

        current_layer.use_text(format!("Duration Range: {} - {} minutes", analytics.duration_stats.min_minutes, analytics.duration_stats.max_minutes), 11.0, Mm(25.0), y_position, &font_regular);
        y_position -= Mm(15.0);

        // Common Triggers
        if !patterns.common_triggers.is_empty() {
            current_layer.use_text("IDENTIFIED TRIGGERS", 14.0, Mm(20.0), y_position, &font);
            y_position -= Mm(10.0);

            for trigger in &patterns.common_triggers {
                current_layer.use_text(format!("• {}", trigger), 11.0, Mm(25.0), y_position, &font_regular);
                y_position -= Mm(6.0);
            }
            y_position -= Mm(5.0);
        }

        // Severity Patterns
        if !patterns.severity_patterns.is_empty() {
            current_layer.use_text("SEVERITY PATTERNS", 14.0, Mm(20.0), y_position, &font);
            y_position -= Mm(10.0);

            for pattern in &patterns.severity_patterns {
                current_layer.use_text(format!("• {}", pattern), 11.0, Mm(25.0), y_position, &font_regular);
                y_position -= Mm(6.0);
            }
            y_position -= Mm(5.0);
        }

        // Time Patterns
        if !patterns.time_patterns.is_empty() {
            current_layer.use_text("TIME PATTERNS", 14.0, Mm(20.0), y_position, &font);
            y_position -= Mm(10.0);

            for pattern in &patterns.time_patterns {
                current_layer.use_text(format!("• {}", pattern), 11.0, Mm(25.0), y_position, &font_regular);
                y_position -= Mm(6.0);
            }
            y_position -= Mm(5.0);
        }

        // Risk Factors
        if !patterns.risk_factors.is_empty() {
            current_layer.use_text("RISK FACTORS", 14.0, Mm(20.0), y_position, &font);
            y_position -= Mm(10.0);

            for risk in &patterns.risk_factors {
                current_layer.use_text(format!("! {}", risk), 11.0, Mm(25.0), y_position, &font_regular);
                y_position -= Mm(6.0);
            }
            y_position -= Mm(5.0);
        }

        // Recommendations
        if !patterns.recommendations.is_empty() {
            current_layer.use_text("RECOMMENDATIONS", 14.0, Mm(20.0), y_position, &font);
            y_position -= Mm(10.0);

            for rec in patterns.recommendations.iter().take(8) { // Limit to prevent page overflow
                current_layer.use_text(format!("- {}", rec), 11.0, Mm(25.0), y_position, &font_regular);
                y_position -= Mm(6.0);
            }
            y_position -= Mm(10.0);
        }

        // Recent Episodes (simplified)
        if !episodes.is_empty() && y_position > Mm(60.0) {
            current_layer.use_text("RECENT EPISODES", 14.0, Mm(20.0), y_position, &font);
            y_position -= Mm(10.0);

            // Table headers
            current_layer.use_text("Date", 10.0, Mm(20.0), y_position, &font);
            current_layer.use_text("Severity", 10.0, Mm(60.0), y_position, &font);
            current_layer.use_text("Duration", 10.0, Mm(100.0), y_position, &font);
            current_layer.use_text("Triggers", 10.0, Mm(140.0), y_position, &font);
            y_position -= Mm(8.0);

            // Show last 5 episodes to fit on page
            for episode in episodes.iter().take(5) {
                let date = episode.timestamp.format("%m/%d/%y").to_string();
                let severity = format!("{}/5", episode.severity);
                let duration = episode.duration_minutes.map_or("--".to_string(), |d| format!("{}min", d));
                let triggers = episode.triggers.as_deref().unwrap_or("--")
                    .chars().take(15).collect::<String>(); // Truncate to fit

                current_layer.use_text(date, 9.0, Mm(20.0), y_position, &font_regular);
                current_layer.use_text(severity, 9.0, Mm(60.0), y_position, &font_regular);
                current_layer.use_text(duration, 9.0, Mm(100.0), y_position, &font_regular);
                current_layer.use_text(triggers, 9.0, Mm(140.0), y_position, &font_regular);
                y_position -= Mm(6.0);

                if y_position < Mm(40.0) {
                    break;
                }
            }
        }

        // Medical Disclaimer
        y_position -= Mm(10.0);
        if y_position > Mm(30.0) {
            current_layer.use_text("MEDICAL DISCLAIMER", 12.0, Mm(20.0), y_position, &font);
            y_position -= Mm(8.0);

            current_layer.use_text("This report is for informational purposes only and should", 10.0, Mm(20.0), y_position, &font_regular);
            y_position -= Mm(5.0);
            current_layer.use_text("not replace professional medical advice. Always consult", 10.0, Mm(20.0), y_position, &font_regular);
            y_position -= Mm(5.0);
            current_layer.use_text("healthcare providers for proper diagnosis and treatment.", 10.0, Mm(20.0), y_position, &font_regular);
        }

        // Generate PDF bytes
        let mut buf = Vec::new();
        let mut writer = BufWriter::new(&mut buf);
        doc.save(&mut writer)?;
        drop(writer);

        Ok(buf)
    }
}