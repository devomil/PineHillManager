/**
 * AI Training Generation Service
 * Uses Anthropic Claude AI to generate comprehensive training content
 */

import Anthropic from '@anthropic-ai/sdk';

interface ProductInfo {
  name: string;
  description: string;
  images?: string[];
  category?: string;
}

interface GeneratedLesson {
  title: string;
  content: string;
  duration: number;
  orderIndex: number;
}

interface GeneratedQuestion {
  questionText: string;
  questionType: 'multiple_choice';
  options: Array<{ id: string; text: string; isCorrect: boolean }>;
  explanation: string;
  points: number;
  orderIndex: number;
}

interface TrainingContent {
  enrichedDescription: string;
  lessons: GeneratedLesson[];
  questions: GeneratedQuestion[];
  skills: string[];
  estimatedDuration: number;
}

export class AITrainingGenerator {
  private anthropic: Anthropic;
  
  constructor(apiKey?: string) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error('Anthropic API key is required for AI training generation');
    }
    this.anthropic = new Anthropic({ apiKey: key });
  }

  /**
   * Generate comprehensive training content for a product
   */
  async generateTrainingContent(product: ProductInfo): Promise<TrainingContent> {
    console.log(`🤖 Generating AI training with Claude for: ${product.name}`);

    // Step 1: Enrich product description
    const enrichedDescription = await this.enrichProductDescription(product);

    // Step 2: Generate comprehensive lessons
    const lessons = await this.generateLessons(product, enrichedDescription);

    // Step 3: Generate assessment questions
    const questions = await this.generateQuestions(product, lessons);

    // Step 4: Identify skills gained
    const skills = await this.identifySkills(product, lessons);

    const estimatedDuration = lessons.reduce((sum, lesson) => sum + lesson.duration, 0) + 10;

    console.log(`✅ Generated ${lessons.length} lessons and ${questions.length} questions with Claude`);

    return {
      enrichedDescription,
      lessons,
      questions,
      skills,
      estimatedDuration,
    };
  }

  /**
   * Generate comprehensive training content for a collection of products
   */
  async generateCollectionTraining(data: { collectionName: string; products: any[] }): Promise<TrainingContent> {
    console.log(`🤖 Generating AI training for collection: ${data.collectionName} (${data.products.length} products)`);

    const productList = data.products.map(p => `- ${p.name}: ${p.description || 'No description'}`).join('\n');
    
    // Generate enriched description for the collection
    const enrichedDescription = await this.enrichCollectionDescription(data.collectionName, productList);

    // Generate comprehensive lessons covering all products
    const lessons = await this.generateCollectionLessons(data.collectionName, data.products, enrichedDescription);

    // Generate assessment questions
    const questions = await this.generateCollectionQuestions(data.collectionName, data.products, lessons);

    // Identify skills gained
    const skills = await this.identifyCollectionSkills(data.collectionName, data.products);

    const estimatedDuration = lessons.reduce((sum, lesson) => sum + lesson.duration, 0) + 10;

    console.log(`✅ Generated collection training: ${lessons.length} lessons, ${questions.length} questions`);

    return {
      enrichedDescription,
      lessons,
      questions,
      skills,
      estimatedDuration,
    };
  }

  /**
   * Enrich basic product description with additional context
   */
  private async enrichProductDescription(product: ProductInfo): Promise<string> {
    const prompt = `As a product training expert, enhance this product description with educational context:

Product: ${product.name}
Category: ${product.category || 'General'}
Current Description: ${product.description}

Provide a comprehensive training description (150-200 words) that includes:
- Product overview and purpose
- Target audience and use cases
- Key differentiators
- Important considerations for staff

Write in a professional, educational tone suitable for employee training.`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = message.content[0];
      if (content.type === 'text') {
        return content.text.trim() || product.description;
      }
      return product.description;
    } catch (error) {
      console.warn('Failed to enrich description, using original:', error);
      return product.description;
    }
  }

  /**
   * Generate training lessons
   */
  private async generateLessons(product: ProductInfo, enrichedDescription: string): Promise<GeneratedLesson[]> {
    const lessons: GeneratedLesson[] = [];

    // Add product image if available
    const imageHtml = product.images && product.images.length > 0 
      ? `\n\n<img src="${product.images[0]}" alt="${product.name}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 20px 0;" />\n\n`
      : '';

    // Lesson 1: Product Overview
    const overviewContent = await this.generateLessonContent(
      product,
      'Product Overview',
      `Create a comprehensive product overview lesson (200-250 words) for ${product.name}. Include:
- What the product is
- Who it's for
- Main purpose and benefits
- When to recommend it

Base your content on: ${enrichedDescription}

Format using clean HTML with proper structure:
- Use <h3 class="font-semibold text-lg mt-6 mb-3"> for headings
- Use <ul class="list-disc list-inside space-y-2 mb-4"><li>item</li></ul> for bullet lists
- Use <p class="mb-4"> for paragraphs
Output only HTML, no markdown.`
    );

    lessons.push({
      title: `${product.name} - Product Overview`,
      content: imageHtml + overviewContent,
      duration: 5,
      orderIndex: 1,
    });

    // Lesson 2: Key Features & Benefits
    const featuresContent = await this.generateLessonContent(
      product,
      'Features & Benefits',
      `Create a lesson about the key features and benefits of ${product.name} (150-200 words). Focus on:
- Top 3-5 key features
- Customer benefits for each feature
- How to explain these to customers
- Competitive advantages

Base your content on: ${enrichedDescription}

Format using clean HTML with proper structure:
- Use <h3 class="font-semibold text-lg mt-6 mb-3"> for headings
- Use <ul class="list-disc list-inside space-y-2 mb-4"><li>item</li></ul> for bullet lists
- Use <p class="mb-4"> for paragraphs
Output only HTML, no markdown.`
    );

    lessons.push({
      title: `${product.name} - Key Features & Benefits`,
      content: featuresContent,
      duration: 4,
      orderIndex: 2,
    });

    // Lesson 3: Customer Service Guide
    const serviceContent = await this.generateLessonContent(
      product,
      'Customer Service',
      `Create a customer service guide for ${product.name} (150-200 words). Include:
- Common customer questions and answers (format as Q&A pairs)
- How to handle objections
- Best practices for recommending this product
- Important disclaimers or warnings

Base your content on: ${enrichedDescription}

CRITICAL: Format using clean HTML with proper semantic structure:
- Use <h3> for section headings
- For Q&A sections, use this exact format:
  <div class="qa-pair">
    <p class="question"><strong>Q:</strong> Question text here?</p>
    <p class="answer"><strong>A:</strong> Answer text here</p>
  </div>
- For bullet lists: <ul><li>item</li></ul>
- For regular paragraphs: <p>text</p>
- Include spacing with margin classes

Output only clean HTML, no markdown.`
    );

    lessons.push({
      title: `${product.name} - Customer Service Guide`,
      content: serviceContent,
      duration: 4,
      orderIndex: 3,
    });

    return lessons;
  }

  /**
   * Generate content for a specific lesson
   */
  private async generateLessonContent(product: ProductInfo, lessonType: string, prompt: string): Promise<string> {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = message.content[0];
      if (content.type === 'text') {
        return content.text.trim();
      }
      return this.getFallbackLessonContent(product, lessonType);
    } catch (error) {
      console.warn(`Failed to generate ${lessonType}, using template:`, error);
      return this.getFallbackLessonContent(product, lessonType);
    }
  }

  /**
   * Generate assessment questions
   */
  private async generateQuestions(product: ProductInfo, lessons: GeneratedLesson[]): Promise<GeneratedQuestion[]> {
    const questions: GeneratedQuestion[] = [];

    // Combine lesson content for context
    const lessonContext = lessons.map(l => `${l.title}:\n${l.content}`).join('\n\n---\n\n');

    // Generate 5 unique questions covering different aspects
    const questionPrompts = [
      {
        topic: 'Product Knowledge',
        prompt: `Based on this training content about ${product.name}, create a multiple-choice question about the main purpose or use of this product:

Training Content:
${lessonContext.substring(0, 1500)}

Create a unique, specific question with 4 answer options based on the actual product information above.`,
      },
      {
        topic: 'Features',
        prompt: `Based on this training content about ${product.name}, create a multiple-choice question about a specific feature or benefit mentioned:

Training Content:
${lessonContext.substring(0, 1500)}

Create a unique question with 4 answer options based on actual features discussed in the content.`,
      },
      {
        topic: 'Customer Service',
        prompt: `Based on this training content about ${product.name}, create a multiple-choice question about when or how to recommend this product:

Training Content:
${lessonContext.substring(0, 1500)}

Create a unique question with 4 answer options based on the customer service information provided.`,
      },
      {
        topic: 'Best Practices',
        prompt: `Based on this training content about ${product.name}, create a multiple-choice question about best practices for selling or explaining this product:

Training Content:
${lessonContext.substring(0, 1500)}

Create a unique question with 4 answer options.`,
      },
      {
        topic: 'Product Details',
        prompt: `Based on this training content about ${product.name}, create a multiple-choice question testing specific product knowledge:

Training Content:
${lessonContext.substring(0, 1500)}

Create a unique question with 4 answer options based on specific details from the content.`,
      },
    ];

    for (let i = 0; i < questionPrompts.length; i++) {
      const questionData = questionPrompts[i];
      try {
        const question = await this.generateSingleQuestion(product, questionData.prompt, questionData.topic, i + 1);
        questions.push(question);
      } catch (error) {
        console.warn(`Failed to generate question ${i + 1}, using fallback`);
        questions.push(this.getFallbackQuestion(product, questionData.topic, i + 1));
      }
    }

    return questions;
  }

  /**
   * Generate a single assessment question
   */
  private async generateSingleQuestion(
    product: ProductInfo,
    prompt: string,
    topic: string,
    orderIndex: number
  ): Promise<GeneratedQuestion> {
    const fullPrompt = `${prompt}

Format your response as JSON only:
{
  "question": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0,
  "explanation": "Why this answer is correct"
}

Respond with ONLY the JSON object, no other text.`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: fullPrompt
        }]
      });

      const content = message.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          
          return {
            questionText: parsed.question,
            questionType: 'multiple_choice',
            options: parsed.options.map((text: string, idx: number) => ({
              id: `option_${idx}`,
              text,
              isCorrect: idx === parsed.correctIndex,
            })),
            explanation: parsed.explanation,
            points: 1,
            orderIndex,
          };
        }
      }
    } catch (error) {
      console.warn('Failed to parse AI question, using fallback');
    }

    return this.getFallbackQuestion(product, topic, orderIndex);
  }

  /**
   * Identify skills gained from training
   */
  private async identifySkills(product: ProductInfo, lessons: GeneratedLesson[]): Promise<string[]> {
    const skills: string[] = [];

    skills.push(`${product.name} Product Knowledge`);

    if (product.category && product.category !== 'Product Training') {
      skills.push(`${product.category} Expertise`);
    }

    skills.push('Customer Service');
    skills.push('Product Recommendation');

    return skills;
  }

  /**
   * Fallback lesson content when AI generation fails
   */
  private getFallbackLessonContent(product: ProductInfo, lessonType: string): string {
    const templates: Record<string, string> = {
      'Product Overview': `## ${product.name} - Product Overview

${product.description}

This product is designed to meet customer needs and provide value through its key features and benefits. As a team member, you should be familiar with this product to effectively assist customers.

### Key Points to Remember:
- Product name: ${product.name}
- Category: ${product.category || 'General'}
- Target customers: Varies based on needs

Review this information and be prepared to answer customer questions about this product.`,
      
      'Features & Benefits': `## ${product.name} - Key Features & Benefits

This lesson covers the main features and benefits of ${product.name}.

### Features:
- High-quality product design
- Meets customer expectations
- Reliable performance

### Benefits:
- Provides value to customers
- Solves specific problems
- Easy to use and recommend

When discussing this product with customers, focus on how these features translate into real benefits for their specific situation.`,
      
      'Customer Service': `## ${product.name} - Customer Service Guide

### Common Questions:
**What is this product?**
Answer: ${product.name} is a quality product designed for customer needs.
  
**Who is this for?**
Answer: This product is suitable for customers looking for ${product.category || 'this type of solution'}.

### Best Practices:
- Listen to customer needs first
- Match product benefits to their situation
- Be honest about what the product can and cannot do
- Provide excellent follow-up service`,
    };

    return templates[lessonType] || product.description;
  }

  /**
   * Fallback question when AI generation fails
   */
  private getFallbackQuestion(product: ProductInfo, topic: string, orderIndex: number): GeneratedQuestion {
    const descWords = product.description.split(' ').slice(0, 20).join(' ');
    
    return {
      questionText: `What is ${product.name} primarily used for?`,
      questionType: 'multiple_choice',
      options: [
        { id: 'option_0', text: descWords || `A quality ${product.category || 'product'} for customers`, isCorrect: true },
        { id: 'option_1', text: 'General retail merchandise', isCorrect: false },
        { id: 'option_2', text: 'Display purposes only', isCorrect: false },
        { id: 'option_3', text: 'Store inventory management', isCorrect: false },
      ],
      explanation: `${product.name} is designed for the purpose described in the product training materials.`,
      points: 1,
      orderIndex,
    };
  }

  /**
   * Collection training helper methods
   */
  private async enrichCollectionDescription(collectionName: string, productList: string): Promise<string> {
    const prompt = `As a product training expert, create a comprehensive training description for this product collection:

Collection: ${collectionName}
Products:
${productList}

Provide a training overview (200-250 words) that:
- Introduces the product collection
- Explains how these products work together
- Highlights key benefits and use cases
- Provides context for staff training

Write in a professional, educational tone.`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = message.content[0];
      if (content.type === 'text') {
        return content.text.trim();
      }
    } catch (error) {
      console.warn('Failed to enrich collection description:', error);
    }
    return `Training module for ${collectionName}`;
  }

  private async generateCollectionLessons(collectionName: string, products: any[], enrichedDescription: string): Promise<GeneratedLesson[]> {
    const productList = products.map(p => `- ${p.name}: ${p.description || 'Product information'}`).join('\n');
    
    const prompt = `Create 3-4 comprehensive training lessons for the "${collectionName}" product collection.

Products in collection:
${productList}

Collection Overview:
${enrichedDescription}

For each lesson, provide:
1. Title
2. Content (HTML format with proper semantic structure: <h2>, <h3>, <p>, <ul>, etc.)
3. Duration in minutes

Focus on:
- Lesson 1: Overview of the collection
- Lesson 2: Individual product details
- Lesson 3: Customer service and recommendations
- Lesson 4 (optional): Advanced topics or comparisons

Return as JSON array:
[
  {
    "title": "Lesson Title",
    "content": "<h2>Heading</h2><p>Content...</p>",
    "duration": 10
  }
]`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = message.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      console.warn('Failed to generate collection lessons:', error);
    }

    // Fallback lessons
    return [
      {
        title: `${collectionName} - Overview`,
        content: `<h2>Collection Overview</h2><p>${enrichedDescription}</p>`,
        duration: 10,
        orderIndex: 0,
      },
      {
        title: `${collectionName} - Products`,
        content: `<h2>Products in Collection</h2><ul>${products.map(p => `<li><strong>${p.name}</strong>: ${p.description}</li>`).join('')}</ul>`,
        duration: 15,
        orderIndex: 1,
      }
    ];
  }

  private async generateCollectionQuestions(collectionName: string, products: any[], lessons: GeneratedLesson[]): Promise<GeneratedQuestion[]> {
    const productList = products.map(p => p.name).join(', ');
    
    const prompt = `Create 5-7 assessment questions for the "${collectionName}" product collection training.

Products: ${productList}

Create a mix of:
- Multiple choice questions (4 options each)
- True/false questions
- Questions about product features, benefits, and customer service

Return as JSON array with this structure:
[
  {
    "questionText": "Question text",
    "questionType": "multiple_choice",
    "options": [
      {"id": "option_0", "text": "Option 1", "isCorrect": true},
      {"id": "option_1", "text": "Option 2", "isCorrect": false}
    ],
    "explanation": "Why this is correct",
    "points": 1,
    "orderIndex": 0
  }
]`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = message.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      console.warn('Failed to generate collection questions:', error);
    }

    // Fallback question
    return [{
      questionText: `Which products are included in ${collectionName}?`,
      questionType: 'multiple_choice',
      options: [
        { id: 'option_0', text: productList, isCorrect: true },
        { id: 'option_1', text: 'Different products', isCorrect: false },
        { id: 'option_2', text: 'No products', isCorrect: false },
        { id: 'option_3', text: 'Unknown', isCorrect: false },
      ],
      explanation: `The ${collectionName} includes: ${productList}`,
      points: 1,
      orderIndex: 0,
    }];
  }

  private async identifyCollectionSkills(collectionName: string, products: any[]): Promise<string[]> {
    const brands = Array.from(new Set(products.map(p => p.brand).filter(Boolean)));
    const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

    const skills = [
      `${collectionName} Product Knowledge`,
      'Multi-Product Customer Service',
    ];

    if (brands.length > 0) {
      skills.push(...brands.map(b => `${b} Brand Expertise`));
    }
    if (categories.length > 0) {
      skills.push(...categories.map(c => `${c} Category Knowledge`));
    }

    return skills.slice(0, 5);
  }

  /**
   * Generate final comprehensive exam for a collection
   * This tests knowledge across ALL products in the collection
   */
  async generateFinalExam(data: { collectionName: string; products: any[] }): Promise<TrainingContent> {
    console.log(`🎓 Generating final comprehensive exam for: ${data.collectionName}`);

    const productList = data.products.map(p => `- ${p.name}: ${p.description || 'No description'}`).join('\n');
    
    // Generate enriched description for the final exam
    const enrichedDescription = `Comprehensive final exam covering all ${data.products.length} products in the ${data.collectionName} collection. This assessment validates mastery of product knowledge, features, benefits, and appropriate customer recommendations.`;

    // Generate comprehensive exam questions covering ALL products
    const questions = await this.generateFinalExamQuestions(data.collectionName, data.products);

    // No lessons for final exam - it's assessment only
    const lessons: GeneratedLesson[] = [];

    // Identify skills validated by this exam
    const skills = await this.identifyCollectionSkills(data.collectionName, data.products);

    const estimatedDuration = 20; // 20 minutes for final exam

    console.log(`✅ Generated final exam with ${questions.length} comprehensive questions`);

    return {
      enrichedDescription,
      lessons,
      questions,
      skills,
      estimatedDuration,
    };
  }

  /**
   * Generate comprehensive exam questions covering all products
   */
  private async generateFinalExamQuestions(collectionName: string, products: any[]): Promise<GeneratedQuestion[]> {
    const productList = products.map((p, idx) => `${idx + 1}. ${p.name}: ${p.description || 'No description'}`).join('\n');
    
    const prompt = `Create a comprehensive final exam with 15-20 questions testing knowledge across ALL products in this collection:

Collection: ${collectionName}
Products (${products.length} total):
${productList}

Create questions that:
- Test knowledge of MULTIPLE products (comparisons, differentiation)
- Cover product benefits, features, and appropriate use cases
- Test customer recommendation scenarios
- Validate understanding of the ENTIRE product line
- Include mix of difficulty levels

Return a JSON array of questions, each with:
{
  "questionText": "The question text",
  "questionType": "multiple_choice",
  "options": [
    {"id": "a", "text": "Option text", "isCorrect": true/false},
    {"id": "b", "text": "Option text", "isCorrect": true/false},
    {"id": "c", "text": "Option text", "isCorrect": true/false},
    {"id": "d", "text": "Option text", "isCorrect": true/false}
  ],
  "explanation": "Why the correct answer is right",
  "points": 1
}`;

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4',
      max_tokens: 8000,
      temperature: 0.8,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      try {
        const questionsData = JSON.parse(content.text);
        return questionsData.map((q: any, idx: number) => ({
          questionText: q.questionText,
          questionType: 'multiple_choice' as const,
          options: q.options,
          explanation: q.explanation,
          points: q.points || 1,
          orderIndex: idx,
        }));
      } catch (error) {
        console.error('Failed to parse final exam questions:', error);
        throw new Error('Failed to generate final exam questions');
      }
    }

    throw new Error('No content returned from Claude for final exam');
  }
}
