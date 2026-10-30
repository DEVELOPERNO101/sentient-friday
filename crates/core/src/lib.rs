use std::collections::HashMap;

use sentient_shared::{ApprovalState, ProviderConfig, SourceSelection};

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub knowledge_dir: String,
    pub sources: Vec<SourceSelection>,
    pub providers: HashMap<String, ProviderConfig>,
    pub default_hotkey: String,
    pub privacy_mode: bool,
}

impl AppConfig {
    pub fn new() -> Self {
        Self {
            knowledge_dir: "~/Sentient OS - Knowledge Base".to_string(),
            sources: Vec::new(),
            providers: HashMap::new(),
            default_hotkey: "Ctrl+Space".to_string(),
            privacy_mode: true,
        }
    }

    pub fn add_source(&mut self, source: SourceSelection) {
        self.sources.push(source);
    }

    pub fn set_provider(&mut self, key: String, provider: ProviderConfig) {
        self.providers.insert(key, provider);
    }
}

pub fn evaluate_approval(approved: bool, reason: Option<&str>) -> ApprovalState {
    ApprovalState {
        approved,
        reason: reason.map(str::to_owned),
    }
}
