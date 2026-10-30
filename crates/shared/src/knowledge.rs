use std::collections::HashSet;

pub fn build_links(notes: &[String]) -> Vec<(String, String)> {
    let mut links = Vec::new();
    let unique = notes.iter().cloned().collect::<HashSet<_>>();
    let mut ordered = unique.into_iter().collect::<Vec<_>>();
    ordered.sort();
    for pair in ordered.windows(2) {
        links.push((pair[0].clone(), pair[1].clone()));
    }
    links
}
