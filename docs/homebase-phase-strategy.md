# Recipe LLM Integration - Strategic Timing Analysis

## Current Situation

✅ **Phase 1 Status:** ~95% complete
- Password reset implementation in progress (6 tasks remaining)
- Core bills tracking working
- Authentication solid
- Ready to move forward

🎯 **Next Up:** Phase 2 - Mission-Critical Notifications
- This is THE priority (prevents PELCO disasters)
- Non-negotiable for system to fulfill its core purpose
- Must happen before anything else

---

## The Strategic Dilemma

You want recipe generation NOW, but:
- ❌ Full groceries (Phase 5) is months away
- ✅ LLM integration is quick (1-2 days)
- ✅ Recipe value is real and immediate
- ⚠️ But Phase 2 notifications are life-or-death critical

---

## Solution: Phase 1.7 - "Recipe Prototype Without Groceries"

### The Insight

**You don't need a full grocery inventory system to test recipe generation.**

Instead, create a **minimal viable recipe feature** that:
1. ✅ Tests LLM integration architecture (learn now, not later)
2. ✅ Provides immediate value (helps with meal planning TODAY)
3. ✅ Takes 1-2 days (doesn't delay Phase 2)
4. ✅ Gets refactored properly when Phase 5 ships

---

## Phase 1.7: Manual Inventory Recipe Generator

### Concept: "Quick Inventory Input"

```
USER FLOW:
1. User clicks "What Can I Cook?"
2. Sees simple textarea: "What's in your fridge/pantry?"
3. Types: "eggs, rice, chicken, onions, garlic, soy sauce"
4. Clicks "Generate Recipes"
5. Gets 3 recipes using those ingredients
6. Cooks dinner ✓
```

**No database. No inventory tracking. Just LLM + text input.**

---

## Implementation (1-2 Days)

### Database Schema (Minimal)
```typescript
// src/lib/db/schema.ts - ADD THIS ONLY

export const quickRecipes = pgTable('quick_recipes', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').notNull().references(() => organizations.id),
  userId: integer('user_id').notNull().references(() => users.id),
  inputIngredients: text('input_ingredients').notNull(), // What user typed
  recipeName: varchar('recipe_name', { length: 255 }).notNull(),
  ingredients: text('ingredients').notNull(), // JSON
  instructions: text('instructions').notNull(), // JSON
  servings: integer('servings').default(4),
  prepTime: integer('prep_time_minutes'),
  cookTime: integer('cook_time_minutes'),
  difficulty: varchar('difficulty', { length: 20 }),
  wasCooked: boolean('was_cooked').default(false),
  rating: integer('rating'), // 1-5 stars
  createdAt: timestamp('created_at').defaultNow(),
});
```

### LLM Utility (Same as before)
```typescript
// src/lib/llm/recipe-generator.ts

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function generateRecipesFromText(
  ingredientsText: string,
  servings: number = 4
) {
  const prompt = `You are a helpful cooking assistant for a Filipino household.

Available ingredients: ${ingredientsText}

Generate 3 simple, practical recipes using ONLY the ingredients listed.
Prioritize Filipino cuisine when possible.

For each recipe provide:
1. Recipe name
2. Ingredients with quantities
3. Simple step-by-step instructions (max 8 steps)
4. Prep time and cook time (in minutes)
5. Difficulty (easy/medium/hard)

Return as JSON array: [{ name, ingredients[], instructions[], prepTime, cookTime, difficulty }]`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response');

  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No JSON in response');

  return JSON.parse(jsonMatch[0]);
}
```

### API Route
```typescript
// src/app/api/recipes/quick/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/server';
import { generateRecipesFromText } from '@/lib/llm/recipe-generator';
import { db } from '@/lib/db';
import { quickRecipes } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { ingredients, servings = 4 } = body;

    if (!ingredients || ingredients.trim().length === 0) {
      return NextResponse.json(
        { error: 'Please enter some ingredients' },
        { status: 400 }
      );
    }

    // Generate recipes
    const recipes = await generateRecipesFromText(ingredients, servings);

    // Save to database
    const savedRecipes = await Promise.all(
      recipes.map(async (recipe: any) => {
        const [saved] = await db
          .insert(quickRecipes)
          .values({
            orgId: authUser.orgId,
            userId: authUser.userId,
            inputIngredients: ingredients,
            recipeName: recipe.name,
            ingredients: JSON.stringify(recipe.ingredients),
            instructions: JSON.stringify(recipe.instructions),
            servings: recipe.servings || servings,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            difficulty: recipe.difficulty,
          })
          .returning();
        return saved;
      })
    );

    return NextResponse.json({ recipes: savedRecipes });
  } catch (error) {
    console.error('Recipe generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recipes' },
      { status: 500 }
    );
  }
}
```

### Simple UI
```tsx
// src/app/(dashboard)/recipes/page.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function QuickRecipesPage() {
  const [ingredients, setIngredients] = useState('');
  const [servings, setServings] = useState(4);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/recipes/quick', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, servings }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to generate recipes');
        return;
      }

      setRecipes(data.recipes);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/bills" className="text-indigo-600 hover:text-indigo-800 text-lg font-medium">
            ← Back to Dashboard
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">What Can I Cook?</h1>
        <p className="text-gray-600 mb-6">
          Tell me what's in your fridge and pantry, I'll suggest recipes.
        </p>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="block text-lg font-medium mb-2">
            What ingredients do you have?
          </label>
          <textarea
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder="Example: eggs, rice, chicken breast, onions, garlic, soy sauce, vegetables"
            className="w-full px-4 py-3 border border-gray-300 rounded-md text-lg mb-4"
            rows={4}
            style={{ minHeight: '44px' }}
          />

          <div className="mb-4">
            <label className="block text-lg font-medium mb-2">
              How many servings?
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={servings}
              onChange={(e) => setServings(parseInt(e.target.value))}
              className="w-24 px-4 py-3 border border-gray-300 rounded-md text-lg"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !ingredients.trim()}
            className="w-full bg-indigo-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: '48px' }}
          >
            {loading ? '🤔 Generating recipes...' : '🍳 Generate Recipes'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {recipes.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Your Recipes ({recipes.length})</h2>
            {recipes.map((recipe) => (
              <div key={recipe.id} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-2xl font-bold mb-2">{recipe.recipeName}</h3>
                
                <div className="flex gap-4 text-sm text-gray-600 mb-4">
                  <span>⏱️ {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min</span>
                  <span>👥 {recipe.servings} servings</span>
                  <span>
                    {recipe.difficulty === 'easy' && '✅ Easy'}
                    {recipe.difficulty === 'medium' && '⚡ Medium'}
                    {recipe.difficulty === 'hard' && '🔥 Hard'}
                  </span>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Ingredients:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {JSON.parse(recipe.ingredients).map((ing: string, i: number) => (
                      <li key={i} className="text-gray-700">{ing}</li>
                    ))}
                  </ul>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Instructions:</h4>
                  <ol className="list-decimal list-inside space-y-2">
                    {JSON.parse(recipe.instructions).map((step: string, i: number) => (
                      <li key={i} className="text-gray-700">{step}</li>
                    ))}
                  </ol>
                </div>

                <button
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700"
                  onClick={() => {
                    // TODO: Mark as cooked
                    alert('Recipe marked as cooked! (Full tracking in Phase 5)');
                  }}
                >
                  ✅ I Cooked This
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Timeline: This Week

### Today (2-3 hours)
```
✅ Finish password reset (6 tasks)
✅ Add ANTHROPIC_API_KEY to .env
✅ Create recipe generator utility
✅ Create API route
✅ Create simple UI page
✅ Test with real ingredients
```

### Tomorrow
```
✅ Link from dashboard navigation
✅ Test on mobile
✅ Deploy to production
✅ USE IT for dinner planning
```

### This Weekend
```
🚀 Start Phase 2 (notifications)
```

---

## Migration Path to Phase 5

**When Phase 5 ships (Month 3-4):**

1. Keep the quick recipe page for manual entry
2. Add "Use My Inventory" button
3. Pre-fill textarea with actual grocery data
4. User can edit before generating
5. Eventually make manual entry optional

**Result:** Feature works TODAY, gets better later.

---

## Why This Works for Your Brain

### ADHD Wins
1. **Immediate gratification** - Works tonight for dinner
2. **Low friction** - Just type ingredients, get recipes
3. **No complex setup** - No inventory management overhead
4. **Dopamine hit** - LLM magic = exciting
5. **Practical value** - Solves real problem TODAY

### Engineering Wins
1. **Proves LLM integration** - Learn the pattern now
2. **Zero dependency** - Doesn't block Phase 2
3. **Quick to build** - 2-3 hours tops
4. **Easy to enhance** - Add features incrementally
5. **Clean refactor** - Slot into Phase 5 when ready

### Family Wins
1. **Helps with dinner planning** - Starting tonight
2. **Uses what you have** - No waste
3. **Simple instructions** - Easy to follow when tired
4. **Filipino cuisine** - Claude knows adobo, sinigang, etc.
5. **Success tracking** - "I cooked this" builds momentum

---

## Revised Roadmap

### This Week
```
Mon: ✅ Finish password reset
Tue: 🍳 Build quick recipe feature (Phase 1.7)
Wed: 🔔 Start Phase 2 (notifications architecture)
Thu-Fri: 🔔 Continue Phase 2
Weekend: 🔔 Phase 2 testing
```

### Next 2 Weeks
```
Week 2: 🔔 Phase 2 (web push notifications)
Week 3: 🔔 Phase 2 (SMS fallback + weather integration)
```

### Month 3-4
```
Phase 5A: Grocery inventory tracking
Phase 5B: Upgrade recipe feature to use inventory
```

---

## Cost Analysis (Phase 1.7)

**Anthropic API:**
- Recipe generation: ~3,000 tokens total
- Cost: $0.015 per generation
- 2 generations/day × 30 days = $0.90/month

**Cheaper than a single fast food meal.**

---

## The Pitch: Why Build This NOW

1. **Testing ground for LLM integration**
   - Learn Anthropic API before Phase 12
   - Understand prompt engineering
   - Test response parsing
   - Debug error handling

2. **Immediate family value**
   - Helps with meal planning TONIGHT
   - Reduces decision fatigue
   - Uses existing ingredients
   - Prevents food waste

3. **Doesn't delay critical path**
   - 2-3 hours of work
   - Phase 2 notifications still start this week
   - No dependencies to block on

4. **Incremental enhancement path**
   - Works standalone (Phase 1.7)
   - Gets better with inventory (Phase 5B)
   - Goes local with Ollama (Phase 12)

5. **Dopamine + Learning**
   - Fun to build (LLM = magic)
   - Satisfying to use (dinner solved)
   - Educational (LLM architecture)
   - Portfolio piece (show future employers)

---

## Recommended Decision

### ✅ YES - Build Phase 1.7 This Week

**Timing:**
- Tuesday: 2-3 hours to build
- Tuesday night: Test with real dinner planning
- Wednesday: Deploy, share with family
- Wednesday+: Phase 2 notifications (back on critical path)

**Why:**
1. Low cost (time + money)
2. High value (immediate + learning)
3. Doesn't delay Phase 2
4. Proves LLM architecture
5. Makes you happy (dopamine matters!)

### What NOT to Build Yet
❌ Full grocery inventory system  
❌ Expiration tracking  
❌ Shopping list auto-generation  
❌ Recipe sharing  
❌ Meal planning calendar  

**Those come in Phase 5.** Stay focused.

---

## Next Steps

**If you want to build Phase 1.7:**

I can create:
1. Complete working code (copy-paste ready)
2. Migration guide (schema + deployment)
3. Testing checklist
4. Example prompts for best results

**If you want to skip to Phase 2:**

I can help with:
1. Notification architecture design
2. Web Push setup guide
3. SMS integration strategy
4. Weather API integration

**What's your call?** 🎯
