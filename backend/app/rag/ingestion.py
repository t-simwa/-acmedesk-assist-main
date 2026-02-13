"""
Document ingestion module.

This module provides functions to:
- Read documents from storage (filesystem)
- Normalize content into a common structure
- Process multiple documents in a directory
"""

import logging
from pathlib import Path
from typing import List, Optional

from .loaders import load_document

logger = logging.getLogger(__name__)


class Document:
    """
    Normalized document structure.

    Attributes:
        text: The full text content of the document
        title: Title of the document
        url: URL or path to the document
        doc_id: Unique identifier for the document
    """

    def __init__(self, text: str, title: str, url: str, doc_id: str):
        self.text = text
        self.title = title
        self.url = url
        self.doc_id = doc_id

    def to_dict(self) -> dict:
        """Convert document to dictionary."""
        return {
            "text": self.text,
            "title": self.title,
            "url": self.url,
            "doc_id": self.doc_id,
        }

    def __repr__(self) -> str:
        return f"Document(doc_id={self.doc_id}, title={self.title})"


def ingest_document(file_path: Path) -> Optional[Document]:
    """
    Ingest a single document from a file path.

    Reads the document using the appropriate loader based on file extension,
    then normalizes it into a Document object.

    Args:
        file_path: Path to the document file

    Returns:
        Document object if successful, None if file format is not supported or error occurs
    """
    if not file_path.exists():
        logger.error(f"File does not exist: {file_path}")
        return None

    if not file_path.is_file():
        logger.error(f"Path is not a file: {file_path}")
        return None

    try:
        doc_data = load_document(file_path)
        if doc_data is None:
            return None

        return Document(
            text=doc_data["text"],
            title=doc_data["title"],
            url=doc_data["url"],
            doc_id=doc_data["doc_id"],
        )
    except Exception as e:
        logger.error(f"Error ingesting document {file_path}: {e}")
        return None


def ingest_directory(directory_path: Path, recursive: bool = False) -> List[Document]:
    """
    Ingest all supported documents from a directory.

    Reads all supported document files (.md, .html, .htm, .txt) from the
    specified directory and normalizes them into Document objects.

    Args:
        directory_path: Path to the directory containing documents
        recursive: If True, search subdirectories recursively

    Returns:
        List of Document objects
    """
    if not directory_path.exists():
        logger.error(f"Directory does not exist: {directory_path}")
        return []

    if not directory_path.is_dir():
        logger.error(f"Path is not a directory: {directory_path}")
        return []

    documents: List[Document] = []
    supported_extensions = {".md", ".markdown", ".html", ".htm", ".txt"}

    if recursive:
        pattern = "**/*"
    else:
        pattern = "*"

    for file_path in directory_path.glob(pattern):
        if file_path.is_file() and file_path.suffix.lower() in supported_extensions:
            doc = ingest_document(file_path)
            if doc:
                documents.append(doc)
                logger.info(f"Successfully ingested: {file_path.name}")
            else:
                logger.warning(f"Failed to ingest: {file_path.name}")

    logger.info(f"Ingested {len(documents)} documents from {directory_path}")
    return documents
