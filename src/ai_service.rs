use reqwest::Client;
use serde_json::{json, Value};
use std::env;

use crate::models::{AnalysisRequest, AnalysisResponse, PatternAnalysis, Episode};

pub struct AIService {
    client: Client,
    api_key: String,
    base_url: String,
}

impl AIService {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let api_key = env::var("OPENROUTER_API_KEY")
            .unwrap_or_else(|_| "dummy_key_for_testing".to_string());

        let base_url = env::var("OPENROUTER_BASE_URL")
            .unwrap_or_else(|_| "https://openrouter.ai/api/v1".to_string());

        Ok(AIService {
            client: Client::new(),
            api_key,
            base_url,
        })
    }

    pub async fn analyze_episode(&self, request: &AnalysisRequest) -> Result<AnalysisResponse, Box<dyn std::error::Error>> {
        if self.api_key == "dummy_key_for_testing" {
            return self.mock_analysis(request);
        }

        let prompt = self.create_medical_prompt(request);

        let payload = json!({
            "model": "anthropic/claude-3-haiku",
            "messages": [{
                "role": "user",
                "content": prompt
            }],
            "max_tokens": 500,
            "temperature": 0.7
        });

        let response = self.client
            .post(&format!("{}/chat/completions", self.base_url))
            .header("Authorization", &format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await?;

        if !response.status().is_success() {
            return self.mock_analysis(request);
        }

        let response_body: Value = response.json().await?;

        let ai_text = response_body["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("Unable to analyze at this time.")
            .to_string();

        Ok(AnalysisResponse {
            analysis: ai_text.clone(),
            recommendations: self.extract_recommendations(&ai_text),
            confidence: 0.8,
        })
    }

    fn create_medical_prompt(&self, request: &AnalysisRequest) -> String {
        format!(
            "As a medical AI assistant, analyze this vertigo episode:

Symptoms: {}
Triggers: {}
Severity (1-5): {}

Please provide:
1. Brief analysis of the episode
2. Possible causes
3. Recommendations for management
4. When to seek medical attention

Keep response concise and medical-focused.",
            request.symptoms,
            request.triggers.as_deref().unwrap_or("Not specified"),
            request.severity.unwrap_or(0)
        )
    }

    fn extract_recommendations(&self, analysis: &str) -> Vec<String> {
        let mut recommendations = Vec::new();

        if analysis.to_lowercase().contains("rest") {
            recommendations.push("Consider resting in a quiet environment".to_string());
        }
        if analysis.to_lowercase().contains("hydration") || analysis.to_lowercase().contains("water") {
            recommendations.push("Maintain adequate hydration".to_string());
        }
        if analysis.to_lowercase().contains("doctor") || analysis.to_lowercase().contains("medical") {
            recommendations.push("Consider consulting a healthcare professional".to_string());
        }
        if analysis.to_lowercase().contains("trigger") {
            recommendations.push("Track and avoid identified triggers".to_string());
        }

        if recommendations.is_empty() {
            recommendations.push("Monitor symptoms and seek medical advice if persistent".to_string());
        }

        recommendations
    }

    fn mock_analysis(&self, request: &AnalysisRequest) -> Result<AnalysisResponse, Box<dyn std::error::Error>> {
        let severity = request.severity.unwrap_or(3);

        let analysis = match severity {
            1..=2 => "Mild vertigo episode. Symptoms appear manageable. Consider rest and hydration.",
            3 => "Moderate vertigo episode. Monitor symptoms and consider identifying triggers.",
            4..=5 => "Significant vertigo episode. Consider consulting healthcare provider if symptoms persist.",
            _ => "Unable to assess severity. Please provide valid severity rating (1-5).",
        };

        let recommendations = vec![
            "Rest in a comfortable position".to_string(),
            "Stay hydrated".to_string(),
            "Avoid sudden movements".to_string(),
            if severity >= 4 { "Consider medical consultation".to_string() } else { "Monitor for improvement".to_string() },
        ];

        Ok(AnalysisResponse {
            analysis: analysis.to_string(),
            recommendations,
            confidence: 0.7,
        })
    }

    pub fn analyze_patterns(&self, episodes: &[Episode]) -> Result<PatternAnalysis, Box<dyn std::error::Error>> {
        if episodes.is_empty() {
            return Ok(PatternAnalysis {
                common_triggers: vec![],
                severity_patterns: vec![],
                time_patterns: vec![],
                recommendations: vec!["No episodes to analyze yet".to_string()],
                risk_factors: vec![],
            });
        }

        let common_triggers = self.identify_common_triggers(episodes);
        let severity_patterns = self.analyze_severity_patterns(episodes);
        let time_patterns = self.analyze_time_patterns(episodes);
        let risk_factors = self.identify_risk_factors(episodes);
        let recommendations = self.generate_pattern_recommendations(episodes, &common_triggers, &severity_patterns);

        Ok(PatternAnalysis {
            common_triggers,
            severity_patterns,
            time_patterns,
            recommendations,
            risk_factors,
        })
    }

    fn identify_common_triggers(&self, episodes: &[Episode]) -> Vec<String> {
        let mut trigger_counts = std::collections::HashMap::new();

        for episode in episodes {
            if let Some(triggers) = &episode.triggers {
                if !triggers.trim().is_empty() {
                    for trigger in triggers.split(',').map(|t| t.trim().to_lowercase()) {
                        if !trigger.is_empty() && trigger != "unknown" && trigger != "none" {
                            *trigger_counts.entry(trigger).or_insert(0) += 1;
                        }
                    }
                }
            }
        }

        let mut triggers: Vec<_> = trigger_counts.into_iter().collect();
        triggers.sort_by(|a, b| b.1.cmp(&a.1));

        triggers.into_iter()
            .filter(|(_, count)| *count >= 2) // Only triggers that occur at least twice
            .map(|(trigger, _)| {
                // Capitalize first letter
                let mut chars = trigger.chars();
                match chars.next() {
                    None => String::new(),
                    Some(first) => first.to_uppercase().chain(chars).collect(),
                }
            })
            .take(5)
            .collect()
    }

    fn analyze_severity_patterns(&self, episodes: &[Episode]) -> Vec<String> {
        let mut patterns = Vec::new();
        let severities: Vec<_> = episodes.iter().map(|e| e.severity).collect();

        if severities.is_empty() {
            return patterns;
        }

        let avg_severity = severities.iter().sum::<i32>() as f32 / severities.len() as f32;
        let high_severity_count = severities.iter().filter(|&&s| s >= 4).count();
        let low_severity_count = severities.iter().filter(|&&s| s <= 2).count();

        if avg_severity > 3.0 {
            patterns.push("Episodes tend to be moderate to severe in intensity".to_string());
        } else if avg_severity < 2.5 {
            patterns.push("Episodes are generally mild in nature".to_string());
        }

        if high_severity_count > episodes.len() / 3 {
            patterns.push("Frequent high-severity episodes may indicate need for medical evaluation".to_string());
        }

        if low_severity_count > episodes.len() * 2 / 3 {
            patterns.push("Most episodes are mild, suggesting good overall management".to_string());
        }

        // Analyze trends (simplified)
        if episodes.len() >= 3 {
            let recent_avg = severities.iter().take(3).sum::<i32>() as f32 / 3.0;
            let older_avg = severities.iter().skip(3).sum::<i32>() as f32 / (severities.len() - 3).max(1) as f32;

            if recent_avg > older_avg + 0.5 {
                patterns.push("Recent episodes show increasing severity trend".to_string());
            } else if recent_avg < older_avg - 0.5 {
                patterns.push("Recent episodes show decreasing severity trend".to_string());
            }
        }

        patterns
    }

    fn analyze_time_patterns(&self, episodes: &[Episode]) -> Vec<String> {
        use chrono::{Datelike, Timelike};
        let mut patterns = Vec::new();

        if episodes.is_empty() {
            return patterns;
        }

        // Analyze hour patterns
        let mut hour_counts = vec![0; 24];
        let mut weekday_counts = vec![0; 7];

        for episode in episodes {
            let hour = episode.timestamp.hour() as usize;
            let weekday = episode.timestamp.weekday().number_from_monday() as usize - 1;

            hour_counts[hour] += 1;
            weekday_counts[weekday] += 1;
        }

        // Find peak hours
        if let Some((peak_hour, &count)) = hour_counts.iter().enumerate().max_by_key(|&(_, count)| count) {
            if count >= 2 {
                let time_period = match peak_hour {
                    0..=5 => "early morning (12 AM - 6 AM)",
                    6..=11 => "morning (6 AM - 12 PM)",
                    12..=17 => "afternoon (12 PM - 6 PM)",
                    18..=23 => "evening (6 PM - 12 AM)",
                    _ => "unknown time",
                };
                patterns.push(format!("Episodes occur more frequently during {}", time_period));
            }
        }

        // Analyze weekday patterns
        let weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        if let Some((peak_day_idx, &count)) = weekday_counts.iter().enumerate().max_by_key(|&(_, count)| count) {
            if count >= 2 {
                patterns.push(format!("Higher occurrence on {}s", weekdays[peak_day_idx]));
            }
        }

        // Analyze duration patterns
        let durations: Vec<_> = episodes.iter().filter_map(|e| e.duration_minutes).collect();
        if !durations.is_empty() {
            let avg_duration = durations.iter().sum::<i32>() as f32 / durations.len() as f32;
            if avg_duration > 60.0 {
                patterns.push("Episodes tend to be long-lasting (> 1 hour)".to_string());
            } else if avg_duration < 15.0 {
                patterns.push("Episodes are typically brief (< 15 minutes)".to_string());
            }
        }

        patterns
    }

    fn identify_risk_factors(&self, episodes: &[Episode]) -> Vec<String> {
        let mut risk_factors = Vec::new();

        let high_severity_count = episodes.iter().filter(|e| e.severity >= 4).count();
        let total_count = episodes.len();

        if high_severity_count > total_count / 2 {
            risk_factors.push("High frequency of severe episodes".to_string());
        }

        // Check for concerning patterns
        let recent_episodes = episodes.iter().take(3);
        let recent_severe_count = recent_episodes.filter(|e| e.severity >= 4).count();

        if recent_severe_count >= 2 {
            risk_factors.push("Recent increase in severe episodes".to_string());
        }

        // Duration-based risk factors
        let long_episodes = episodes.iter().filter(|e|
            e.duration_minutes.map_or(false, |d| d > 120)
        ).count();

        if long_episodes > 0 {
            risk_factors.push("Episodes with extended duration (>2 hours)".to_string());
        }

        // Frequency risk
        if episodes.len() > 10 {
            risk_factors.push("High episode frequency may indicate underlying condition".to_string());
        }

        risk_factors
    }

    fn generate_pattern_recommendations(&self, episodes: &[Episode], triggers: &[String], severity_patterns: &[String]) -> Vec<String> {
        let mut recommendations = Vec::new();

        // Trigger-based recommendations
        if !triggers.is_empty() {
            recommendations.push("Consider avoiding or managing identified common triggers".to_string());
            for trigger in triggers.iter().take(3) {
                recommendations.push(format!("Pay attention to: {}", trigger));
            }
        }

        // Severity-based recommendations
        let avg_severity = episodes.iter().map(|e| e.severity).sum::<i32>() as f32 / episodes.len() as f32;

        if avg_severity > 3.5 {
            recommendations.push("Consider consulting with a healthcare provider for recurring severe episodes".to_string());
            recommendations.push("Keep a detailed symptom diary for medical appointments".to_string());
        }

        if avg_severity < 2.0 {
            recommendations.push("Continue current management strategies as they appear effective".to_string());
        }

        // Pattern-based recommendations
        for pattern in severity_patterns {
            if pattern.contains("increasing severity") {
                recommendations.push("Monitor for triggers that may be causing worsening symptoms".to_string());
                recommendations.push("Schedule medical evaluation for increasing severity trend".to_string());
                break;
            }
        }

        // Duration-based recommendations
        let long_duration_episodes = episodes.iter().filter(|e|
            e.duration_minutes.map_or(false, |d| d > 60)
        ).count();

        if long_duration_episodes > 0 {
            recommendations.push("For long-lasting episodes, ensure safe positioning and hydration".to_string());
        }

        if recommendations.is_empty() {
            recommendations.push("Continue monitoring episodes and maintain consistent logging".to_string());
            recommendations.push("Focus on identifying potential triggers and patterns".to_string());
        }

        recommendations
    }
}