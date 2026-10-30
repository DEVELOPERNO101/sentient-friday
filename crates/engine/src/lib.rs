use chrono::Utc;

use sentient_shared::KnowledgeNote;

#[derive(Debug, Clone)]
pub struct SourceDigest {
    pub source_name: String,
    pub title: String,
    pub summary: String,
    pub highlights: Vec<String>,
    pub tags: Vec<String>,
}

impl SourceDigest {
    pub fn new(
        source_name: impl Into<String>,
        title: impl Into<String>,
        summary: impl Into<String>,
    ) -> Self {
        Self {
            source_name: source_name.into(),
            title: title.into(),
            summary: summary.into(),
            highlights: Vec::new(),
            tags: Vec::new(),
        }
    }

    pub fn with_highlights(mut self, highlights: Vec<&str>) -> Self {
        self.highlights = highlights.iter().map(|item| item.to_string()).collect();
        self
    }

    pub fn with_tags(mut self, tags: Vec<&str>) -> Self {
        self.tags = tags.iter().map(|tag| tag.to_string()).collect();
        self
    }
}

pub struct KnowledgeBuilder {
    pub notes: Vec<KnowledgeNote>,
}

impl KnowledgeBuilder {
    pub fn new() -> Self {
        Self { notes: Vec::new() }
    }

    pub fn add_note(&mut self, title: &str, path: &str, content: &str, tags: Vec<&str>) {
        let note = KnowledgeNote {
            title: title.to_string(),
            path: path.to_string(),
            content: content.to_string(),
            created_at: Utc::now(),
            tags: tags.iter().map(|tag| tag.to_string()).collect(),
        };
        self.notes.push(note);
    }

    pub fn add_digest(&mut self, digest: SourceDigest, path: &str) {
        let content = self.summarize_digest(&digest);
        self.add_note(
            &digest.title,
            path,
            &content,
            digest.tags.iter().map(String::as_str).collect(),
        );
    }

    pub fn summarize_digest(&self, digest: &SourceDigest) -> String {
        let mut markdown = String::new();
        markdown.push_str(&format!("# {}\n\n", digest.title));
        markdown.push_str(&format!("Source: {}\n\n", digest.source_name));
        markdown.push_str(&format!("{}\n\n", digest.summary));

        if !digest.highlights.is_empty() {
            markdown.push_str("## Highlights\n\n");
            for item in &digest.highlights {
                markdown.push_str(&format!("- {}\n", item));
            }
            markdown.push('\n');
        }

        markdown
    }

    pub fn summarize_sources(&self, source_name: &str, fragments: &[&str], title: &str) -> String {
        let summary = fragments
            .iter()
            .filter(|fragment| !fragment.trim().is_empty())
            .map(|fragment| fragment.trim())
            .take(3)
            .collect::<Vec<_>>()
            .join(" ");

        let digest = SourceDigest::new(source_name, title, summary)
            .with_highlights(fragments.iter().map(|fragment| *fragment).take(3).collect())
            .with_tags(vec!["source", "summary"]);

        self.summarize_digest(&digest)
    }

    pub fn render_markdown(&self) -> String {
        let mut output = String::new();
        for note in &self.notes {
            output.push_str(&format!("# {}\n\n{}\n\n", note.title, note.content));
        }
        output
    }
}

impl Default for KnowledgeBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::{KnowledgeBuilder, SourceDigest};

    #[test]
    fn source_digest_can_be_converted_to_markdown() {
        let digest = SourceDigest::new(
            "Files",
            "Weekly brief",
            "Three key updates came in this week.",
        )
        .with_highlights(vec!["Launch plan", "Customer follow-up", "Risk review"])
        .with_tags(vec!["work", "summary"]);

        let builder = KnowledgeBuilder::new();
        let rendered = builder.summarize_digest(&digest);
        assert!(rendered.contains("# Weekly brief"));
        assert!(rendered.contains("Three key updates came in this week."));
        assert!(rendered.contains("- Launch plan"));
    }

    #[test]
    fn builder_can_render_a_knowledge_summary() {
        let mut builder = KnowledgeBuilder::new();
        builder.add_note(
            "Morning brief",
            "notes/morning-brief.md",
            "- Review project plan\n- Check launch items\n- Write follow-up note",
            vec!["work", "summary"],
        );

        let rendered = builder.render_markdown();
        assert!(rendered.contains("# Morning brief"));
        assert!(rendered.contains("- Review project plan"));
    }
}
