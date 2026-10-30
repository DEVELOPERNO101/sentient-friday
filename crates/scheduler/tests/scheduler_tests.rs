use sentient_scheduler::{ScheduleMode, SchedulePolicy};

#[test]
fn default_policy_uses_nightly_schedule() {
    let policy = SchedulePolicy::default_policy();
    assert_eq!(policy.mode, ScheduleMode::Nightly);
    assert_eq!(policy.run_at_local_hour, 3);
    assert!(policy.wake_helper_enabled);
    assert_eq!(policy.card_window, 60);
}
