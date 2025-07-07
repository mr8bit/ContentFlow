FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for building Python packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install uv for dependency management
RUN pip install uv

# Copy dependency files from root
COPY ./pyproject.toml ./uv.lock ./

# Install dependencies
RUN uv sync --frozen

# Copy application code
COPY ./backend/ .

# Expose port
EXPOSE 8000

# Default command
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]