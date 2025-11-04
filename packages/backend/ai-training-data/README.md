# AI Training Data - Ad Professor Memes

This directory contains scraped memes from adprofessor.com, organized for AI model training.

## Directory Structure

```
ai-training-data/
├── ad-professor-memes/          # Main training data
│   └── YYYY-MM-DD/              # Date-based organization
│       ├── category/            # Category subfolders (advertising, humor, memes, etc.)
│       │   └── *.webp|jpg|png   # Meme images
│       ├── metadata.json        # Complete metadata for all memes
│       └── manifest.txt         # Tab-separated manifest file
├── raw-scrapes/                 # Raw scraping data (backup)
│   └── scrape-*.json            # Timestamped raw scrape data
└── README.md                    # This file
```

## File Formats

### metadata.json
Complete JSON metadata with:
- Source information
- Meme details (title, description, category, URLs)
- Category statistics
- Timestamps

### manifest.txt
Tab-separated format for easy loading:
```
filename    category    title    description
```

## Categories

Memes are automatically categorized into:
- `advertising` - Advertisements and marketing content
- `humor` - Funny content and jokes
- `social-media` - Content from social platforms
- `creative` - Creative/artistic content
- `memes` - General memes
- `general` - Uncategorized content

## Usage for AI Training

### Loading Images with Metadata

```python
import json
import os
from pathlib import Path

# Load metadata
with open('metadata.json', 'r') as f:
    data = json.load(f)

# Access memes
for meme in data['memes']:
    image_path = meme['filename']
    category = meme['category']
    title = meme['title']
    # Load image and train...
```

### Using Manifest File

```python
# Simple tab-separated loading
with open('manifest.txt', 'r') as f:
    for line in f:
        filename, category, title, description = line.strip().split('\t')
        # Process...
```

## Data Collection

- **Source**: adprofessor.com
- **Scraping Method**: Web scraping with duplicate detection
- **Organization**: Date-based with category subfolders
- **Naming**: Semantic filenames based on content titles

## Statistics

Check `metadata.json` for:
- Total meme count
- Category distribution
- Scrape timestamp

## Next Steps for Training

1. **Data Validation**: Review images for quality
2. **Labeling**: Verify/adjust categories if needed
3. **Augmentation**: Apply transformations if required
4. **Split**: Create train/val/test splits
5. **Training**: Use with your preferred ML framework

## Notes

- Images are organized by category for easy filtering
- Each scrape session gets its own date folder
- Raw scrapes are preserved for backup
- Metadata includes original URLs for reference

