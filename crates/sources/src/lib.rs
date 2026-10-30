use sentient_shared::SourceSelection;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SourceKind {
    Files,
    Notes,
    Mail,
    Calendar,
    Messages,
    Browser,
}

#[derive(Debug, Clone)]
pub struct SourcePlugin {
    pub id: String,
    pub name: String,
    pub kind: SourceKind,
    pub enabled: bool,
    pub privacy_level: String,
}

impl SourcePlugin {
    pub fn new(
        id: impl Into<String>,
        name: impl Into<String>,
        kind: SourceKind,
        enabled: bool,
        privacy_level: impl Into<String>,
    ) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            kind,
            enabled,
            privacy_level: privacy_level.into(),
        }
    }

    pub fn into_selection(self) -> SourceSelection {
        SourceSelection {
            id: self.id,
            name: self.name,
            kind: format!("{:?}", self.kind),
            enabled: self.enabled,
            privacy_level: self.privacy_level,
        }
    }

    pub fn summary_label(&self) -> String {
        format!("{} [{}]", self.name, self.privacy_level)
    }
}

#[derive(Debug, Clone, Default)]
pub struct SourceCatalog {
    pub plugins: Vec<SourcePlugin>,
}

impl SourceCatalog {
    pub fn add_plugin(&mut self, plugin: SourcePlugin) {
        self.plugins.push(plugin);
    }

    pub fn enabled_plugins(&self) -> Vec<&SourcePlugin> {
        self.plugins
            .iter()
            .filter(|plugin| plugin.enabled)
            .collect()
    }

    pub fn by_kind(&self, kind: SourceKind) -> Vec<&SourcePlugin> {
        self.plugins
            .iter()
            .filter(|plugin| plugin.kind == kind)
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::{SourceCatalog, SourceKind, SourcePlugin};

    #[test]
    fn source_plugins_can_be_registered_and_filtered() {
        let mut catalog = SourceCatalog::default();
        catalog.add_plugin(SourcePlugin::new(
            "files",
            "Files",
            SourceKind::Files,
            true,
            "local_only",
        ));
        catalog.add_plugin(SourcePlugin::new(
            "mail",
            "Mail",
            SourceKind::Mail,
            false,
            "user_approved",
        ));

        assert_eq!(catalog.enabled_plugins().len(), 1);
        assert_eq!(catalog.by_kind(SourceKind::Files).len(), 1);
    }

    #[test]
    fn plugin_selection_keeps_privacy_metadata() {
        let plugin = SourcePlugin::new("notes", "Notes", SourceKind::Notes, true, "opt_in");

        let selection = plugin.clone().into_selection();
        assert_eq!(selection.name, "Notes");
        assert_eq!(selection.kind, "Notes");
        assert_eq!(plugin.summary_label(), "Notes [opt_in]");
    }
}
