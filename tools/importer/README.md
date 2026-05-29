# Myridius Import Tools

This directory contains tools for importing content from the Myridius website.

## General Flow
myridius.com does not get consumed by the AEM Importer as it's a SPA and they also probably have WAF/CSP blocking things. We use puppeteer with a local proxy server to pre-render pages that the importer can easily consume.

### Generate Import Proxy URLs

This can be used to generate a list of `localhost` URLs for the import proxy server mentioned below that the importer can then consume.

**Usage:**
```bash
npm run process-crawl-report [input-file] [output-file]
```

**Arguments:**
- `input-file` - Path to crawl_report.xlsx file (default: `crawl_report.xlsx`)
- `output-file` - Path to output file (default: `bulk_import_urls.txt`)

**Examples:**
```bash
# Use default files (crawl_report.xlsx -> bulk_import_urls.txt)
npm run process-crawl-report

# Specify custom input file  
npm run process-crawl-report my-crawl-report.xlsx

# Specify both input and output files
npm run process-crawl-report crawl_report.xlsx output-urls.txt
```

### Proxy Server

Local proxy server that pre-renders Myridius pages and scrolls down to the bottom to make sure all lazy loaded assets are included.

**Usage:**
```bash
npm run import-proxy-server
```

## Workflow

```
1. **Start proxy server:**
   ```bash
   npm run import-proxy-server
   ```
2. **Use bulk import** with a set of `localhost:4001` URLs instead of `myridius.com`
