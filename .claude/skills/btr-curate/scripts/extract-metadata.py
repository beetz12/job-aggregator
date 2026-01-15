#!/usr/bin/env python3
"""
BTR Metadata Extraction Script

This script analyzes content and extracts relevant metadata including:
- Suggested domain
- Topic name
- Tags
- Summary

Usage:
    python extract-metadata.py --content "your content here"
    python extract-metadata.py --file path/to/content.txt
    cat content.txt | python extract-metadata.py --stdin
"""

import argparse
import json
import re
import sys
from collections import Counter
from typing import Dict, List, Optional, Tuple

# Technology patterns for tag extraction
TECHNOLOGY_PATTERNS = {
    # Languages
    r'\btypescript\b|\bts\b': 'typescript',
    r'\bjavascript\b|\bjs\b': 'javascript',
    r'\bpython\b|\bpy\b': 'python',
    r'\brust\b': 'rust',
    r'\bgo\b|\bgolang\b': 'go',

    # Frameworks
    r'\breact\b': 'react',
    r'\bnext\.?js\b|\bnextjs\b': 'nextjs',
    r'\bvue\b': 'vue',
    r'\bangular\b': 'angular',
    r'\bexpress\b': 'express',
    r'\bfastapi\b': 'fastapi',
    r'\bdjango\b': 'django',

    # Databases
    r'\bpostgres(?:ql)?\b': 'postgresql',
    r'\bmysql\b': 'mysql',
    r'\bmongodb?\b': 'mongodb',
    r'\bredis\b': 'redis',
    r'\bsqlite\b': 'sqlite',

    # Cloud/DevOps
    r'\baws\b': 'aws',
    r'\bgcp\b|\bgoogle cloud\b': 'gcp',
    r'\bazure\b': 'azure',
    r'\bdocker\b': 'docker',
    r'\bkubernetes\b|\bk8s\b': 'kubernetes',

    # Concepts
    r'\bjwt\b': 'jwt',
    r'\boauth\b': 'oauth',
    r'\brest\b|\brestful\b': 'rest',
    r'\bgraphql\b': 'graphql',
    r'\bwebsocket\b': 'websocket',
    r'\bmiddleware\b': 'middleware',
    r'\bcaching\b|\bcache\b': 'caching',
    r'\bvalidation\b|\bvalidate\b': 'validation',
    r'\bauth(?:entication)?\b': 'authentication',
    r'\bauthoriz(?:ation|e)\b': 'authorization',
}

# Domain detection patterns
DOMAIN_PATTERNS = {
    'auth': [r'\bauth\b', r'\blogin\b', r'\bjwt\b', r'\btoken\b', r'\bsession\b', r'\boauth\b', r'\bpassword\b'],
    'api': [r'\bendpoint\b', r'\brest\b', r'\bgraphql\b', r'\broute\b', r'\brequest\b', r'\bresponse\b', r'\bmiddleware\b'],
    'database': [r'\bsql\b', r'\bquery\b', r'\bmigration\b', r'\borm\b', r'\bpostgres\b', r'\bmongo\b', r'\bredis\b'],
    'frontend': [r'\breact\b', r'\bcomponent\b', r'\bhook\b', r'\bcss\b', r'\bstyle\b', r'\bdom\b', r'\bui\b'],
    'testing': [r'\btest\b', r'\bspec\b', r'\bmock\b', r'\bjest\b', r'\bpytest\b', r'\bfixture\b', r'\bassert\b'],
    'devops': [r'\bdocker\b', r'\bci\b', r'\bcd\b', r'\bdeploy\b', r'\bkubernetes\b', r'\bhelm\b', r'\bterraform\b'],
    'architecture': [r'\bpattern\b', r'\bdesign\b', r'\bdecision\b', r'\barchitecture\b', r'\bstructure\b'],
    'security': [r'\bsecurity\b', r'\bvulnerability\b', r'\bencrypt\b', r'\bsanitize\b', r'\bxss\b', r'\bcsrf\b'],
    'performance': [r'\bperformance\b', r'\boptimiz\b', r'\bcache\b', r'\blatency\b', r'\bthroughput\b'],
}


def extract_tags(content: str) -> List[str]:
    """Extract technology and concept tags from content."""
    content_lower = content.lower()
    tags = set()

    for pattern, tag in TECHNOLOGY_PATTERNS.items():
        if re.search(pattern, content_lower, re.IGNORECASE):
            tags.add(tag)

    return sorted(list(tags))


def detect_domain(content: str) -> Tuple[str, float]:
    """Detect the most likely domain for the content."""
    content_lower = content.lower()
    domain_scores: Dict[str, int] = Counter()

    for domain, patterns in DOMAIN_PATTERNS.items():
        for pattern in patterns:
            matches = len(re.findall(pattern, content_lower, re.IGNORECASE))
            domain_scores[domain] += matches

    if not domain_scores:
        return ('general', 0.0)

    total_matches = sum(domain_scores.values())
    best_domain = domain_scores.most_common(1)[0]
    confidence = best_domain[1] / total_matches if total_matches > 0 else 0.0

    return (best_domain[0], round(confidence, 2))


