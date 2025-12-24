import re
from datetime import datetime, timezone

# Note: httpx is available in Motia's Python environment
import httpx

config = {
    "name": "FetchHackerNews",
    "type": "event",
    "description": "Fetches jobs from HackerNews Who's Hiring thread",
    "subscribes": ["fetch-jobs-trigger"],
    "emits": ["normalize-job"],
    "input": {
        "type": "object",
        "properties": {
            "source": {"type": "string"},
            "manual": {"type": "boolean"}
        },
        "required": ["source"]
    },
    "flows": ["job-aggregation"]
}

# Known "Who's Hiring" thread IDs (these are from recent months)
# HN posts a new thread on the 1st of each month
WHO_IS_HIRING_THREADS = [
    42575537,  # January 2025
    42057092,  # December 2024
    41709301,  # November 2024
]


def parse_hn_comment(comment):
    """Extract job info from HN comment text."""
    text = comment.get("text", "")
    if not text:
        return None

    # Remove HTML tags for parsing
    clean_text = re.sub(r"<[^>]+>", " ", text).strip()

    # First line is usually "Company | Role | Location | ..."
    lines = text.split("<p>")
    if not lines:
        return None

    first_line = re.sub(r"<[^>]+>", "", lines[0]).strip()
    parts = [p.strip() for p in first_line.split("|")]

    if len(parts) >= 2:
        company = parts[0] if parts[0] else "Unknown Company"
        title = parts[1] if len(parts) > 1 and parts[1] else "Software Engineer"
        location = parts[2] if len(parts) > 2 and parts[2] else "Remote"

        return {
            "id": str(comment.get("id")),
            "company": company[:100],  # Truncate if too long
            "title": title[:200],
            "location": location[:100],
            "description": clean_text[:500],
            "url": f"https://news.ycombinator.com/item?id={comment.get('id')}",
            "posted_at": comment.get("time", int(datetime.now(timezone.utc).timestamp()))
        }

    return None


async def handler(input_data, context):
    source = input_data.get("source", "")

    if source != "hackernews" and source != "all":
        return  # Skip if not for this source

    context.logger.info("Fetching from HackerNews Who's Hiring")

    jobs_found = 0

    async with httpx.AsyncClient(timeout=30.0) as client:
        for thread_id in WHO_IS_HIRING_THREADS[:1]:  # Just process the latest thread
            try:
                # Fetch the thread
                resp = await client.get(
                    f"https://hacker-news.firebaseio.com/v0/item/{thread_id}.json"
                )
                resp.raise_for_status()
                thread = resp.json()

                if not thread or "kids" not in thread:
                    context.logger.warn("Thread has no comments", {"thread_id": thread_id})
                    continue

                context.logger.info("Processing HackerNews thread", {
                    "thread_id": thread_id,
                    "comment_count": len(thread.get("kids", []))
                })

                # Fetch top 30 comments (job postings)
                comment_ids = thread["kids"][:30]

                for comment_id in comment_ids:
                    try:
                        comment_resp = await client.get(
                            f"https://hacker-news.firebaseio.com/v0/item/{comment_id}.json"
                        )
                        comment_resp.raise_for_status()
                        comment = comment_resp.json()

                        if comment and comment.get("text") and not comment.get("deleted"):
                            # Parse job from comment
                            job_data = parse_hn_comment(comment)

                            if job_data:
                                await context.emit({
                                    "topic": "normalize-job",
                                    "data": {
                                        "source": "hackernews",
                                        "rawJob": job_data
                                    }
                                })
                                jobs_found += 1

                    except Exception as e:
                        context.logger.warn(f"Failed to fetch comment {comment_id}", {
                            "error": str(e)
                        })

                context.logger.info("Processed HackerNews thread", {
                    "thread_id": thread_id,
                    "jobs_found": jobs_found
                })

            except Exception as e:
                context.logger.error("Failed to fetch HN thread", {
                    "thread_id": thread_id,
                    "error": str(e)
                })

    # Update source metadata
    await context.state.set("sources", "hackernews", {
        "lastFetch": datetime.now(timezone.utc).isoformat(),
        "jobCount": jobs_found,
        "status": "success" if jobs_found > 0 else "error",
        "error": None if jobs_found > 0 else "No jobs found"
    })

    context.logger.info("HackerNews fetch completed", {"total_jobs": jobs_found})
