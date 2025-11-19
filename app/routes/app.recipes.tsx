/**
 * Recipe Library Route - Smart Tagger
 *
 * Browse, search, filter, and activate automation recipes.
 * Core value proposition page - "Recipes, Not Rules" strategy.
 */

import { useState, useEffect, useCallback } from 'react';
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, useFetcher, useSearchParams } from '@remix-run/react';
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  ChoiceList,
  EmptyState,
  Modal
} from '@shopify/polaris';
import { TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { authenticate } from '../shopify.server';
import { getDataService } from '~/services/data';
import { RecipeCard } from '~/components/RecipeCard';
import { filterByText, groupBy } from '~/utils/filters';
import type { MockRecipe, RecipeCategory } from '~/mocks/types';

/**
 * Loader - Fetch and filter recipes
 */
export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);

  const url = new URL(request.url);
  const category = (url.searchParams.get('category') || 'all') as RecipeCategory | 'all';
  const search = url.searchParams.get('search') || '';

  try {
    const dataService = getDataService();
    const settings = await dataService.getSettings();
    let allRecipes = await dataService.getRecipes();

    // Apply category filter
    if (category !== 'all') {
      allRecipes = allRecipes.filter(r => r.category === category);
    }

    // Apply search filter
    if (search) {
      allRecipes = filterByText(allRecipes, search, ['title', 'description']);
    }

    // Group by category
    const grouped = groupBy(allRecipes, 'category');

    return json({
      recipes: grouped,
      filters: { category, search },
      settings: {
        plan: settings.plan,
        recipesUsed: settings.usage.recipesUsed,
        recipesLimit: settings.usage.recipesLimit
      },
      totalCount: allRecipes.length
    });
  } catch (error) {
    console.error('Recipe library loader error:', error);
    throw new Error('Failed to load recipes');
  }
}

/**
 * Action - Toggle recipe on/off
 */
export async function action({ request }: ActionFunctionArgs) {
  await authenticate.admin(request);

  const formData = await request.formData();
  const recipeId = formData.get('recipeId') as string;
  const enabled = formData.get('enabled') === 'true';

  try {
    const dataService = getDataService();

    // Check plan limits when enabling
    if (enabled) {
      const settings = await dataService.getSettings();
      const activeRecipes = await dataService.getRecipes({ enabled: true });

      if (settings.plan === 'free' && activeRecipes.length >= settings.usage.recipesLimit) {
        return json({
          success: false,
          error: 'Free plan limited to 3 active recipes. Upgrade to Pro for unlimited recipes.',
          limitReached: true
        }, { status: 400 });
      }
    }

    // Toggle recipe
    await dataService.toggleRecipe(recipeId, enabled);

    return json({ success: true });
  } catch (error) {
    console.error('Recipe toggle error:', error);
    return json({
      success: false,
      error: 'Failed to toggle recipe. Please try again.'
    }, { status: 500 });
  }
}

/**
 * Recipe Library Component
 */
