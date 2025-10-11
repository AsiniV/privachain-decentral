use tantivy::{Index, schema::*, TantivyDocument as TantivyDoc};
use rust_stemmers::{Algorithm::English, Stemmer};
use anyhow::Result;
use std::path::Path;
use tracing::info;
use bm25::{SearchEngine, SearchEngineBuilder, Language, Document};
use std::sync::Mutex;

pub struct SearchIndex {
    index: Index,
    schema: Schema,
    bm25_engine: Mutex<SearchEngine<String>>,
}

impl SearchIndex {
    pub fn new(path: &Path) -> Result<Self> {
        let mut schema_builder = Schema::builder();
        schema_builder.add_text_field("cid", STRING | STORED);
        schema_builder.add_text_field("body", TEXT | STORED);
        let schema = schema_builder.build();

        let index = Index::create_in_dir(path, schema.clone())?;
        
        // Initialize BM25 with empty documents using k=1.25, b=0.75 (standard BM25 parameters)
        let documents: Vec<Document<String>> = Vec::new();
        let bm25_engine: SearchEngine<String> = SearchEngineBuilder::with_documents(Language::English, documents)
            .build();
        
        Ok(Self { 
            index, 
            schema,
            bm25_engine: Mutex::new(bm25_engine),
        })
    }

    /// Add document
    pub fn add(&self, cid: &str, text: &str) -> Result<()> {
        let stemmer = Stemmer::create(English);
        let stemmed_text = text.split_whitespace()
            .map(|w| stemmer.stem(w).into_owned())
            .collect::<Vec<_>>()
            .join(" ");

        // Add to Tantivy index
        let mut writer = self.index.writer(50_000_000)?;
        let cid_field = self.schema.get_field("cid")?;
        let body_field = self.schema.get_field("body")?;

        let mut doc = TantivyDoc::default();
        doc.add_text(cid_field, cid);
        doc.add_text(body_field, &stemmed_text);
        writer.add_document(doc)?;
        writer.commit()?;
        
        // Add to BM25 corpus
        self.add_to_corpus(cid, text)?;
        
        info!("Indexed document {}", cid);
        Ok(())
    }
    
    /// Add document to BM25 corpus
    pub fn add_to_corpus(&self, cid: &str, text: &str) -> Result<()> {
        let mut engine = self.bm25_engine.lock().unwrap();
        let doc = Document {
            id: cid.to_string(),
            contents: text.to_string(),
        };
        engine.upsert(doc);
        Ok(())
    }

    /// Search query: Vec<CID> sorted by BM25
    pub fn search(&self, query_str: &str) -> Result<Vec<String>> {
        // Use BM25 for ranking
        let engine = self.bm25_engine.lock().unwrap();
        let results = engine.search(query_str, 100);
        
        let cids: Vec<String> = results.iter()
            .map(|result| result.document.id.clone())
            .collect();
        
        Ok(cids)
    }
}
