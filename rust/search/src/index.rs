use tantivy::{Index, schema::*, collector::TopDocs, query::QueryParser, ReloadPolicy, TantivyDocument as TantivyDoc};
use rust_stemmers::{Algorithm::English, Stemmer};
use anyhow::Result;
use std::path::Path;
use tracing::info;

pub struct SearchIndex {
    index: Index,
    schema: Schema,
}

impl SearchIndex {
    pub fn new(path: &Path) -> Result<Self> {
        let mut schema_builder = Schema::builder();
        schema_builder.add_text_field("cid", STRING | STORED);
        schema_builder.add_text_field("body", TEXT | STORED);
        let schema = schema_builder.build();

        let index = Index::create_in_dir(path, schema.clone())?;
        Ok(Self { index, schema })
    }

    /// Add document
    pub fn add(&self, cid: &str, text: &str) -> Result<()> {
        let stemmer = Stemmer::create(English);
        let stemmed_text = text.split_whitespace()
            .map(|w| stemmer.stem(w).into_owned())
            .collect::<Vec<_>>()
            .join(" ");

        let mut writer = self.index.writer(50_000_000)?;
        let cid_field = self.schema.get_field("cid")?;
        let body_field = self.schema.get_field("body")?;

        let mut doc = TantivyDoc::default();
        doc.add_text(cid_field, cid);
        doc.add_text(body_field, &stemmed_text);
        writer.add_document(doc)?;
        writer.commit()?;
        info!("Indexed document {}", cid);
        Ok(())
    }

    /// Search query: Vec<CID> sorted by BM25
    pub fn search(&self, query_str: &str) -> Result<Vec<String>> {
        let reader = self.index.reader_builder().reload_policy(ReloadPolicy::Manual).try_into()?;
        let searcher = reader.searcher();

        let query_parser = QueryParser::for_index(&self.index, vec![self.schema.get_field("body")?]);
        let query = query_parser.parse_query(query_str)?;

        let top_docs = searcher.search(&query, &TopDocs::with_limit(100))?;
        let cid_field = self.schema.get_field("cid")?;

        let hits: Vec<String> = top_docs.iter()
            .filter_map(|(_, doc_addr)| searcher.doc(*doc_addr).ok())
            .filter_map(|doc: TantivyDoc| doc.get_first(cid_field).and_then(|v| v.as_str().map(str::to_string)))
            .collect();

        Ok(hits)
    }
}
