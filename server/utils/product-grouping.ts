import type { StagedProduct } from '@shared/schema';

interface ProductGroup {
  name: string;
  description: string;
  groupingCriteria: 'brand' | 'category' | 'manual';
  products: StagedProduct[];
}

export function suggestProductGroups(products: StagedProduct[]): ProductGroup[] {
  const groups: ProductGroup[] = [];

  // Group by brand first (priority grouping)
  const brandMap = new Map<string, StagedProduct[]>();
  const unbrandedProducts: StagedProduct[] = [];

  for (const product of products) {
    if (product.brand) {
      const existing = brandMap.get(product.brand) || [];
      existing.push(product);
      brandMap.set(product.brand, existing);
    } else {
      unbrandedProducts.push(product);
    }
  }

  // Create brand-based groups (only if 3+ products share the brand)
  for (const [brand, brandProducts] of brandMap.entries()) {
    if (brandProducts.length >= 3) {
      groups.push({
        name: `${brand} Product Line`,
        description: `Training module covering all ${brand} products`,
        groupingCriteria: 'brand',
        products: brandProducts,
      });
    } else {
      // If less than 3 products, add to unbranded for category grouping
      unbrandedProducts.push(...brandProducts);
    }
  }

  // Group remaining products by category
  const categoryMap = new Map<string, StagedProduct[]>();
  const uncategorizedProducts: StagedProduct[] = [];

  for (const product of unbrandedProducts) {
    if (product.category) {
      const existing = categoryMap.get(product.category) || [];
      existing.push(product);
      categoryMap.set(product.category, existing);
    } else {
      uncategorizedProducts.push(product);
    }
  }

  // Create category-based groups
  for (const [category, categoryProducts] of categoryMap.entries()) {
    if (categoryProducts.length >= 2) {
      groups.push({
        name: `${category}`,
        description: `Training module for ${category.toLowerCase()} products`,
        groupingCriteria: 'category',
        products: categoryProducts,
      });
    } else {
      uncategorizedProducts.push(...categoryProducts);
    }
  }

  // Create a "Miscellaneous Products" group for remaining items
  if (uncategorizedProducts.length > 0) {
    groups.push({
      name: 'Miscellaneous Products',
      description: 'Various products that don\'t fit into specific categories',
      groupingCriteria: 'manual',
      products: uncategorizedProducts,
    });
  }

  return groups;
}

export function generateCollectionName(brand?: string, category?: string): string {
  if (brand) {
    return `${brand} Product Line`;
  }
  if (category) {
    return category;
  }
  return 'Product Collection';
}

export function generateCollectionDescription(products: StagedProduct[]): string {
  const count = products.length;
  const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
  
  if (brands.length === 1 && brands[0]) {
    return `Comprehensive training covering ${count} ${brands[0]} products`;
  }
  
  if (count === 1 && products[0]) {
    return `Training module for ${products[0].name}`;
  }
  
  return `Training module covering ${count} related products`;
}
