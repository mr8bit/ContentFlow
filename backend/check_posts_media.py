#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import Post
import json

def check_posts_media():
    """Check posts with problematic original_media structure."""
    db = SessionLocal()
    try:
        # Get all posts with original_media
        posts = db.query(Post).all()
        
        print(f"Found {len(posts)} posts with original_media")
        
        for post in posts:
            print(f"\nPost ID: {post.id}")
            print(f"Status: {post.status}")
            print(f"Original media type: {type(post.original_media)}")
            print(f"Original media content: {post.original_media}")
            
            # Check if it's a list (problematic)
            if isinstance(post.original_media, list):
                print(f"❌ PROBLEM: Post {post.id} has original_media as list instead of dict")
                
                # Convert to proper structure
                media_list = []
                for file_path in post.original_media:
                    # Determine media type based on file extension
                    file_ext = file_path.lower().split('.')[-1] if '.' in file_path else ''
                    if file_ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
                        media_type = 'photo'
                    elif file_ext in ['mp4', 'avi', 'mov', 'mkv', 'webm']:
                        media_type = 'video'
                    else:
                        media_type = 'photo'  # Default to photo
                    
                    media_list.append({
                        "type": media_type,
                        "file_path": file_path
                    })
                
                new_media_structure = {
                    "type": "media_group",
                    "media_list": media_list
                }
                
                print(f"✅ Converting to: {new_media_structure}")
                
                # Update the post
                post.original_media = new_media_structure
            
            # Check if it's a dict with old structure (has 'path' field in media_list)
            elif isinstance(post.original_media, dict):
                if post.original_media.get('type') == 'media_group':
                    media_list = post.original_media.get('media_list', [])
                    needs_update = False
                    
                    # Check if any media item has 'path' field
                    for media_item in media_list:
                        if 'path' in media_item:
                            needs_update = True
                            break
                    
                    if needs_update:
                        print(f"❌ PROBLEM: Post {post.id} has old media_group structure with 'path' field")
                        
                        # Clean up media_list - remove 'path' field, keep only 'type' and 'file_path'
                        cleaned_media_list = []
                        for media_item in media_list:
                            cleaned_item = {
                                "type": media_item.get('type', 'photo'),
                                "file_path": media_item.get('file_path') or media_item.get('path', '')
                            }
                            cleaned_media_list.append(cleaned_item)
                        
                        new_media_structure = {
                            "type": "media_group",
                            "media_list": cleaned_media_list
                        }
                        
                        print(f"✅ Converting to: {new_media_structure}")
                        
                        # Update the post
                        post.original_media = new_media_structure
                
        # Commit changes
        db.commit()
        print("\n✅ All problematic posts have been fixed!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    check_posts_media()