def generate_topic_name(content: str) -> str:
    """Generate a kebab-case topic name from content."""
    # Look for function names, class names, or key concepts

    # Try to find function definitions
    func_match = re.search(r'(?:function|def|const|let|var)\s+(\w+)', content)
    if func_match:
        name = func_match.group(1)
        # Convert camelCase to kebab-case
        name = re.sub(r'([a-z])([A-Z])', r'\1-\2', name).lower()
        return name

    # Try to find class definitions
    class_match = re.search(r'class\s+(\w+)', content)
    if class_match:
        name = class_match.group(1)
        name = re.sub(r'([a-z])([A-Z])', r'\1-\2', name).lower()
        return name

    # Extract key nouns from first line or heading
    first_line = content.split('\n')[0].strip()
    first_line = re.sub(r'^#+\s*', '', first_line)  # Remove markdown headings

    # Extract significant words
    words = re.findall(r'\b[a-zA-Z]{3,}\b', first_line)
    if words:
        # Take first 3 significant words
        topic_words = [w.lower() for w in words[:3]]
        return '-'.join(topic_words)

    return 'untitled-context'


def generate_summary(content: str, max_length: int = 150) -> str:
    """Generate a brief summary of the content."""
    # Look for comments, docstrings, or headings

    # Python/JS docstring
    docstring_match = re.search(r'"""([^"]+)"""', content)
    if docstring_match:
        summary = docstring_match.group(1).strip()
        if len(summary) <= max_length:
            return summary
        return summary[:max_length-3] + '...'

    # JSDoc comment
    jsdoc_match = re.search(r'/\*\*\s*\n?\s*\*?\s*([^\n*]+)', content)
    if jsdoc_match:
        summary = jsdoc_match.group(1).strip()
        if len(summary) <= max_length:
            return summary
        return summary[:max_length-3] + '...'

    # Markdown heading
    heading_match = re.search(r'^#+\s*(.+)$', content, re.MULTILINE)
    if heading_match:
        return heading_match.group(1).strip()

    # First meaningful line
    lines = [l.strip() for l in content.split('\n') if l.strip() and not l.strip().startswith(('#', '//', '/*', '*'))]
    if lines:
        summary = lines[0]
        if len(summary) <= max_length:
            return summary
        return summary[:max_length-3] + '...'

    return 'No summary available'


def extract_metadata(content: str) -> Dict:
    """Extract all metadata from content."""
    domain, confidence = detect_domain(content)

    return {
        'domain': {
            'suggested': domain,
            'confidence': confidence,
        },
        'topic': generate_topic_name(content),
        'tags': extract_tags(content),
        'summary': generate_summary(content),
        'content_length': len(content),
        'line_count': len(content.split('\n')),
    }


def main():
    parser = argparse.ArgumentParser(
        description='Extract metadata from content for BTR curation'
    )
    parser.add_argument(
        '--content',
        type=str,
        help='Content string to analyze'
    )
    parser.add_argument(
        '--file',
        type=str,
        help='Path to file containing content'
    )
    parser.add_argument(
        '--stdin',
        action='store_true',
        help='Read content from stdin'
    )
    parser.add_argument(
        '--format',
        choices=['json', 'text'],
        default='json',
        help='Output format (default: json)'
    )

    args = parser.parse_args()

    # Get content from the appropriate source
    content: Optional[str] = None

    if args.content:
        content = args.content
    elif args.file:
        try:
            with open(args.file, 'r') as f:
                content = f.read()
        except FileNotFoundError:
            print(f"Error: File not found: {args.file}", file=sys.stderr)
            sys.exit(1)
    elif args.stdin or not sys.stdin.isatty():
        content = sys.stdin.read()
    else:
        parser.print_help()
        sys.exit(1)

    if not content or not content.strip():
        print("Error: No content provided", file=sys.stderr)
        sys.exit(1)

    # Extract metadata
    metadata = extract_metadata(content)

    # Output results
    if args.format == 'json':
        print(json.dumps(metadata, indent=2))
    else:
        print("BTR Metadata Extraction Results")
        print("=" * 40)
        print(f"Suggested Domain: {metadata['domain']['suggested']} (confidence: {metadata['domain']['confidence']})")
        print(f"Suggested Topic:  {metadata['topic']}")
        print(f"Tags:             {', '.join(metadata['tags']) if metadata['tags'] else 'None detected'}")
        print(f"Summary:          {metadata['summary']}")
        print(f"Content Size:     {metadata['line_count']} lines, {metadata['content_length']} characters")
        print()
        print("Suggested Command:")
        tags_str = ','.join(metadata['tags']) if metadata['tags'] else 'add-tags-here'
        print(f"  btr curate {metadata['domain']['suggested']} {metadata['topic']} --content \"...\" --tags {tags_str}")


if __name__ == '__main__':
    main()
