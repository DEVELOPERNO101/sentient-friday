use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

pub mod knowledge;
pub mod vault;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct KnowledgeNote {
    pub title: String,
    pub path: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SourceSelection {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub enabled: bool,
    pub privacy_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ProviderConfig {
    pub name: String,
    pub kind: String,
    pub base_url: Option<String>,
    pub api_key: Option<String>,
    pub model: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ApprovalState {
    pub approved: bool,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AgentAction {
    pub id: String,
    pub label: String,
    pub description: String,
}
