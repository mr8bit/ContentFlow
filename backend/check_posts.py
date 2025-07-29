#!/usr/bin/env python3
import sys
sys.path.append('/app')

from database import SessionLocal
from models import Post, PostStatus

def check_posts():
    db = SessionLocal()
    try:
        # Check posts with SCRAPED status
        scraped_posts = db.query(Post).filter(Post.status == PostStatus.SCRAPED).all()
        print(f'Posts with SCRAPED status: {len(scraped_posts)}')
        
        for post in scraped_posts[:5]:
            print(f'Post {post.id}: status={post.status}, llm_confidence={post.llm_classification_confidence}, llm_result={post.llm_classification_result}')
        
        # Check all posts with empty LLM fields
        empty_llm_posts = db.query(Post).filter(
            Post.llm_classification_confidence.is_(None)
        ).all()
        print(f'\nPosts with empty LLM classification: {len(empty_llm_posts)}')
        
        # Check posts by status
        for status in PostStatus:
            count = db.query(Post).filter(Post.status == status).count()
            print(f'Posts with status {status}: {count}')
            
    finally:
        db.close()

if __name__ == '__main__':
    check_posts()