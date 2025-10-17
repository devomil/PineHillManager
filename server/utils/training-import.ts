/**
 * Training Import Utilities
 * Converts product data into training modules and lessons
 */

import type { BigCommerceProduct } from '../integrations/bigcommerce';
import type { InsertTrainingModule, InsertTrainingLesson } from '@shared/schema';

/**
 * CSV Product Row Interface (flexible - supports multiple formats)
 */
export interface CSVProductRow {
  Item: string; // 'Product' or 'Image'
  ID?: string;
  Name?: string;
  Description?: string;
  'Product URL'?: string;
  'Internal Image URL (Export)'?: string;
  'Image URL'?: string;
  'Image is Thumbnail'?: string;
  [key: string]: any; // Allow additional columns
}

/**
 * Parsed Product for Training
 */
export interface ParsedProduct {
  id: string;
  name: string;
  description: string;
  images: Array<{
    url: string;
    isThumbnail: boolean;
    sortOrder: number;
  }>;
  category?: string;
}

/**
 * Strip HTML tags and clean text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Extract key information from product description for training content
 */
function extractTrainingContent(description: string): {
  overview: string;
  ingredients?: string;
  benefits?: string;
  usage?: string;
} {
  const clean = stripHtml(description);
  
  const content: any = {
    overview: clean,
  };

  // Extract ingredients if present
  const ingredientsMatch = clean.match(/Ingredients?:\s*(.+?)(?:\n|$)/i);
  if (ingredientsMatch) {
    content.ingredients = ingredientsMatch[1].trim();
  }

  // Extract benefits/features
  const benefitsMatch = clean.match(/(?:Benefits?|Features?):\s*(.+?)(?:\n|$)/i);
  if (benefitsMatch) {
    content.benefits = benefitsMatch[1].trim();
  }

  return content;
}

/**
 * Normalize CSV row data - maps various column names to standard fields
 */
function normalizeCSVRow(row: CSVProductRow): {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  isThumbnail: boolean;
} {
  // Generate ID if not provided - use name slug or row index
  const id = row.ID || row.id || slugify(row.Name || 'product');
  
  // Get name
  const name = row.Name || row.name || '';
  
  // Get description
  const description = row.Description || row.description || '';
  
  // Get image URL - check multiple possible column names
  const imageUrl = row['Internal Image URL (Export)'] || row['Image URL'] || row.imageUrl;
  
  // Check if thumbnail
  const isThumbnail = row['Image is Thumbnail'] === 'TRUE' || row.isThumbnail === true;
  
  return { id, name, description, imageUrl, isThumbnail };
}

/**
 * Create a URL-friendly slug from a string
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Parse CSV data into products with images
 */
export function parseCSVProducts(rows: CSVProductRow[]): ParsedProduct[] {
  const productsMap = new Map<string, ParsedProduct>();
  let productCounter = 0;
  
  for (const row of rows) {
    if (row.Item === 'Product') {
      const normalized = normalizeCSVRow(row);
      
      // Create unique ID if duplicate
      let uniqueId = normalized.id || `product-${productCounter++}`;
      if (productsMap.has(uniqueId)) {
        uniqueId = `${uniqueId}-${productCounter++}`;
      }
      
      // Create new product entry
      productsMap.set(uniqueId, {
        id: uniqueId,
        name: normalized.name,
        description: normalized.description || '',
        images: [],
      });
      
      // If the product row has an image URL, add it as first image
      if (normalized.imageUrl) {
        const product = productsMap.get(uniqueId)!;
        product.images.push({
          url: normalized.imageUrl,
          isThumbnail: true, // First image is usually thumbnail
          sortOrder: 0,
        });
      }
    } else if (row.Item === 'Image') {
      // Find the last product (images follow their product)
      const products = Array.from(productsMap.values());
      const lastProduct = products[products.length - 1];
      
      if (lastProduct) {
        const normalized = normalizeCSVRow(row);
        if (normalized.imageUrl) {
          lastProduct.images.push({
            url: normalized.imageUrl,
            isThumbnail: normalized.isThumbnail,
            sortOrder: lastProduct.images.length,
          });
        }
      }
    }
  }

  return Array.from(productsMap.values());
}

/**
 * Convert parsed product to training module
 */
export function productToTrainingModule(
  product: ParsedProduct,
  createdBy: string
): InsertTrainingModule {
  const content = extractTrainingContent(product.description);
  
  // Determine category from product name
  let category = 'Product Training';
  if (product.name.includes('Chew')) category = 'Pet Products';
  else if (product.name.includes('Skin') || product.name.includes('Coat')) category = 'Wellness Products';
  else if (product.name.includes('BioScan')) category = 'Services';

  return {
    title: product.name,
    description: content.overview.substring(0, 500), // First 500 chars for description
    content: product.description, // Full HTML description
    category,
    duration: 10, // Default 10 minutes per product
    difficulty: 'beginner',
    isMandatory: false,
    thumbnailUrl: product.images.find(img => img.isThumbnail)?.url || product.images[0]?.url,
    createdBy,
    isActive: true,
  };
}

/**
 * Create lessons from product content
 */
export function createProductLessons(
  product: ParsedProduct,
  moduleId: number
): InsertTrainingLesson[] {
  const lessons: InsertTrainingLesson[] = [];
  const content = extractTrainingContent(product.description);

  // Lesson 1: Product Overview
  lessons.push({
    moduleId,
    title: `${product.name} - Overview`,
    content: content.overview,
    contentType: 'markdown',
    orderIndex: 1,
    duration: 5,
  });

  // Lesson 2: Ingredients/Details (if available)
  if (content.ingredients) {
    lessons.push({
      moduleId,
      title: `${product.name} - Ingredients & Composition`,
      content: `**Ingredients:**\n\n${content.ingredients}\n\nUnderstanding the ingredients helps you explain the product benefits to customers and ensure it's suitable for their needs.`,
      contentType: 'markdown',
      orderIndex: 2,
      duration: 3,
    });
  }

  // Lesson 3: Benefits & Usage (if available)
  if (content.benefits) {
    lessons.push({
      moduleId,
      title: `${product.name} - Benefits & Usage`,
      content: `**Key Benefits:**\n\n${content.benefits}\n\nBe prepared to discuss these benefits with customers and answer common questions.`,
      contentType: 'markdown',
      orderIndex: 3,
      duration: 2,
    });
  }

  return lessons;
}

/**
 * Convert BigCommerce product to training module
 */
export function bigCommerceProductToModule(
  product: BigCommerceProduct,
  createdBy: string
): { module: InsertTrainingModule; lessons: InsertTrainingLesson[] } {
  const parsedProduct: ParsedProduct = {
    id: product.id.toString(),
    name: product.name,
    description: product.description,
    images: (product.images || []).map((img, idx) => ({
      url: img.url_standard,
      isThumbnail: img.is_thumbnail,
      sortOrder: img.sort_order || idx,
    })),
  };

  const module = productToTrainingModule(parsedProduct, createdBy);
  
  return {
    module,
    lessons: [], // Lessons will be created after module is inserted
  };
}
