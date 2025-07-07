import os
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import UploadFile, HTTPException
import aiofiles
import logging

logger = logging.getLogger(__name__)

class UploadService:
    def __init__(self, upload_dir: str = "./media/uploads"):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Supported file types
        self.image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
        self.video_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.webm'}
        self.allowed_extensions = self.image_extensions | self.video_extensions
        
        # Max file size (50MB)
        self.max_file_size = 50 * 1024 * 1024
    
    def _get_file_extension(self, filename: str) -> str:
        """Get file extension in lowercase."""
        return Path(filename).suffix.lower()
    
    def _is_allowed_file(self, filename: str) -> bool:
        """Check if file type is allowed."""
        extension = self._get_file_extension(filename)
        return extension in self.allowed_extensions
    
    def _get_media_type(self, filename: str) -> str:
        """Determine media type based on file extension."""
        extension = self._get_file_extension(filename)
        if extension in self.image_extensions:
            return 'photo'
        elif extension in self.video_extensions:
            return 'video'
        else:
            return 'unknown'
    
    def _generate_unique_filename(self, original_filename: str) -> str:
        """Generate unique filename while preserving extension."""
        extension = self._get_file_extension(original_filename)
        unique_id = str(uuid.uuid4())
        return f"{unique_id}{extension}"
    
    async def save_file(self, file: UploadFile) -> dict:
        """Save uploaded file and return file info."""
        try:
            # Validate file
            if not file.filename:
                raise HTTPException(status_code=400, detail="No filename provided")
            
            if not self._is_allowed_file(file.filename):
                raise HTTPException(
                    status_code=400, 
                    detail=f"File type not allowed. Supported: {', '.join(self.allowed_extensions)}"
                )
            
            # Check file size
            file_content = await file.read()
            if len(file_content) > self.max_file_size:
                raise HTTPException(
                    status_code=400, 
                    detail=f"File too large. Max size: {self.max_file_size // (1024*1024)}MB"
                )
            
            # Generate unique filename
            unique_filename = self._generate_unique_filename(file.filename)
            file_path = self.upload_dir / unique_filename
            
            # Save file
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(file_content)
            
            logger.info(f"File saved: {unique_filename} (original: {file.filename})")
            
            return {
                'filename': unique_filename,
                'original_filename': file.filename,
                'file_path': str(file_path),
                'media_type': self._get_media_type(file.filename),
                'size': len(file_content)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error saving file {file.filename}: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to save file")
    
    async def save_multiple_files(self, files: List[UploadFile]) -> List[dict]:
        """Save multiple uploaded files."""
        if len(files) > 10:  # Limit number of files
            raise HTTPException(status_code=400, detail="Too many files. Max 10 files allowed")
        
        saved_files = []
        for file in files:
            file_info = await self.save_file(file)
            saved_files.append(file_info)
        
        return saved_files
    
    def delete_file(self, filename: str) -> bool:
        """Delete uploaded file."""
        try:
            file_path = self.upload_dir / filename
            if file_path.exists() and file_path.is_file():
                file_path.unlink()
                logger.info(f"File deleted: {filename}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting file {filename}: {str(e)}")
            return False
    
    def get_file_path(self, filename: str) -> Optional[str]:
        """Get full path to uploaded file."""
        file_path = self.upload_dir / filename
        if file_path.exists() and file_path.is_file():
            return str(file_path)
        return None

# Global instance
upload_service = UploadService()