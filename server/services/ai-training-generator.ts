/**
 * AI Training Generation Service
 * Uses Hugging Face Inference API and web search to generate comprehensive training content
 * 
 * From blueprint:javascript_anthropic - Using AI for content generation
 * Note: Using Hugging Face as primary AI provider
 */

import { HfInference } from '@huggingface/inference';

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
  private hf: HfInference;
  
  constructor(apiKey?: string) {
    const key = apiKey || process.env.HUGGINGFACE_API_TOKEN || process.env.HUGGING_FACE_API_KEY || process.env.HF_API_KEY;
    if (!key) {
      throw new Error('Hugging Face API key is required for AI training generation');
    }
    this.hf = new HfInference(key);
  }

  /**
   * Generate comprehensive training content for a product
   */
  async generateTrainingContent(product: ProductInfo): Promise<TrainingContent> {
    console.log(`🤖 Generating AI training for: ${product.name}`);

    // Step 1: Enrich product description with web research
    const enrichedDescription = await this.enrichProductDescription(product);

    // Step 2: Generate comprehensive lessons
    const lessons = await this.generateLessons(product, enrichedDescription);

    // Step 3: Generate assessment questions
    const questions = await this.generateQuestions(product, lessons);

    // Step 4: Identify skills gained
    const skills = await this.identifySkills(product, lessons);

    const estimatedDuration = lessons.reduce((sum, lesson) => sum + lesson.duration, 0) + 10; // +10 for assessment

    console.log(`✅ Generated ${lessons.length} lessons and ${questions.length} questions`);

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
      const response = await this.hf.textGeneration({
        model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        inputs: prompt,
        parameters: {
          max_new_tokens: 300,
          temperature: 0.7,
          top_p: 0.9,
          return_full_text: false,
        },
      });

      return response.generated_text.trim() || product.description;
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

    // Lesson 1: Product Overview
    const overviewContent = await this.generateLessonContent(
      product,
      'Product Overview',
      `Create a comprehensive product overview lesson (200-250 words) for ${product.name}. Include:
- What the product is
- Who it's for
- Main purpose and benefits
- When to recommend it

Base your content on: ${enrichedDescription}`
    );

    lessons.push({
      title: `${product.name} - Product Overview`,
      content: overviewContent,
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

Base your content on: ${enrichedDescription}`
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
- Common customer questions and answers
- How to handle objections
- Best practices for recommending this product
- Important disclaimers or warnings

Base your content on: ${enrichedDescription}`
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
      const response = await this.hf.textGeneration({
        model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        inputs: prompt,
        parameters: {
          max_new_tokens: 400,
          temperature: 0.7,
          top_p: 0.9,
          return_full_text: false,
        },
      });

      return response.generated_text.trim();
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

    // Generate 5 questions covering different aspects
    const questionPrompts = [
      {
        topic: 'Product Knowledge',
        prompt: `Create a multiple-choice question about the main purpose of ${product.name}. Provide 4 options with one correct answer.`,
      },
      {
        topic: 'Features',
        prompt: `Create a multiple-choice question about a key feature or benefit of ${product.name}. Provide 4 options with one correct answer.`,
      },
      {
        topic: 'Customer Service',
        prompt: `Create a multiple-choice question about when to recommend ${product.name} to a customer. Provide 4 options with one correct answer.`,
      },
      {
        topic: 'Best Practices',
        prompt: `Create a multiple-choice question about best practices for selling or explaining ${product.name}. Provide 4 options with one correct answer.`,
      },
      {
        topic: 'Product Details',
        prompt: `Create a multiple-choice question testing specific knowledge about ${product.name}. Provide 4 options with one correct answer.`,
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

Format your response as JSON:
{
  "question": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0,
  "explanation": "Why this answer is correct"
}`;

    try {
      const response = await this.hf.textGeneration({
        model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: 300,
          temperature: 0.8,
          top_p: 0.9,
          return_full_text: false,
        },
      });

      // Parse the response
      const jsonMatch = response.generated_text.match(/\{[\s\S]*\}/);
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

    // Add product-specific skill
    skills.push(`${product.name} Product Knowledge`);

    // Add category skill if available
    if (product.category) {
      skills.push(`${product.category} Expertise`);
    }

    // Add general skills
    skills.push('Customer Service');
    skills.push('Product Recommendation');

    return skills;
  }

  /**
   * Fallback lesson content when AI generation fails
   */
  private getFallbackLessonContent(product: ProductInfo, lessonType: string): string {
    const templates: Record<string, string> = {
      'Product Overview': `# ${product.name} - Product Overview

${product.description}

This product is designed to meet customer needs and provide value through its key features and benefits. As a team member, you should be familiar with this product to effectively assist customers.

## Key Points to Remember:
- Product name: ${product.name}
- Category: ${product.category || 'General'}
- Target customers: Varies based on needs

Review this information and be prepared to answer customer questions about this product.`,
      
      'Features & Benefits': `# ${product.name} - Key Features & Benefits

This lesson covers the main features and benefits of ${product.name}.

## Features:
- High-quality product design
- Meets customer expectations
- Reliable performance

## Benefits:
- Provides value to customers
- Solves specific problems
- Easy to use and recommend

When discussing this product with customers, focus on how these features translate into real benefits for their specific situation.`,
      
      'Customer Service': `# ${product.name} - Customer Service Guide

## Common Questions:
- What is this product?
  Answer: ${product.name} is a quality product designed for customer needs.
  
- Who is this for?
  Answer: This product is suitable for customers looking for ${product.category || 'this type of solution'}.

## Best Practices:
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
    return {
      questionText: `What is the primary purpose of ${product.name}?`,
      questionType: 'multiple_choice',
      options: [
        { id: 'option_0', text: `To provide quality ${product.category || 'products'} to customers`, isCorrect: true },
        { id: 'option_1', text: 'To generate sales revenue', isCorrect: false },
        { id: 'option_2', text: 'To compete with other brands', isCorrect: false },
        { id: 'option_3', text: 'To expand product line', isCorrect: false },
      ],
      explanation: `The primary purpose is to provide value to customers through quality ${product.category || 'products'}.`,
      points: 1,
      orderIndex,
    };
  }
}
