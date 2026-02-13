"""
Document loaders for various file formats.

This module provides loaders for:
- Markdown (.md) files
- HTML (.html, .htm) files
- Plain text (.txt) files
"""

import logging
import re
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def load_markdown(file_path: Path) -> dict:
    """
    Load and parse a markdown file.

    Extracts:
    - Title from first H1 heading or filename
    - Full text content
    - Preserves markdown structure

    Args:
        file_path: Path to the markdown file

    Returns:
        Dictionary with keys: 'text', 'title', 'url', 'doc_id'
    """
    try:
        content = file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        # Try with different encoding
        try:
            content = file_path.read_text(encoding="latin-1")
        except Exception as e:
            logger.error(f"Failed to read markdown file {file_path}: {e}")
            raise

    # Extract title from first H1 heading
    title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
    if title_match:
        title = title_match.group(1).strip()
    else:
        # Fallback to filename without extension
        title = file_path.stem.replace("_", " ").replace("-", " ").title()

    # Generate doc_id from filename
    doc_id = file_path.stem

    # Generate URL (relative path from data/docs)
    url = f"/docs/{file_path.name}"

    return {
        "text": content,
        "title": title,
        "url": url,
        "doc_id": doc_id,
    }


def load_html(file_path: Path) -> dict:
    """
    Load and parse an HTML file.

    Extracts:
    - Title from <title> tag or first <h1> heading
    - Text content with tags stripped, but keeps headings and links
    - Converts headings to markdown-style format
    - Preserves link text and URLs

    Args:
        file_path: Path to the HTML file

    Returns:
        Dictionary with keys: 'text', 'title', 'url', 'doc_id'
    """
    try:
        content = file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        try:
            content = file_path.read_text(encoding="latin-1")
        except Exception as e:
            logger.error(f"Failed to read HTML file {file_path}: {e}")
            raise

    # Extract title from <title> tag
    title_match = re.search(r"<title[^>]*>(.*?)</title>", content, re.IGNORECASE | re.DOTALL)
    if title_match:
        title = re.sub(r"<[^>]+>", "", title_match.group(1)).strip()
    else:
        # Try to extract from first <h1> tag
        h1_match = re.search(r"<h1[^>]*>(.*?)</h1>", content, re.IGNORECASE | re.DOTALL)
        if h1_match:
            title = re.sub(r"<[^>]+>", "", h1_match.group(1)).strip()
        else:
            # Fallback to filename
            title = file_path.stem.replace("_", " ").replace("-", " ").title()

    # Extract text content, preserving headings and links
    # Remove script and style tags
    content = re.sub(r"<script[^>]*>.*?</script>", "", content, flags=re.IGNORECASE | re.DOTALL)
    content = re.sub(r"<style[^>]*>.*?</style>", "", content, flags=re.IGNORECASE | re.DOTALL)

    # Convert headings to markdown-style
    content = re.sub(r"<h1[^>]*>(.*?)</h1>", r"# \1", content, flags=re.IGNORECASE | re.DOTALL)
    content = re.sub(r"<h2[^>]*>(.*?)</h2>", r"## \1", content, flags=re.IGNORECASE | re.DOTALL)
    content = re.sub(r"<h3[^>]*>(.*?)</h3>", r"### \1", content, flags=re.IGNORECASE | re.DOTALL)
    content = re.sub(r"<h4[^>]*>(.*?)</h4>", r"#### \1", content, flags=re.IGNORECASE | re.DOTALL)

    # Convert links to markdown-style [text](url)
    def link_replacer(match):
        link_text = re.sub(r"<[^>]+>", "", match.group(1))
        href = match.group(2) if match.group(2) else ""
        return f"[{link_text}]({href})"

    content = re.sub(
        r'<a[^>]*href=["\']?([^"\'>\s]*)["\']?[^>]*>(.*?)</a>',
        link_replacer,
        content,
        flags=re.IGNORECASE | re.DOTALL,
    )

    # Remove all remaining HTML tags
    text = re.sub(r"<[^>]+>", "", content)

    # Clean up whitespace
    text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)  # Multiple blank lines to double
    text = re.sub(r"[ \t]+", " ", text)  # Multiple spaces to single
    text = text.strip()

    # Generate doc_id from filename
    doc_id = file_path.stem

    # Generate URL (relative path from data/docs)
    url = f"/docs/{file_path.name}"

    return {
        "text": text,
        "title": title,
        "url": url,
        "doc_id": doc_id,
    }


def load_txt(file_path: Path) -> dict:
    """
    Load and parse a plain text file.

    Extracts:
    - Title from first line or filename
    - Full text content

    Args:
        file_path: Path to the text file

    Returns:
        Dictionary with keys: 'text', 'title', 'url', 'doc_id'
    """
    try:
        content = file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        try:
            content = file_path.read_text(encoding="latin-1")
        except Exception as e:
            logger.error(f"Failed to read text file {file_path}: {e}")
            raise

    # Extract title from first non-empty line (if it looks like a title)
    lines = content.strip().split("\n")
    title = None
    if lines:
        first_line = lines[0].strip()
        # If first line is short and doesn't end with punctuation, treat as title
        if len(first_line) < 100 and not first_line.endswith((".", "!", "?")):
            title = first_line
            # Remove title from content
            content = "\n".join(lines[1:]).strip()

    if not title:
        # Fallback to filename
        title = file_path.stem.replace("_", " ").replace("-", " ").title()

    # Generate doc_id from filename
    doc_id = file_path.stem

    # Generate URL (relative path from data/docs)
    url = f"/docs/{file_path.name}"

    return {
        "text": content,
        "title": title,
        "url": url,
        "doc_id": doc_id,
    }


def load_document(file_path: Path) -> Optional[dict]:
    """
    Load a document based on its file extension.

    Supports:
    - .md, .markdown -> markdown loader
    - .html, .htm -> HTML loader
    - .txt -> text loader

    Args:
        file_path: Path to the document file

    Returns:
        Dictionary with keys: 'text', 'title', 'url', 'doc_id'
        Returns None if file format is not supported
    """
    suffix = file_path.suffix.lower()

    if suffix in [".md", ".markdown"]:
        return load_markdown(file_path)
    elif suffix in [".html", ".htm"]:
        return load_html(file_path)
    elif suffix == ".txt":
        return load_txt(file_path)
    else:
        logger.warning(f"Unsupported file format: {suffix} for file {file_path}")
        return None
