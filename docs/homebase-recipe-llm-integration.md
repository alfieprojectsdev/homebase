# Recipe Generation from Grocery Inventory - LLM Integration Strategy

## The Feature: "What Can I Cook?"

**User Story:**
> "I'm home with the kids, brain is tired, don't know what to cook. Open Homebase → tap 'What Can I Cook?' → sees 5 recipes using ingredients I actually have → picks one → follows simple steps → dinner done."

---

## Strategic Question: Which Phase?

### Option 1: Phase 5 (Groceries) - **RECOMMENDED** ✅

**Why it makes sense:**
- Groceries domain is where inventory lives
- Natural feature extension ("I have X, Y, Z → what can I make?")
- Solves the "decision paralysis" problem common with ADHD
- Can start simple (cloud LLM) then migrate to local (Phase 12+)

**Timeline:**
- Phase 5 ships: ~Month 3-4 (after notifications + offline PWA)
- LLM recipe feature: Add as Phase 5B (2 weeks after Phase 5A)

### Option 2: Phase 12 (JARVIS/RAG) - Too Late ❌

**Why this is suboptimal:**
- Delays a high-value feature by 6+ months
- Grocery management without recipe suggestions feels incomplete
- Miss opportunity for early user delight

### Option 3: Phase 2.5 (Early Prototype) - **BONUS TRACK** 🎯

**Why this could work:**
- Quick win to test LLM integration architecture
- Proves the concept before full groceries system
- Can use hardcoded sample inventory for MVP
- Low risk: separate from critical notification system

---

## Recommended Approach: Phase 5B

### Phase 5A: Groceries Foundation (Week 1-2)
```
✅ Grocery inventory tracking
✅ Stock levels (in stock / low / out)
✅ Categories (produce, meat, dairy, pantry, etc.)
✅ Expiration date tracking
✅ Shopping list generation
```

### Phase 5B: Recipe Generation (Week 3)
```
🤖 "What Can I Cook?" button
🤖 LLM analyzes available ingredients
🤖 Generates 3-5 recipe suggestions
🤖 Filters by dietary preferences (optional)
🤖 Shows which ingredients you have vs need
```

---

## Technical Architecture

### Database Schema (Add to Phase 5)

