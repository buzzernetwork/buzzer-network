/**
 * Ad Professor Meme Scraper Service
 * Scrapes memes from adprofessor.com
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MemeData {
  id: string;
  title?: string;
  imageUrl: string;
  sourceUrl: string;
  description?: string;
  timestamp?: string;
  category?: string;
  filename?: string;
}

export class AdProfessorScraper {
  private baseUrl = 'https://www.adprofessor.com';
  private twitterUrl = 'https://x.com/theadprofessor';
  private baseOutputDir = path.join(__dirname, '../../ai-training-data');
  private trainingDataDir = path.join(this.baseOutputDir, 'ad-professor-memes');
  private rawDataDir = path.join(this.baseOutputDir, 'raw-scrapes');
  private browser: Browser | null = null;

  constructor() {
    // Ensure output directories exist
    fs.ensureDirSync(this.trainingDataDir);
    fs.ensureDirSync(this.rawDataDir);
    
    // Create date-based subdirectory for this scrape session
    const dateFolder = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    this.trainingDataDir = path.join(this.trainingDataDir, dateFolder);
    fs.ensureDirSync(this.trainingDataDir);
  }

  /**
   * Sanitize filename for filesystem
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .toLowerCase()
      .substring(0, 100);
  }

  /**
   * Generate semantic filename for meme
   */
  private generateFilename(meme: MemeData, index: number): string {
    const ext = path.extname(new URL(meme.imageUrl).pathname) || '.jpg';
    
    // Try to create meaningful filename from title
    if (meme.title && meme.title !== `Meme ${index + 1}`) {
      const sanitized = this.sanitizeFilename(meme.title);
      if (sanitized.length > 5) {
        return `${sanitized}_${Date.now()}${ext}`;
      }
    }
    
    // Fallback to hash-based name
    const hash = meme.imageUrl.split('/').pop()?.split('.')[0] || 'meme';
    return `ad_professor_${hash.substring(0, 20)}_${Date.now()}${ext}`;
  }

  /**
   * Fetch and parse memes from adprofessor.com and Twitter/X
   */
  async scrapeMemes(): Promise<MemeData[]> {
    try {
      console.log(`🔍 Scraping memes from multiple sources...`);
      
      const allMemes: MemeData[] = [];
      const seenUrls = new Set<string>();
      
      // Scrape from website
      console.log(`📄 Scraping website: ${this.baseUrl}`);
      try {
        const websiteMemes = await this.scrapeWebsite(seenUrls);
        allMemes.push(...websiteMemes);
        console.log(`  ✅ Found ${websiteMemes.length} memes from website`);
      } catch (error) {
        console.log(`  ⚠️  Could not scrape website:`, error instanceof Error ? error.message : error);
      }

      // Scrape from Twitter/X
      console.log(`🐦 Scraping Twitter/X: ${this.twitterUrl}`);
      try {
        const twitterMemes = await this.scrapeTwitter(seenUrls);
        allMemes.push(...twitterMemes);
        console.log(`  ✅ Found ${twitterMemes.length} memes from Twitter/X`);
      } catch (error) {
        console.log(`  ⚠️  Could not scrape Twitter/X:`, error instanceof Error ? error.message : error);
      }

      // Remove duplicates (final check)
      const uniqueMemes = allMemes.filter((meme, index, self) => 
        index === self.findIndex(m => m.imageUrl === meme.imageUrl)
      );

      console.log(`✅ Found ${uniqueMemes.length} unique memes total`);
      return uniqueMemes;
    } catch (error) {
      console.error('❌ Error scraping memes:', error);
      throw error;
    } finally {
      // Clean up browser if it was opened
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }

  /**
   * Scrape memes from the website
   */
  private async scrapeWebsite(seenUrls: Set<string>): Promise<MemeData[]> {
    const allMemes: MemeData[] = [];
    
    // Try to scrape multiple pages
    const urlsToScrape = [
      this.baseUrl,
      `${this.baseUrl}/blog`,
      `${this.baseUrl}/posts`,
      `${this.baseUrl}/archive`,
      `${this.baseUrl}/memes`,
    ];

    for (const url of urlsToScrape) {
      try {
        console.log(`  📄 Scraping: ${url}`);
        const memes = await this.scrapePage(url, seenUrls);
        allMemes.push(...memes);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
      } catch (error) {
        // Page might not exist, continue
        console.log(`  ⚠️  Could not scrape ${url}`);
      }
    }

    return allMemes;
  }

  /**
   * Scrape memes from Twitter/X using Puppeteer
   */
  private async scrapeTwitter(seenUrls: Set<string>): Promise<MemeData[]> {
    const memes: MemeData[] = [];
    
    try {
      // Launch browser if not already launched
      if (!this.browser) {
        this.browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }

      const page = await this.browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

      console.log(`  🌐 Loading Twitter profile...`);
      await page.goto(this.twitterUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for tweets to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Scroll to load more tweets
      console.log(`  📜 Scrolling to load more tweets...`);
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Extract images from tweets
      const tweetImages = await page.evaluate(() => {
        const images: Array<{src: string, alt: string, tweetText: string, tweetUrl: string}> = [];
        
        // Find all tweet containers
        const tweetSelectors = [
          'article[data-testid="tweet"]',
          'div[data-testid="tweet"]',
          'article[role="article"]'
        ];

        let tweets: Element[] = [];
        for (const selector of tweetSelectors) {
          tweets = Array.from(document.querySelectorAll(selector));
          if (tweets.length > 0) break;
        }

        tweets.forEach((tweet, index) => {
          // Get tweet URL
          const linkElement = tweet.querySelector('a[href*="/status/"]') as HTMLAnchorElement;
          const tweetUrl = linkElement?.href || '';

          // Get tweet text
          const textElement = tweet.querySelector('[data-testid="tweetText"]') || 
                             tweet.querySelector('.tweet-text') ||
                             tweet.querySelector('span[lang]');
          const tweetText = textElement?.textContent || '';

          // Find images in tweet
          const imgElements = tweet.querySelectorAll('img');
          imgElements.forEach(img => {
            const src = img.getAttribute('src') || '';
            const alt = img.getAttribute('alt') || '';
            
            // Filter out profile pictures, icons, etc.
            if (src && 
                !src.includes('profile_images') && 
                !src.includes('emoji') &&
                !src.includes('badge') &&
                !src.includes('icon') &&
                !src.includes('avatar') &&
                (src.includes('pbs.twimg.com/media/') || src.includes('twimg.com/media/') || src.includes('media'))) {
              images.push({
                src,
                alt,
                tweetText: tweetText.substring(0, 200),
                tweetUrl
              });
            }
          });
        });

        return images;
      });

      console.log(`  🖼️  Found ${tweetImages.length} images in tweets`);

      // Process each image
      for (let i = 0; i < tweetImages.length; i++) {
        const img = tweetImages[i];
        
        // Get full resolution URL (Twitter uses thumbnails)
        let imageUrl = img.src;
        
        // Try to get full resolution
        if (imageUrl.includes('?format=')) {
          imageUrl = imageUrl.split('?')[0] + '?format=jpg&name=large';
        } else if (imageUrl.includes('thumb')) {
          imageUrl = imageUrl.replace('thumb', 'large');
        }

        // Skip duplicates
        if (seenUrls.has(imageUrl)) {
          continue;
        }
        seenUrls.add(imageUrl);

        // Use actual tweet URL if available, otherwise construct one
        const tweetUrl = img.tweetUrl || `${this.twitterUrl}/status/${Date.now()}`;

        // Create a better title from tweet text or alt
        let title = img.alt || img.tweetText || `Twitter Meme ${i + 1}`;
        if (title.length > 100) {
          title = title.substring(0, 100) + '...';
        }

        const meme: MemeData = {
          id: `twitter-meme-${Date.now()}-${i}`,
          title: title.trim() || undefined,
          imageUrl,
          sourceUrl: tweetUrl,
          description: img.tweetText || undefined,
          timestamp: new Date().toISOString(),
          category: this.detectCategoryFromText(img.tweetText + ' ' + img.alt)
        };

        meme.filename = this.generateFilename(meme, i);
        memes.push(meme);
      }

      await page.close();
    } catch (error) {
      console.error('Error scraping Twitter:', error);
      // Don't throw, just return what we have
    }

    return memes;
  }

  /**
   * Detect category from text content
   */
  private detectCategoryFromText(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (/ad|advertisement|commercial|marketing|promo/i.test(lowerText)) return 'advertising';
    if (/funny|humor|comedy|joke|lol|haha/i.test(lowerText)) return 'humor';
    if (/social|media|tiktok|instagram|facebook/i.test(lowerText)) return 'social-media';
    if (/creative|design|art|graphic/i.test(lowerText)) return 'creative';
    if (/meme|memes/i.test(lowerText)) return 'memes';
    
    return 'general';
  }

  /**
   * Scrape a single page
   */
  private async scrapePage(url: string, seenUrls: Set<string>): Promise<MemeData[]> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const memes: MemeData[] = [];

      // Try different selectors to find memes/images
      // Common patterns: images, blog posts, gallery items, etc.
      
      // Look for images in various contexts
      $('img').each((index, element) => {
        const $img = $(element);
        const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src');
        
        if (src && this.isMemeImage(src)) {
          // Get full URL
          const imageUrl = src.startsWith('http') ? src : new URL(src, this.baseUrl).href;
          
          // Skip duplicates (check against global set)
          if (seenUrls.has(imageUrl)) {
            return;
          }
          seenUrls.add(imageUrl);
          
          // Get context/title
          const title = $img.attr('alt') || 
                       $img.attr('title') || 
                       $img.closest('article, .post, .entry, .card').find('h1, h2, h3, .title').first().text() ||
                       `Meme ${index + 1}`;
          
          // Get source URL
          const sourceUrl = $img.closest('a').attr('href') || 
                          $img.closest('article, .post, .entry').find('a').first().attr('href') ||
                          this.baseUrl;
          const fullSourceUrl = sourceUrl.startsWith('http') ? sourceUrl : new URL(sourceUrl, this.baseUrl).href;

          // Try to detect category from context
          const category = this.detectCategory($img, title) || this.detectCategoryFromText(title);

          const meme: MemeData = {
            id: `meme-${index}-${Date.now()}`,
            title: title.trim() || undefined,
            imageUrl,
            sourceUrl: fullSourceUrl,
            description: $img.closest('article, .post, .entry, .card').find('p').first().text().trim() || undefined,
            timestamp: new Date().toISOString(),
            category
          };
          
          meme.filename = this.generateFilename(meme, index);
          memes.push(meme);
        }
      });

      // Also check for articles/posts that might contain memes
      $('article, .post, .entry, .card, .blog-post').each((index, element) => {
        const $article = $(element);
        const $img = $article.find('img').first();
        
        if ($img.length) {
          const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src');
          
          if (src && this.isMemeImage(src)) {
            const imageUrl = src.startsWith('http') ? src : new URL(src, this.baseUrl).href;
            
            // Skip duplicates (check against global set)
            if (seenUrls.has(imageUrl)) {
              return;
            }
            seenUrls.add(imageUrl);
            
            const title = $article.find('h1, h2, h3, .title, .entry-title').first().text().trim();
            const link = $article.find('a').first().attr('href') || $article.attr('href');
            const sourceUrl = link && link.startsWith('http') ? link : 
                            link ? new URL(link, this.baseUrl).href : this.baseUrl;

            const category = this.detectCategory($article, title) || this.detectCategoryFromText(title);

            const meme: MemeData = {
              id: `article-meme-${index}-${Date.now()}`,
              title: title || undefined,
              imageUrl,
              sourceUrl,
              description: $article.find('p, .excerpt, .summary').first().text().trim() || undefined,
              timestamp: new Date().toISOString(),
              category
            };
            
            meme.filename = this.generateFilename(meme, index);
            memes.push(meme);
          }
        }
      });

      // Remove duplicates (final check)
      const uniqueMemes = memes.filter((meme, index, self) => 
        index === self.findIndex(m => m.imageUrl === meme.imageUrl)
      );

      return memes;
    } catch (error) {
      // If page doesn't exist or times out, return empty array
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Detect category from image context
   */
  private detectCategory($element: cheerio.Cheerio<any>, title?: string): string {
    const text = ($element.text() + ' ' + (title || '')).toLowerCase();
    
    if (/ad|advertisement|commercial|marketing/i.test(text)) return 'advertising';
    if (/funny|humor|comedy|joke/i.test(text)) return 'humor';
    if (/social|media|tiktok|twitter|instagram/i.test(text)) return 'social-media';
    if (/creative|design|art/i.test(text)) return 'creative';
    if (/meme|memes/i.test(text)) return 'memes';
    
    return 'general';
  }

  /**
   * Check if an image URL looks like a meme
   */
  private isMemeImage(src: string): boolean {
    // Filter out common non-meme images
    const excludePatterns = [
      /logo/i,
      /icon/i,
      /avatar/i,
      /thumbnail.*small/i,
      /\.svg$/i,
      /placeholder/i,
      /spacer/i,
      /pixel/i
    ];

    // Must be a valid image format
    const imagePatterns = /\.(jpg|jpeg|png|gif|webp)$/i;
    
    // Exclude small images (likely icons/logos)
    const isSmall = src.includes('thumb') || src.includes('icon') || src.includes('avatar');
    
    return imagePatterns.test(src) && 
           !excludePatterns.some(pattern => pattern.test(src)) &&
           !isSmall;
  }

  /**
   * Download a meme image to local storage with semantic organization
   */
  async downloadMeme(meme: MemeData): Promise<string> {
    try {
      const imageResponse = await axios.get(meme.imageUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      // Organize by category if available
      const categoryDir = meme.category 
        ? path.join(this.trainingDataDir, meme.category)
        : this.trainingDataDir;
      fs.ensureDirSync(categoryDir);

      const filename = meme.filename || this.generateFilename(meme, 0);
      const filepath = path.join(categoryDir, filename);

      await fs.writeFile(filepath, imageResponse.data);
      
      // Update meme with final filepath
      meme.filename = path.relative(this.baseOutputDir, filepath);
      
      console.log(`💾 Downloaded: ${meme.filename}`);
      
      return filepath;
    } catch (error) {
      console.error(`❌ Failed to download ${meme.imageUrl}:`, error);
      throw error;
    }
  }

  /**
   * Download all memes
   */
  async downloadAllMemes(memes: MemeData[]): Promise<string[]> {
    const downloadedFiles: string[] = [];
    
    for (const meme of memes) {
      try {
        const filepath = await this.downloadMeme(meme);
        downloadedFiles.push(filepath);
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Skipping meme ${meme.id}:`, error);
      }
    }

    return downloadedFiles;
  }

  /**
   * Save meme metadata to JSON file with organization
   */
  async saveMetadata(memes: MemeData[]): Promise<string> {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    
    // Save in raw-scrapes for backup
    const rawMetadataPath = path.join(this.rawDataDir, `scrape-${timestamp}.json`);
    await fs.writeJSON(rawMetadataPath, memes, { spaces: 2 });
    
    // Save in training data directory with cleaner format
    const trainingMetadataPath = path.join(this.trainingDataDir, 'metadata.json');
    
    // Create training-ready metadata format
    const trainingMetadata = {
      source: 'adprofessor.com',
      scrapedAt: new Date().toISOString(),
      totalMemes: memes.length,
      categories: this.getCategoryStats(memes),
      memes: memes.map(m => ({
        id: m.id,
        filename: m.filename,
        title: m.title,
        category: m.category || 'general',
        description: m.description,
        sourceUrl: m.sourceUrl,
        imageUrl: m.imageUrl,
        timestamp: m.timestamp
      }))
    };
    
    await fs.writeJSON(trainingMetadataPath, trainingMetadata, { spaces: 2 });
    
    // Also create a manifest file for easy loading
    const manifestPath = path.join(this.trainingDataDir, 'manifest.txt');
    const manifest = memes.map(m => 
      `${m.filename || m.id}\t${m.category || 'general'}\t${m.title || 'Untitled'}\t${m.description || ''}`
    ).join('\n');
    await fs.writeFile(manifestPath, manifest);
    
    console.log(`📄 Saved metadata to ${trainingMetadataPath}`);
    console.log(`📋 Created manifest: ${manifestPath}`);
    return trainingMetadataPath;
  }

  /**
   * Get category statistics
   */
  private getCategoryStats(memes: MemeData[]): Record<string, number> {
    const stats: Record<string, number> = {};
    memes.forEach(meme => {
      const category = meme.category || 'general';
      stats[category] = (stats[category] || 0) + 1;
    });
    return stats;
  }

  /**
   * Full scraping workflow: scrape, download, save metadata
   */
  async scrapeAndDownload(): Promise<{
    memes: MemeData[];
    downloadedFiles: string[];
    metadataPath: string;
    trainingDataDir: string;
  }> {
    const memes = await this.scrapeMemes();
    const downloadedFiles = await this.downloadAllMemes(memes);
    const metadataPath = await this.saveMetadata(memes);

    console.log(`\n📁 Training data organized in: ${this.trainingDataDir}`);
    console.log(`📊 Categories:`, this.getCategoryStats(memes));

    return {
      memes,
      downloadedFiles,
      metadataPath,
      trainingDataDir: this.trainingDataDir
    };
  }

  /**
   * Get training data directory path
   */
  getTrainingDataDir(): string {
    return this.trainingDataDir;
  }
}

