/**
 * Standalone script to scrape memes from adprofessor.com
 * Usage: tsx src/scripts/scrape-memes.ts [--download]
 */

import { AdProfessorScraper } from '../services/scraper.service.js';

const shouldDownload = process.argv.includes('--download');

async function main() {
  console.log('🚀 Starting meme scraper...\n');
  
  const scraper = new AdProfessorScraper();

  try {
    if (shouldDownload) {
      console.log('📥 Scraping and downloading memes...\n');
      const result = await scraper.scrapeAndDownload();
      
      console.log('\n✅ Scraping complete!');
      console.log(`📊 Found ${result.memes.length} memes`);
      console.log(`💾 Downloaded ${result.downloadedFiles.length} images`);
      console.log(`📄 Metadata saved to: ${result.metadataPath}`);
      console.log(`📁 Training data directory: ${result.trainingDataDir}`);
    } else {
      console.log('🔍 Scraping memes (metadata only)...\n');
      const memes = await scraper.scrapeMemes();
      
      console.log('\n✅ Scraping complete!');
      console.log(`📊 Found ${memes.length} memes`);
      console.log('\n📋 Sample memes:');
      
      memes.slice(0, 5).forEach((meme, index) => {
        console.log(`\n${index + 1}. ${meme.title || 'Untitled'}`);
        console.log(`   Image: ${meme.imageUrl}`);
        console.log(`   Source: ${meme.sourceUrl}`);
      });

      if (memes.length > 5) {
        console.log(`\n... and ${memes.length - 5} more`);
      }

      console.log('\n💡 Tip: Use --download flag to download images');
    }
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();

