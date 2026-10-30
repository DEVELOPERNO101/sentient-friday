#[derive(Debug, Clone)]
pub struct LocalInferenceSidecar {
    pub name: String,
    pub binary_path: String,
    pub model_path: String,
    pub backend: String,
    pub endpoint: String,
    pub enabled: bool,
}

impl Default for LocalInferenceSidecar {
    fn default() -> Self {
        Self {
            name: "sentient-sidecar".to_string(),
            binary_path: "ollama".to_string(),
            model_path: "models/vision-qwen2.5-vl.gguf".to_string(),
            backend: "llama.cpp".to_string(),
            endpoint: "http://127.0.0.1:11434/api/chat".to_string(),
            enabled: true,
        }
    }
}

impl LocalInferenceSidecar {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn command(&self) -> Vec<String> {
        vec![
            self.binary_path.clone(),
            "run".to_string(),
            self.model_path.clone(),
            "--host".to_string(),
            "127.0.0.1".to_string(),
        ]
    }

    pub fn validate(&self) -> Result<(), String> {
        if self.binary_path.trim().is_empty() {
            return Err("sidecar binary path is empty".to_string());
        }

        if self.model_path.trim().is_empty() {
            return Err("sidecar model path is empty".to_string());
        }

        Ok(())
    }
}