export default function RecipeLibrary() {
  const { recipes, filters, settings, totalCount } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  // State
  const [searchTerm, setSearchTerm] = useState(filters.search);
  const [selectedCategory, setSelectedCategory] = useState<string[]>([filters.category]);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showPlanLimit, setShowPlanLimit] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    customer: true,
    order: true,
    product: true
  });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const newParams = new URLSearchParams(searchParams);
      if (searchTerm) {
        newParams.set('search', searchTerm);
      } else {
        newParams.delete('search');
      }
      setSearchParams(newParams, { replace: true });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchParams, setSearchParams]);

  // Handle category change
  const handleCategoryChange = useCallback((value: string[]) => {
    setSelectedCategory(value);
    const newParams = new URLSearchParams(searchParams);
    if (value[0] && value[0] !== 'all') {
      newParams.set('category', value[0]);
    } else {
      newParams.delete('category');
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Handle recipe toggle
  const handleToggle = useCallback((recipeId: string, enabled: boolean) => {
    fetcher.submit(
      { recipeId, enabled: String(enabled) },
      { method: 'post' }
    );
  }, [fetcher]);

  // Show toast on action response
  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.success) {
        shopify.toast.show('Recipe updated successfully');
      } else if (fetcher.data.limitReached) {
        setShowPlanLimit(true);
      } else if (fetcher.data.error) {
        shopify.toast.show(fetcher.data.error, { isError: true });
      }
    }
  }, [fetcher.data, shopify]);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory(['all']);
    setSearchParams({}, { replace: true });
  };

  const categoryIcons: Record<string, string> = {
    customer: '👥',
    order: '📦',
    product: '🏷️'
  };

  const categoryLabels: Record<string, string> = {
    customer: 'Customer',
    order: 'Order',
    product: 'Product'
  };

  const hasRecipes = totalCount > 0;

  return (
    <Page>
      <TitleBar title="Smart Tagger">
        <button onClick={() => setShowComingSoon(true)}>
          + Add Custom
        </button>
      </TitleBar>

      <BlockStack gap="500">
        {/* Filters Section */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                {/* Category Filter */}
                <ChoiceList
                  title="Category"
                  choices={[
                    { label: 'All Recipes', value: 'all' },
                    { label: '👥 Customer Recipes', value: 'customer' },
                    { label: '📦 Order Recipes', value: 'order' },
                    { label: '🏷️ Product Recipes', value: 'product' }
                  ]}
                  selected={selectedCategory}
                  onChange={handleCategoryChange}
                />

                {/* Search Input */}
                <TextField
                  label="Search"
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search recipes..."
                  autoComplete="off"
                  clearButton
                  onClearButtonClick={() => setSearchTerm('')}
                />

                {/* Active Recipe Count */}
                <InlineStack align="space-between">
                  <Text variant="bodySm" as="p" tone="subdued">
                    {settings.recipesUsed} of {settings.recipesLimit} recipes active
                    {settings.plan === 'free' && ' (Free Plan)'}
                  </Text>
                  {(searchTerm || selectedCategory[0] !== 'all') && (
                    <Button plain onClick={clearFilters}>
                      Clear filters
                    </Button>
                  )}
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Recipes Grid */}
        {!hasRecipes ? (
          <Layout>
            <Layout.Section>
              <EmptyState
                heading="No recipes found"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  {searchTerm
                    ? 'Try a different search term'
                    : filters.category !== 'all'
                    ? 'No recipes in this category'
                    : 'No recipes available'}
                </p>
                <Button onClick={clearFilters}>Clear filters</Button>
              </EmptyState>
            </Layout.Section>
          </Layout>
        ) : (
          <Layout>
            <Layout.Section>
              <BlockStack gap="500">
                {Object.entries(recipes).map(([category, categoryRecipes]) => {
                  const recipeArray = categoryRecipes as MockRecipe[];

                  if (recipeArray.length === 0) return null;

                  const isExpanded = expandedCategories[category];
                  const displayRecipes = isExpanded ? recipeArray : recipeArray.slice(0, 6);

                  return (
                    <Card key={category}>
                      <BlockStack gap="400">
                        {/* Category Header */}
                        <InlineStack align="space-between" blockAlign="center">
                          <Text variant="headingMd" as="h2">
                            {categoryIcons[category]} {categoryLabels[category]} Recipes ({recipeArray.length})
                          </Text>
                          {recipeArray.length > 6 && (
                            <Button
                              plain
                              onClick={() => toggleCategory(category)}
                            >
                              {isExpanded ? 'Show Less ▲' : `Show All (${recipeArray.length}) ▼`}
                            </Button>
                          )}
                        </InlineStack>

                        {/* Recipe Grid */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                          gap: '16px'
                        }}>
                          {displayRecipes.map((recipe) => (
                            <RecipeCard
                              key={recipe.recipeId}
                              recipe={recipe}
                              onToggle={(enabled) => handleToggle(recipe.recipeId, enabled)}
                              loading={fetcher.state === 'submitting'}
                            />
                          ))}
                        </div>
                      </BlockStack>
                    </Card>
                  );
                })}
              </BlockStack>
            </Layout.Section>
          </Layout>
        )}
      </BlockStack>

      {/* Coming Soon Modal */}
      <Modal
        open={showComingSoon}
        onClose={() => setShowComingSoon(false)}
        title="Coming Soon"
        primaryAction={{
          content: 'Close',
          onAction: () => setShowComingSoon(false)
        }}
      >
        <Modal.Section>
          <Text variant="bodyMd" as="p">
            Custom recipe builder will be available in Phase 2 of development.
          </Text>
        </Modal.Section>
      </Modal>

      {/* Plan Limit Modal */}
      <Modal
        open={showPlanLimit}
        onClose={() => setShowPlanLimit(false)}
        title="Recipe Limit Reached"
        primaryAction={{
          content: 'Upgrade to Pro →',
          onAction: () => {
            setShowPlanLimit(false);
            // Navigate to settings - will implement in Epic 5
            shopify.toast.show('Upgrade feature coming in Phase 2');
          }
        }}
        secondaryActions={[{
          content: 'Cancel',
          onAction: () => setShowPlanLimit(false)
        }]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text variant="bodyMd" as="p">
              ⚠️ Free plan is limited to {settings.recipesLimit} active recipes.
            </Text>
            <Text variant="bodyMd" as="p">
              Upgrade to Pro for unlimited recipes and advanced automation features.
            </Text>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
