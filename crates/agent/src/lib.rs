use sentient_platform::{AutomationAction, AutomationSession};
use sentient_shared::{AgentAction, ApprovalState};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WritingStyle {
    pub name: String,
    pub tone: String,
    pub rules: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DraftContext {
    pub prompt: String,
    pub recent_conversation: Vec<String>,
    pub knowledge_snippets: Vec<String>,
    pub writing_style: WritingStyle,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SidekickRequest {
    pub prompt: String,
    pub voice: bool,
    pub requires_stop_button: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SidekickPlan {
    pub session: AutomationSession,
    pub requires_confirmation: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DoubleTapDraft {
    pub draft: String,
    pub requires_confirmation: bool,
}

impl DoubleTapDraft {
    pub fn new(draft: impl Into<String>) -> Self {
        Self {
            draft: draft.into(),
            requires_confirmation: true,
        }
    }

    pub fn from_context(context: &DraftContext) -> Self {
        let conversation = context
            .recent_conversation
            .iter()
            .map(|line| line.trim())
            .filter(|line| !line.is_empty())
            .take(3)
            .collect::<Vec<_>>();

        let knowledge = context
            .knowledge_snippets
            .iter()
            .map(|line| line.trim())
            .filter(|line| !line.is_empty())
            .take(2)
            .collect::<Vec<_>>();

        let style_rules = context
            .writing_style
            .rules
            .iter()
            .map(String::as_str)
            .collect::<Vec<_>>()
            .join("; ");

        let intent = context.prompt.trim();
        let base = if intent.is_empty() {
            "Thanks for the update — I’m on it.".to_string()
        } else {
            format!("Thanks for the note. I’ll take care of {}.", intent)
        };

        let contextual_lines = if conversation.is_empty() && knowledge.is_empty() {
            vec![base]
        } else {
            let mut lines = vec![base];
            if !conversation.is_empty() {
                lines.push(format!(
                    "Based on the current thread: {}",
                    conversation.join(" ")
                ));
            }
            if !knowledge.is_empty() {
                lines.push(format!("Relevant context: {}", knowledge.join(" • ")));
            }
            lines.push(format!("Tone: {}", context.writing_style.tone));
            lines.push(format!("Style guardrails: {}", style_rules));
            lines
        };

        let draft = contextual_lines.join("\n\n");
        Self {
            draft,
            requires_confirmation: true,
        }
    }
}

pub struct AgentRuntime {
    pub actions: Vec<AgentAction>,
}

impl AgentRuntime {
    pub fn new() -> Self {
        Self {
            actions: Vec::new(),
        }
    }

    pub fn add_action(&mut self, id: &str, label: &str, description: &str) {
        self.actions.push(AgentAction {
            id: id.to_string(),
            label: label.to_string(),
            description: description.to_string(),
        });
    }

    pub fn evaluate_action(&self, approved: bool, reason: Option<&str>) -> ApprovalState {
        ApprovalState {
            approved,
            reason: reason.map(str::to_owned),
        }
    }

    pub fn draft_reply(&self, context: &DraftContext) -> DoubleTapDraft {
        DoubleTapDraft::from_context(context)
    }

    pub fn plan_sidekick(&self, request: &SidekickRequest) -> SidekickPlan {
        let mut session = AutomationSession::new();
        let prompt = request.prompt.to_ascii_lowercase();

        if prompt.contains("screenshot") || prompt.contains("look") || prompt.contains("inspect") {
            session.add_action(AutomationAction::CaptureScreen {
                label: "sidekick-initial-screenshot".to_string(),
            });
        }

        if prompt.contains("open") || prompt.contains("focus") || prompt.contains("switch") {
            session.add_action(AutomationAction::FocusWindow {
                title: "Active application".to_string(),
            });
        }

        if prompt.contains("type") || prompt.contains("reply") || prompt.contains("draft") {
            session.add_action(AutomationAction::TypeText {
                text: request.prompt.clone(),
            });
        }

        if prompt.contains("attach") || prompt.contains("file") {
            session.add_action(AutomationAction::AttachFile {
                path: "~/Downloads/prompt-attachment.txt".to_string(),
            });
        }

        if request.voice {
            session.add_action(AutomationAction::PressKey {
                key: "Enter".to_string(),
            });
        }

        session.add_action(AutomationAction::MoveCursor { x: 320, y: 220 });
        session.add_action(AutomationAction::Click { x: 320, y: 220 });
        session.request_stop();

        SidekickPlan {
            session,
            requires_confirmation: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{AgentRuntime, DoubleTapDraft, DraftContext, SidekickRequest, WritingStyle};

    #[test]
    fn double_tap_uses_conversation_and_knowledge_to_build_a_reply() {
        let context = DraftContext {
            prompt: "Confirm the launch timeline".to_string(),
            recent_conversation: vec![
                "We should ship after QA signs off.".to_string(),
                "The client wants a short update.".to_string(),
            ],
            knowledge_snippets: vec![
                "Launch is scheduled for Friday morning.".to_string(),
                "Customer prefers direct and concise updates.".to_string(),
            ],
            writing_style: WritingStyle {
                name: "Executive".to_string(),
                tone: "clear, warm, concise".to_string(),
                rules: vec!["Keep it brief".to_string(), "Avoid jargon".to_string()],
            },
        };

        let draft = AgentRuntime::new().draft_reply(&context);
        assert!(draft.draft.contains("Confirm the launch timeline"));
        assert!(draft.draft.contains("clear, warm, concise"));
        assert!(draft.requires_confirmation);
    }

    #[test]
    fn double_tap_falls_back_to_a_safe_default_message() {
        let context = DraftContext {
            prompt: String::new(),
            recent_conversation: vec![],
            knowledge_snippets: vec![],
            writing_style: WritingStyle {
                name: "Default".to_string(),
                tone: "friendly".to_string(),
                rules: vec!["Be helpful".to_string()],
            },
        };

        let draft = DoubleTapDraft::from_context(&context);
        assert!(draft.draft.contains("Thanks for the update"));
        assert!(draft.requires_confirmation);
    }

    #[test]
    fn sidekick_plan_builds_a_visible_computer_use_sequence() {
        let request = SidekickRequest {
            prompt: "Please screenshot the app, type a follow-up, and attach the file".to_string(),
            voice: false,
            requires_stop_button: true,
        };

        let plan = AgentRuntime::new().plan_sidekick(&request);
        assert!(plan.requires_confirmation);
        assert!(matches!(
            plan.session.actions.first(),
            Some(sentient_platform::AutomationAction::CaptureScreen { .. })
        ));
        assert!(matches!(
            plan.session.actions.iter().last(),
            Some(sentient_platform::AutomationAction::Stop)
        ));
    }
}
