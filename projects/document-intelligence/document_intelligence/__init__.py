"""A deterministic, evidence-first document question-answering starter."""

from .pipeline import DocumentIntelligence, load_documents

__all__ = ["DocumentIntelligence", "load_documents"]
