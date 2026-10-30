use chrono::{DateTime, Utc};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ScheduleMode {
    Nightly,
    Manual,
    Disabled,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProactiveCard {
    pub title: String,
    pub summary: String,
    pub category: String,
    pub requires_approval: bool,
}

#[derive(Debug, Clone)]
pub struct SchedulePolicy {
    pub mode: ScheduleMode,
    pub run_at_local_hour: u32,
    pub wake_helper_enabled: bool,
    pub plugged_in_only: bool,
    pub last_run_at: Option<DateTime<Utc>>,
    pub card_window: u32,
}

impl SchedulePolicy {
    pub fn default_policy() -> Self {
        Self {
            mode: ScheduleMode::Nightly,
            run_at_local_hour: 3,
            wake_helper_enabled: true,
            plugged_in_only: false,
            last_run_at: None,
            card_window: 60,
        }
    }

    pub fn is_due(&self, now_utc: &DateTime<Utc>) -> bool {
        if self.mode == ScheduleMode::Disabled {
            return false;
        }

        let hours = now_utc.hour();
        match self.mode {
            ScheduleMode::Nightly => {
                hours >= self.run_at_local_hour && hours < self.run_at_local_hour + 1
            }
            ScheduleMode::Manual => false,
            ScheduleMode::Disabled => false,
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct Scheduler {
    pub policy: SchedulePolicy,
    pub cards: Vec<ProactiveCard>,
}

impl Scheduler {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn add_card(&mut self, title: &str, summary: &str, category: &str) {
        self.cards.push(ProactiveCard {
            title: title.to_string(),
            summary: summary.to_string(),
            category: category.to_string(),
            requires_approval: true,
        });
    }

    pub fn upcoming_cards(&self) -> Vec<&ProactiveCard> {
        self.cards
            .iter()
            .filter(|card| card.requires_approval)
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use chrono::{TimeZone, Utc};

    use super::{ProactiveCard, ScheduleMode, SchedulePolicy, Scheduler};

    #[test]
    fn default_policy_uses_nightly_schedule() {
        let policy = SchedulePolicy::default_policy();
        assert_eq!(policy.mode, ScheduleMode::Nightly);
        assert_eq!(policy.run_at_local_hour, 3);
        assert!(policy.wake_helper_enabled);
        assert_eq!(policy.card_window, 60);
    }

    #[test]
    fn scheduler_tracks_approval_cards() {
        let mut scheduler = Scheduler::new();
        scheduler.add_card(
            "Renew subscription",
            "Your annual plan renews next week.",
            "renewal",
        );

        assert_eq!(scheduler.upcoming_cards().len(), 1);
        assert_eq!(scheduler.cards[0].category, "renewal");
    }

    #[test]
    fn nightly_policy_uses_windowed_due_check() {
        let policy = SchedulePolicy::default_policy();
        let now = Utc.with_ymd_and_hms(2026, 10, 29, 3, 30, 0).unwrap();
        assert!(policy.is_due(&now));

        let later = Utc.with_ymd_and_hms(2026, 10, 29, 5, 0, 0).unwrap();
        assert!(!policy.is_due(&later));
    }
}
