#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { execa } from 'execa'; // eslint-disable-line import/no-extraneous-dependencies, import/no-unresolved
import { logger, colors } from './utils.js';

const SOURCE_DOMAIN = 'https://www.myridius.com';
const TARGET_DOMAIN = 'http://localhost:4001';

async function extractUrlsFromExcel(inputFile) {
  logger.info(`Extracting URLs from ${colors.highlight(inputFile)}...`);

  const tempDir = 'temp_excel_extract';

  try {
    await execa('mkdir', ['-p', tempDir]);
    await execa('unzip', ['-q', inputFile, '-d', tempDir]);

    const sharedStringsPath = path.join(tempDir, 'xl', 'sharedStrings.xml');
    if (!existsSync(sharedStringsPath)) {
      throw new Error('Could not find sharedStrings.xml in Excel file');
    }

    const xmlContent = await readFile(sharedStringsPath, 'utf8');
    const urlRegex = new RegExp(`${SOURCE_DOMAIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*`, 'g');
    const urls = xmlContent.match(urlRegex) || [];

    if (urls.length === 0) {
      throw new Error(`No URLs found with domain ${SOURCE_DOMAIN}`);
    }

    logger.success(`Found ${colors.highlight(urls.length)} URLs in Excel file`);
    return urls;
  } catch (error) {
    throw new Error(`Failed to extract URLs from Excel file: ${error.message}`);
  } finally {
    try {
      await execa('rm', ['-rf', tempDir]);
    } catch (e) {
      // Nada
    }
  }
}

function processUrls(urls) {
  logger.info('Processing and cleaning URLs...');

  const processedUrls = [...new Set(
    urls.map((url) => url.replace(SOURCE_DOMAIN, TARGET_DOMAIN).replace(/\/$/, '')),
  )];

  processedUrls.sort();

  const duplicatesRemoved = urls.length - processedUrls.length;
  if (duplicatesRemoved > 0) {
    logger.info(`Removed ${colors.highlight(duplicatesRemoved)} duplicate URLs`);
  }

  logger.success(`Processed ${colors.highlight(processedUrls.length)} unique URLs`);
  return processedUrls;
}

async function writeUrlsToFile(urls, outputFile) {
  logger.info(`Writing URLs to ${colors.highlight(outputFile)}...`);

  const content = `${urls.join('\n')}\n`;
  await writeFile(outputFile, content, 'utf8');

  logger.success(`Successfully wrote ${colors.highlight(urls.length)} URLs to ${outputFile}`);
}

async function main() {
  const args = process.argv.slice(2);

  const inputFile = args[0] || 'crawl_report.xlsx';
  const outputFile = args[1] || 'bulk_import_urls.txt';

  try {
    if (!existsSync(inputFile)) {
      throw new Error(`Input file does not exist: ${inputFile}`);
    }

    const startMessage = [
      `Input: ${colors.highlight(inputFile)}`,
      `Output: ${colors.highlight(outputFile)}`,
      `Source: ${colors.cyan(SOURCE_DOMAIN)}`,
      `Target: ${colors.cyan(TARGET_DOMAIN)}`,
    ].join('\n');

    logger.box('🚀 Crawl Report Processor', startMessage, { borderColor: 'green' });

    const urls = await extractUrlsFromExcel(inputFile);

    const processedUrls = processUrls(urls);

    await writeUrlsToFile(processedUrls, outputFile);

    const summaryMessage = [
      `Input file: ${inputFile}`,
      `URLs extracted: ${colors.highlight(urls.length)}`,
      `URLs processed: ${colors.highlight(processedUrls.length)} (unique)`,
      `Output file: ${outputFile}`,
      '',
      'Ready for bulk import!',
    ].join('\n');

    logger.box('📊 Processing Complete', summaryMessage, { borderColor: 'green' });
  } catch (error) {
    const errorMessage = `Error: ${error.message}`;

    logger.box('Processing Failed', errorMessage, { borderColor: 'red' });
    process.exit(1);
  }
}

main().catch((error) => {
  const errorMessage = `Unexpected error: ${error.message}`;

  logger.box('Unexpected Error', errorMessage, { borderColor: 'red' });
  process.exit(1);
});
