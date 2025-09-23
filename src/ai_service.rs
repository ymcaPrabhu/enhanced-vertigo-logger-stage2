use reqwest::Client;
use serde_json::{json, Value};
use std::env;

use crate::models::{AnalysisRequest, AnalysisResponse};

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
}