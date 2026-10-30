use sentient_shared::ProviderConfig;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProviderFamily {
    Local,
    Hosted,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ModelProviderKind {
    Ollama,
    LmStudio,
    LlamaCpp,
    OpenAi,
    Anthropic,
    OpenRouter,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ModelMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChatCompletionRequest {
    pub model: String,
    pub messages: Vec<ModelMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
}

impl ChatCompletionRequest {
    pub fn new(model: impl Into<String>, prompt: impl Into<String>) -> Self {
        Self {
            model: model.into(),
            messages: vec![ModelMessage {
                role: "user".to_string(),
                content: prompt.into(),
            }],
            temperature: Some(0.2),
            stream: Some(false),
        }
    }
}

#[derive(Debug, Clone)]
pub struct ModelRouter {
    pub primary: ProviderConfig,
    pub double_tap: ProviderConfig,
}

impl ModelRouter {
    pub fn new(primary: ProviderConfig, double_tap: ProviderConfig) -> Self {
        Self {
            primary,
            double_tap,
        }
    }

    pub fn provider_kind_for(&self, name: &str) -> ProviderFamily {
        let normalized = name.to_ascii_lowercase();
        if normalized.contains("ollama")
            || normalized.contains("llama.cpp")
            || normalized.contains("lm studio")
            || normalized.contains("lm-studio")
        {
            ProviderFamily::Local
        } else {
            ProviderFamily::Hosted
        }
    }
}

#[derive(Debug, Clone)]
pub struct ModelProvider {
    pub config: ProviderConfig,
}

impl ModelProvider {
    pub fn new(config: ProviderConfig) -> Self {
        Self { config }
    }

    pub fn kind(&self) -> ModelProviderKind {
        let raw = self.config.name.to_ascii_lowercase();
        let label = self
            .config
            .base_url
            .as_deref()
            .unwrap_or_default()
            .to_ascii_lowercase();

        if raw.contains("ollama") || label.contains("11434") {
            ModelProviderKind::Ollama
        } else if raw.contains("lm studio") || raw.contains("lm-studio") || label.contains("1234") {
            ModelProviderKind::LmStudio
        } else if raw.contains("llama.cpp") || label.contains("8080") || label.contains("8081") {
            ModelProviderKind::LlamaCpp
        } else if raw.contains("openrouter") {
            ModelProviderKind::OpenRouter
        } else if raw.contains("anthropic") {
            ModelProviderKind::Anthropic
        } else {
            ModelProviderKind::OpenAi
        }
    }

    pub fn family(&self) -> ProviderFamily {
        match self.kind() {
            ModelProviderKind::Ollama
            | ModelProviderKind::LmStudio
            | ModelProviderKind::LlamaCpp => ProviderFamily::Local,
            ModelProviderKind::OpenAi
            | ModelProviderKind::Anthropic
            | ModelProviderKind::OpenRouter => ProviderFamily::Hosted,
        }
    }

    pub fn default_base_url(&self) -> String {
        match self.kind() {
            ModelProviderKind::Ollama => "http://localhost:11434/v1".to_string(),
            ModelProviderKind::LmStudio => "http://localhost:1234/v1".to_string(),
            ModelProviderKind::LlamaCpp => "http://localhost:8080".to_string(),
            ModelProviderKind::OpenAi => "https://api.openai.com/v1".to_string(),
            ModelProviderKind::Anthropic => "https://api.anthropic.com".to_string(),
            ModelProviderKind::OpenRouter => "https://openrouter.ai/api/v1".to_string(),
        }
    }

    pub fn resolved_base_url(&self) -> String {
        self.config
            .base_url
            .clone()
            .unwrap_or_else(|| self.default_base_url())
    }

    pub fn requires_api_key(&self) -> bool {
        matches!(
            self.kind(),
            ModelProviderKind::OpenAi
                | ModelProviderKind::Anthropic
                | ModelProviderKind::OpenRouter
        )
    }

    pub fn supports_vision(&self) -> bool {
        match self.kind() {
            ModelProviderKind::OpenAi => {
                let lower = self.config.model.to_ascii_lowercase();
                lower.contains("vision") || lower.contains("gpt-4o") || lower.contains("gpt-4.1")
            }
            ModelProviderKind::Anthropic => {
                let lower = self.config.model.to_ascii_lowercase();
                lower.contains("claude") && lower.contains("3.5")
            }
            ModelProviderKind::OpenRouter => true,
            ModelProviderKind::Ollama
            | ModelProviderKind::LmStudio
            | ModelProviderKind::LlamaCpp => {
                let lower = self.config.model.to_ascii_lowercase();
                lower.contains("vision") || lower.contains("qwen2.5vl") || lower.contains("llava")
            }
        }
    }

    pub fn endpoint(&self) -> String {
        let base = self.resolved_base_url().trim_end_matches('/');
        match self.kind() {
            ModelProviderKind::Ollama => format!("{base}/api/chat"),
            ModelProviderKind::LmStudio => format!("{base}/chat/completions"),
            ModelProviderKind::LlamaCpp => format!("{base}/v1/chat/completions"),
            ModelProviderKind::OpenAi | ModelProviderKind::OpenRouter => {
                format!("{base}/chat/completions")
            }
            ModelProviderKind::Anthropic => format!("{base}/v1/messages"),
        }
    }

    pub fn build_chat_request(&self, prompt: impl Into<String>) -> ChatCompletionRequest {
        ChatCompletionRequest::new(self.config.model.clone(), prompt)
    }
}

#[cfg(test)]
mod tests {
    use super::{ModelProvider, ModelProviderKind, ProviderFamily};
    use sentient_shared::ProviderConfig;

    #[test]
    fn local_provider_defaults_use_ollama_urls() {
        let provider = ModelProvider::new(ProviderConfig {
            name: "Ollama".to_string(),
            kind: "local".to_string(),
            base_url: None,
            api_key: None,
            model: "llama3.1".to_string(),
            enabled: true,
        });

        assert_eq!(provider.kind(), ModelProviderKind::Ollama);
        assert_eq!(provider.family(), ProviderFamily::Local);
        assert_eq!(provider.default_base_url(), "http://localhost:11434/v1");
        assert_eq!(provider.endpoint(), "http://localhost:11434/v1/api/chat");
    }

    #[test]
    fn hosted_provider_uses_api_key_and_chat_endpoint() {
        let provider = ModelProvider::new(ProviderConfig {
            name: "OpenAI".to_string(),
            kind: "hosted".to_string(),
            base_url: Some("https://api.openai.com/v1".to_string()),
            api_key: Some("secret".to_string()),
            model: "gpt-4o".to_string(),
            enabled: true,
        });

        assert_eq!(provider.kind(), ModelProviderKind::OpenAi);
        assert_eq!(provider.family(), ProviderFamily::Hosted);
        assert!(provider.requires_api_key());
        assert!(provider.supports_vision());
        assert_eq!(
            provider.endpoint(),
            "https://api.openai.com/v1/chat/completions"
        );
    }

    #[test]
    fn chat_payload_includes_model_and_user_message() {
        let provider = ModelProvider::new(ProviderConfig {
            name: "LM Studio".to_string(),
            kind: "local".to_string(),
            base_url: None,
            api_key: None,
            model: "qwen2.5vl".to_string(),
            enabled: true,
        });

        let request = provider.build_chat_request("Summarize the note");
        assert_eq!(request.model, "qwen2.5vl");
        assert_eq!(request.messages.len(), 1);
        assert_eq!(request.messages[0].role, "user");
        assert_eq!(request.messages[0].content, "Summarize the note");
    }
}
