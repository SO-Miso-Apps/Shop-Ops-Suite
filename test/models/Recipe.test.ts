import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectToMongoDB, disconnectFromMongoDB, mongoose } from '~/mongoose.server';
import Recipe, { RecipeCategory, ConditionOperator, ActionType } from '~/models/Recipe';

describe('Recipe Model', () => {
  beforeAll(async () => {
    await connectToMongoDB();
  });

  afterAll(async () => {
    await disconnectFromMongoDB();
  });

  beforeEach(async () => {
    // Clear recipes collection before each test
    await Recipe.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid recipe', async () => {
      const recipe = await Recipe.create({
        shop: 'test-shop.myshopify.com',
        title: 'Tag VIP Customers',
        description: 'Add VIP tag to customers who spend over $1000',
        category: RecipeCategory.CUSTOMER,
        enabled: false,
        trigger: {
          event: 'customers/update',
          resource: 'customer',
        },
        conditions: [
          {
            field: 'total_spent',
            operator: ConditionOperator.GREATER_THAN,
            value: 1000,
          },
        ],
        actions: [
          {
            type: ActionType.ADD_TAG,
            params: { tag: 'VIP' },
          },
        ],
      });

      expect(recipe).toBeDefined();
      expect(recipe.shop).toBe('test-shop.myshopify.com');
      expect(recipe.title).toBe('Tag VIP Customers');
      expect(recipe.enabled).toBe(false);
      expect(recipe.stats.executionCount).toBe(0);
      expect(recipe.stats.successCount).toBe(0);
      expect(recipe.stats.errorCount).toBe(0);
    });

    it('should require title field', async () => {
      const recipe = new Recipe({
        shop: 'test-shop.myshopify.com',
        description: 'Test description',
        category: RecipeCategory.CUSTOMER,
        trigger: { event: 'customers/update', resource: 'customer' },
      });

      await expect(recipe.save()).rejects.toThrow();
    });

    it('should enforce title length constraints', async () => {
      const recipe = new Recipe({
        shop: 'test-shop.myshopify.com',
        title: 'AB', // Too short (min 3)
        description: 'Test description',
        category: RecipeCategory.CUSTOMER,
        trigger: { event: 'customers/update', resource: 'customer' },
      });

      await expect(recipe.save()).rejects.toThrow();
    });
  });

  describe('Validation Rules', () => {
    it('should throw error when enabling recipe without conditions', async () => {
      const recipe = new Recipe({
        shop: 'test-shop.myshopify.com',
        title: 'Test Recipe',
        description: 'Test description',
        category: RecipeCategory.CUSTOMER,
        enabled: true,
        trigger: { event: 'customers/update', resource: 'customer' },
        conditions: [], // Empty conditions
        actions: [{ type: ActionType.ADD_TAG, params: { tag: 'test' } }],
      });

      await expect(recipe.save()).rejects.toThrow('at least one condition');
    });

    it('should throw error when enabling recipe without actions', async () => {
      const recipe = new Recipe({
        shop: 'test-shop.myshopify.com',
        title: 'Test Recipe',
        description: 'Test description',
        category: RecipeCategory.CUSTOMER,
        enabled: true,
        trigger: { event: 'customers/update', resource: 'customer' },
        conditions: [
          { field: 'test', operator: ConditionOperator.EQUALS, value: 1 },
        ],
        actions: [], // Empty actions
      });

      await expect(recipe.save()).rejects.toThrow('at least one action');
    });

    it('should throw error for invalid webhook topic format', async () => {
      const recipe = new Recipe({
        shop: 'test-shop.myshopify.com',
        title: 'Test Recipe',
        description: 'Test description',
        category: RecipeCategory.CUSTOMER,
        enabled: false,
        trigger: { event: 'invalid-topic-format', resource: 'customer' },
      });

      await expect(recipe.save()).rejects.toThrow('Invalid webhook topic format');
    });

    it('should allow disabled recipes without conditions or actions', async () => {
      const recipe = await Recipe.create({
        shop: 'test-shop.myshopify.com',
        title: 'Test Recipe',
        description: 'Test description',
        category: RecipeCategory.CUSTOMER,
        enabled: false,
        trigger: { event: 'customers/update', resource: 'customer' },
        conditions: [],
        actions: [],
      });

      expect(recipe).toBeDefined();
      expect(recipe.enabled).toBe(false);
    });
  });

  describe('Instance Methods', () => {
    it('should increment execution count on success', async () => {
      const recipe = await Recipe.create({
        shop: 'test-shop.myshopify.com',
        title: 'Test Recipe',
        description: 'Test',
        category: RecipeCategory.CUSTOMER,
        enabled: false,
        trigger: { event: 'customers/update', resource: 'customer' },
        conditions: [
          { field: 'test', operator: ConditionOperator.EQUALS, value: 1 },
        ],
        actions: [{ type: ActionType.ADD_TAG, params: { tag: 'test' } }],
      });

      await recipe.incrementExecutionCount(true);

      expect(recipe.stats.executionCount).toBe(1);
      expect(recipe.stats.successCount).toBe(1);
      expect(recipe.stats.errorCount).toBe(0);
      expect(recipe.stats.lastExecutedAt).toBeDefined();
    });

    it('should increment execution count on failure', async () => {
      const recipe = await Recipe.create({
        shop: 'test-shop.myshopify.com',
        title: 'Test Recipe',
        description: 'Test',
        category: RecipeCategory.CUSTOMER,
        enabled: false,
        trigger: { event: 'customers/update', resource: 'customer' },
        conditions: [
          { field: 'test', operator: ConditionOperator.EQUALS, value: 1 },
        ],
        actions: [{ type: ActionType.ADD_TAG, params: { tag: 'test' } }],
      });

      await recipe.incrementExecutionCount(false);

      expect(recipe.stats.executionCount).toBe(1);
      expect(recipe.stats.successCount).toBe(0);
      expect(recipe.stats.errorCount).toBe(1);
    });

    it('should toggle enabled state', async () => {
      const recipe = await Recipe.create({
        shop: 'test-shop.myshopify.com',
        title: 'Test Recipe',
        description: 'Test',
        category: RecipeCategory.CUSTOMER,
        enabled: false,
        trigger: { event: 'customers/update', resource: 'customer' },
        conditions: [
          { field: 'test', operator: ConditionOperator.EQUALS, value: 1 },
        ],
        actions: [{ type: ActionType.ADD_TAG, params: { tag: 'test' } }],
      });

      expect(recipe.enabled).toBe(false);

      await recipe.toggleEnabled();
      expect(recipe.enabled).toBe(true);

      await recipe.toggleEnabled();
      expect(recipe.enabled).toBe(false);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test recipes
      await Recipe.create([
        {
          shop: 'shop-a.myshopify.com',
          title: 'Recipe A1',
          description: 'Test',
          category: RecipeCategory.CUSTOMER,
          enabled: true,
          trigger: { event: 'customers/update', resource: 'customer' },
          conditions: [
            { field: 'test', operator: ConditionOperator.EQUALS, value: 1 },
          ],
          actions: [{ type: ActionType.ADD_TAG, params: { tag: 'test' } }],
        },
        {
          shop: 'shop-a.myshopify.com',
          title: 'Recipe A2',
          description: 'Test',
          category: RecipeCategory.ORDER,
          enabled: false,
          trigger: { event: 'orders/create', resource: 'order' },
          conditions: [
            { field: 'test', operator: ConditionOperator.EQUALS, value: 1 },
          ],
          actions: [{ type: ActionType.ADD_TAG, params: { tag: 'test' } }],
        },
        {
          shop: 'shop-b.myshopify.com',
          title: 'Recipe B1',
          description: 'Test',
          category: RecipeCategory.CUSTOMER,
          enabled: true,
          trigger: { event: 'customers/update', resource: 'customer' },
          conditions: [
            { field: 'test', operator: ConditionOperator.EQUALS, value: 1 },
          ],
          actions: [{ type: ActionType.ADD_TAG, params: { tag: 'test' } }],
        },
      ]);
    });

    it('should find recipes by shop and category', async () => {
      const recipes = await Recipe.findByShopAndCategory(
        'shop-a.myshopify.com',
        RecipeCategory.CUSTOMER
      );

      expect(recipes).toHaveLength(1);
      expect(recipes[0].title).toBe('Recipe A1');
    });

    it('should find active recipes by event', async () => {
      const recipes = await Recipe.findActiveByEvent(
        'shop-a.myshopify.com',
        'customers/update'
      );

      expect(recipes).toHaveLength(1);
      expect(recipes[0].title).toBe('Recipe A1');
      expect(recipes[0].enabled).toBe(true);
    });

    it('should not return disabled recipes in findActiveByEvent', async () => {
      const recipes = await Recipe.findActiveByEvent(
        'shop-a.myshopify.com',
        'orders/create'
      );

      expect(recipes).toHaveLength(0);
    });

    it('should isolate recipes by shop (multi-tenancy)', async () => {
      const recipesA = await Recipe.find({ shop: 'shop-a.myshopify.com' });
      const recipesB = await Recipe.find({ shop: 'shop-b.myshopify.com' });

      expect(recipesA).toHaveLength(2);
      expect(recipesB).toHaveLength(1);
      expect(recipesA[0].shop).toBe('shop-a.myshopify.com');
      expect(recipesB[0].shop).toBe('shop-b.myshopify.com');
    });
  });

  describe('Indexes', () => {
    it('should have required indexes', async () => {
      const indexes = await Recipe.collection.getIndexes();

      // Check for compound indexes
      const indexNames = Object.keys(indexes);

      expect(indexNames).toContain('shop_1_enabled_1_category_1');
      expect(indexNames).toContain('shop_1_trigger.event_1_enabled_1');
      expect(indexNames).toContain('shop_1_updatedAt_-1');
    });
  });
});