```typescript
// src/lib/db/schema.ts

export const groceryItems = pgTable('grocery_items', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').notNull().references(() => organizations.id),
  residenceId: integer('residence_id').references(() => residences.id),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { 
    length: 50, 
    enum: ['produce', 'meat', 'dairy', 'pantry', 'frozen', 'condiments', 'beverages', 'snacks'] 
  }).notNull(),
  quantity: integer('quantity').default(0),
  unit: varchar('unit', { length: 20 }), // 'kg', 'lbs', 'pcs', 'bottles', etc.
  stockStatus: varchar('stock_status', { 
    length: 20, 
    enum: ['in_stock', 'low', 'out'] 
  }).default('in_stock'),
  expirationDate: timestamp('expiration_date'),
  location: varchar('location', { length: 100 }), // 'fridge', 'freezer', 'pantry'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const dietaryPreferences = pgTable('dietary_preferences', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').notNull().references(() => organizations.id),
  userId: integer('user_id').references(() => users.id),
  preference: varchar('preference', { 
    length: 50,
    enum: ['vegetarian', 'vegan', 'halal', 'kosher', 'gluten_free', 'dairy_free', 'nut_free']
  }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const generatedRecipes = pgTable('generated_recipes', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').notNull().references(() => organizations.id),
  recipeName: varchar('recipe_name', { length: 255 }).notNull(),
  ingredients: text('ingredients').notNull(), // JSON array
  instructions: text('instructions').notNull(),
  availableIngredients: text('available_ingredients'), // JSON: what user had
  missingIngredients: text('missing_ingredients'), // JSON: what user needs
  servings: integer('servings').default(4),
  prepTime: integer('prep_time_minutes'),
  cookTime: integer('cook_time_minutes'),
  difficulty: varchar('difficulty', { length: 20, enum: ['easy', 'medium', 'hard'] }),
  wasCooked: boolean('was_cooked').default(false), // Track if user actually made it
  rating: integer('rating'), // 1-5 stars
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## LLM Integration Strategy

### Approach 1: Cloud LLM (Phase 5B - Month 3-4) ⚡

**Pros:**
- Fast to implement (1 day)
- Always up-to-date models
- No local compute requirements
- Works on mobile

**Cons:**
- Recurring API costs (~$5-10/month for moderate use)
- Requires internet connection
- Privacy concern (ingredients sent to OpenAI/Anthropic)

**Implementation:**
```typescript
// src/lib/llm/recipe-generator.ts

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateRecipes(
  availableIngredients: { name: string; quantity: number; unit: string }[],
  dietaryRestrictions: string[] = [],
  servings: number = 4
) {
  const ingredientList = availableIngredients
    .map(i => `${i.quantity} ${i.unit} ${i.name}`)
    .join('\n');

  const prompt = `You are a helpful cooking assistant for a Filipino household.

Available ingredients:
${ingredientList}

Dietary restrictions: ${dietaryRestrictions.join(', ') || 'None'}
Servings needed: ${servings}

Generate 3-5 simple, practical recipes using ONLY the ingredients listed above. 
For each recipe, provide:
1. Recipe name
2. Ingredients needed (with quantities)
3. Step-by-step instructions (max 8 steps, keep it simple)
4. Prep time and cook time
5. Difficulty level (easy/medium/hard)

Prioritize:
- Filipino cuisine when possible
- Recipes that use ingredients close to expiration first
- Simple recipes (under 30 minutes when possible)
- Family-friendly meals

Return the response as a JSON array of recipe objects.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      { role: 'user', content: prompt }
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  // Parse JSON response
  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in response');
  }

  return JSON.parse(jsonMatch[0]);
}
```

**API Route:**
```typescript
// src/app/api/recipes/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { groceryItems, dietaryPreferences } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateRecipes } from '@/lib/llm/recipe-generator';

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { residenceId, servings = 4 } = body;

    // Get available ingredients
    const ingredients = await db
      .select()
      .from(groceryItems)
      .where(
        and(
          eq(groceryItems.orgId, authUser.orgId),
          residenceId ? eq(groceryItems.residenceId, residenceId) : undefined,
          eq(groceryItems.stockStatus, 'in_stock')
        )
      );

    if (ingredients.length === 0) {
      return NextResponse.json(
        { error: 'No ingredients in stock. Add items to your grocery inventory first.' },
        { status: 400 }
      );
    }

    // Get dietary preferences
    const prefs = await db
      .select()
      .from(dietaryPreferences)
      .where(eq(dietaryPreferences.orgId, authUser.orgId));

    const restrictions = prefs.map(p => p.preference);

    // Generate recipes
    const recipes = await generateRecipes(
      ingredients.map(i => ({
        name: i.name,
        quantity: i.quantity || 0,
        unit: i.unit || 'units',
      })),
      restrictions,
      servings
    );

    // Store in database for history
    const savedRecipes = await Promise.all(
      recipes.map(async (recipe: any) => {
        const [saved] = await db
          .insert(generatedRecipes)
          .values({
            orgId: authUser.orgId,
            recipeName: recipe.name,
            ingredients: JSON.stringify(recipe.ingredients),
            instructions: JSON.stringify(recipe.instructions),
            availableIngredients: JSON.stringify(ingredients),
            servings: recipe.servings || servings,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            difficulty: recipe.difficulty,
          })
          .returning();
        return saved;
      })
    );

    return NextResponse.json({ 
      recipes: savedRecipes,
      message: `Generated ${recipes.length} recipes from ${ingredients.length} ingredients`
    });
  } catch (error) {
    console.error('Recipe generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recipes' },
      { status: 500 }
    );
  }
}
```

---

### Approach 2: Local LLM (Phase 12 - Month 9+) 🏠

**Migrate to self-hosted when:**
- Ollama is running on home server
- Have Llama 3.1 8B or better
- Want zero API costs
- Privacy is paramount

**Implementation (same interface, different backend):**
```typescript
// src/lib/llm/recipe-generator.ts (Phase 12 version)

export async function generateRecipes(
  availableIngredients: { name: string; quantity: number; unit: string }[],
  dietaryRestrictions: string[] = [],
  servings: number = 4
) {
  const ingredientList = availableIngredients
    .map(i => `${i.quantity} ${i.unit} ${i.name}`)
    .join('\n');

  const prompt = `[same as cloud version]`;

  // Call local Ollama instance
  const response = await fetch(process.env.OLLAMA_URL + '/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.1:8b',
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
      }
    }),
  });

  const data = await response.json();
  const jsonMatch = data.response.match(/\[[\s\S]*\]/);
  return JSON.parse(jsonMatch[0]);
}
```

---

## UI/UX Design

### Page: Recipe Generator
**File:** `src/app/(dashboard)/groceries/recipes/page.tsx`

```tsx
'use client';

import { useState } from 'react';

export default function RecipesPage() {
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/recipes/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servings: 4 }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to generate recipes');
        return;
      }

      setRecipes(data.recipes);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">What Can I Cook?</h1>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-indigo-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-indigo-700 disabled:opacity-50 mb-8"
          style={{ minHeight: '48px' }}
        >
          {loading ? '🤔 Thinking...' : '🍳 Generate Recipes'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {recipes.map((recipe: any) => (
            <div key={recipe.id} className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-2">{recipe.recipeName}</h2>
              
              <div className="flex gap-4 text-sm text-gray-600 mb-4">
                <span>⏱️ {recipe.prepTime + recipe.cookTime} min</span>
                <span>👥 {recipe.servings} servings</span>
                <span>
                  {recipe.difficulty === 'easy' && '✅ Easy'}
                  {recipe.difficulty === 'medium' && '⚡ Medium'}
                  {recipe.difficulty === 'hard' && '🔥 Hard'}
                </span>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold mb-2">Ingredients:</h3>
                <ul className="list-disc list-inside space-y-1">
                  {JSON.parse(recipe.ingredients).map((ing: string, i: number) => (
                    <li key={i} className="text-gray-700">{ing}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Instructions:</h3>
                <ol className="list-decimal list-inside space-y-2">
                  {JSON.parse(recipe.instructions).map((step: string, i: number) => (
                    <li key={i} className="text-gray-700">{step}</li>
                  ))}
                </ol>
              </div>

              <div className="mt-4 flex gap-3">
                <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                  ✅ I Cooked This
                </button>
                <button className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300">
                  📋 Add Missing Items to Shopping List
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Cost Analysis

### Cloud LLM (Phase 5B)
**Model:** Claude Sonnet 4  
**Input:** ~1,000 tokens (ingredient list + prompt)  
**Output:** ~2,000 tokens (3-5 recipes)  
**Cost per generation:** ~$0.02

**Monthly usage estimate:**
- 2 recipe generations/day × 30 days = 60 generations
- 60 × $0.02 = **$1.20/month**

**Verdict:** Extremely affordable for cloud LLM approach. ✅

### Local LLM (Phase 12)
**One-time cost:** $0 (uses existing home server)  
**Monthly cost:** $0  
**Latency:** ~5-10 seconds on N100 Mini PC  
**Privacy:** 100% (data never leaves home)

---

## ADHD-Optimized Features

### 1. Decision Fatigue Reducer
```
Instead of: "What should I cook?"
App shows: "Here are 3 recipes. Pick one."
```

### 2. Paralysis Prevention
```
Default to 3 recipes max (not overwhelming)
Hide "advanced options" by default
One-tap "I'll cook this" button
```

### 3. Executive Function Support
```
Shopping list auto-generated for missing ingredients
Step-by-step mode (show 1 step at a time, large text)
Timer integration (coming in Phase 10)
```

### 4. Gamification (Optional Phase 5C)
```
Track "recipes cooked" streak
Unlock achievement: "Cooked 7 days in a row"
Visual progress (brain loves this)
```

---

## Implementation Timeline

### Phase 5A: Groceries Foundation
**Week 1-2:**
- [ ] Grocery inventory CRUD
- [ ] Stock level tracking
- [ ] Expiration date warnings
- [ ] Shopping list

### Phase 5B: Recipe Generation (Cloud LLM)
**Week 3:**
- [ ] Set up Anthropic API
- [ ] Implement recipe generator utility
- [ ] Create API route
- [ ] Build UI (recipes page)
- [ ] Test with real grocery data
- [ ] Add "I cooked this" tracking

### Phase 5C: Enhancements (Optional)
**Week 4:**
- [ ] Add dietary preference filters
- [ ] Recipe history view
- [ ] "Quick meals" filter (<20 min)
- [ ] "Use expiring items" priority mode
- [ ] Share recipes with family members

---

## Migration Path to Local LLM

**Phase 12 (Month 9):**
```typescript
// Environment flag controls which backend
const USE_LOCAL_LLM = process.env.USE_LOCAL_LLM === 'true';

export async function generateRecipes(...args) {
  if (USE_LOCAL_LLM) {
    return generateRecipesLocal(...args);
  } else {
    return generateRecipesCloud(...args);
  }
}
```

**Benefits:**
1. Can A/B test local vs cloud quality
2. Fallback to cloud if local server down
3. Zero code changes in UI
4. Seamless migration

---

## Alternative: Quick Prototype (Phase 2.5)

**If you want to test LLM integration NOW:**

### Minimal Recipe Generator (1 day)
```
- Hardcode sample inventory (eggs, rice, chicken, etc.)
- Single "Generate" button
- Show 3 recipes
- No database storage
- Prove the concept works
```

**Then:**
- Full implementation in Phase 5B (with real inventory)
- Migrate to local LLM in Phase 12

---

## Recommendation Summary

### ✅ Best Approach: Phase 5B (Month 3-4)

**Rationale:**
1. **Natural fit:** Recipe gen belongs with groceries domain
2. **ADHD value:** Solves "what to cook" paralysis (high impact)
3. **Cost-effective:** $1-2/month for cloud LLM
4. **Migration path:** Easy switch to local in Phase 12
5. **User delight:** High wow-factor feature

### Timeline
```
Month 1-2: Phases 1-4 (bills, notifications, offline)
Month 3: Phase 5A (groceries foundation)
Month 3-4: Phase 5B (recipe generation) ← INSERT HERE
Month 9+: Phase 12 (migrate to local LLM)
```

### Quick Win Alternative
If you want to **test the concept earlier**, add a "Phase 2.5 Prototype" using hardcoded ingredients. Takes 1 day, proves value immediately.

---

## Next Steps

1. **Finish Phase 1.5** (bill recurrence) this week
2. **Ship Phase 2** (notifications) next 2 weeks
3. **Build Phase 5A-B** (groceries + recipes) Month 3

Then you'll have:
- ✅ Never miss bills (Phase 1-2)
- ✅ Never wonder "what's for dinner" (Phase 5B)
- ✅ Path to 100% local, zero-cost LLM (Phase 12)

**Want to see the recipe generator UI mocked up in detail? Or start with the Phase 2.5 quick prototype?** 🍳
