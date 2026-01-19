import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db';
import { orders, orderLineItems, posLocations, financialAccounts, inventoryItems, homerConversations } from '@shared/schema';
import { eq, desc, sql, gte, lte, and } from 'drizzle-orm';

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

interface BusinessDataContext {
  revenueByLocation: Array<{ locationName: string; totalRevenue: string; orderCount: number }>;
  revenueByMonth: Array<{ month: string; totalRevenue: string; totalCogs: string; grossMargin: string }>;
  topProducts: Array<{ name: string; revenue: string; quantity: string }>;
  financialSummary: { totalRevenue: string; totalCogs: string; grossProfit: string; marginPercent: string };
  locationDetails: Array<{ id: number; name: string; city: string; state: string }>;
}

interface HomerResponse {
  text: string;
  audioUrl?: string;
  queryType: string;
  dataSourcesUsed: string[];
  tokensUsed?: number;
  responseTimeMs: number;
}

class HomerAIService {
  private anthropic: Anthropic | null = null;

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      console.log('[Homer] AI service initialized with Anthropic');
    } else {
      console.warn('[Homer] ANTHROPIC_API_KEY not configured');
    }
  }

  isAvailable(): boolean {
    return this.anthropic !== null;
  }

  async getBusinessContext(timeframe: 'month' | 'quarter' | 'year' = 'year'): Promise<BusinessDataContext> {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'year':
      default:
        // Include last 12 months of data to ensure we have recent historical context
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    }

    const startDateStr = startDate.toISOString().split('T')[0];

    const revenueByLocationQuery = await db.execute(sql`
      SELECT 
        COALESCE(pl.name, 'Unknown') as location_name,
        SUM(CAST(o.total AS DECIMAL)) as total_revenue,
        COUNT(o.id) as order_count
      FROM orders o
      LEFT JOIN pos_locations pl ON o.location_id = pl.id
      WHERE o.order_date >= ${startDateStr}
      GROUP BY pl.name
      ORDER BY total_revenue DESC
      LIMIT 10
    `);

    const revenueByMonthQuery = await db.execute(sql`
      SELECT 
        TO_CHAR(order_date, 'YYYY-MM') as month,
        SUM(CAST(total AS DECIMAL)) as total_revenue,
        SUM(CAST(order_cogs AS DECIMAL)) as total_cogs,
        SUM(CAST(order_gross_margin AS DECIMAL)) as gross_margin
      FROM orders
      WHERE order_date >= ${startDateStr}
      GROUP BY TO_CHAR(order_date, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `);

    const topProductsQuery = await db.execute(sql`
      SELECT 
        oli.item_name as name,
        SUM(CAST(oli.line_subtotal AS DECIMAL)) as revenue,
        SUM(CAST(oli.quantity AS DECIMAL)) as quantity
      FROM order_line_items oli
      JOIN orders o ON oli.order_id = o.id
      WHERE o.order_date >= ${startDateStr}
      GROUP BY oli.item_name
      ORDER BY revenue DESC
      LIMIT 10
    `);

    const financialSummaryQuery = await db.execute(sql`
      SELECT 
        SUM(CAST(total AS DECIMAL)) as total_revenue,
        SUM(CAST(order_cogs AS DECIMAL)) as total_cogs,
        SUM(CAST(order_gross_margin AS DECIMAL)) as gross_profit
      FROM orders
      WHERE order_date >= ${startDateStr}
    `);

    const locations = await db.select({
      id: posLocations.id,
      name: posLocations.name,
      city: posLocations.city,
      state: posLocations.state,
    }).from(posLocations).where(eq(posLocations.isActive, true));

    const summary = financialSummaryQuery.rows[0] as any || {};
    const totalRevenue = parseFloat(summary.total_revenue || '0');
    const totalCogs = parseFloat(summary.total_cogs || '0');
    const grossProfit = parseFloat(summary.gross_profit || '0');
    const marginPercent = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';

    return {
      revenueByLocation: (revenueByLocationQuery.rows as any[]).map(r => ({
        locationName: r.location_name || 'Unknown',
        totalRevenue: parseFloat(r.total_revenue || '0').toFixed(2),
        orderCount: parseInt(r.order_count || '0'),
      })),
      revenueByMonth: (revenueByMonthQuery.rows as any[]).map(r => ({
        month: r.month,
        totalRevenue: parseFloat(r.total_revenue || '0').toFixed(2),
        totalCogs: parseFloat(r.total_cogs || '0').toFixed(2),
        grossMargin: parseFloat(r.gross_margin || '0').toFixed(2),
      })),
      topProducts: (topProductsQuery.rows as any[]).map(r => ({
        name: r.name,
        revenue: parseFloat(r.revenue || '0').toFixed(2),
        quantity: parseFloat(r.quantity || '0').toFixed(0),
      })),
      financialSummary: {
        totalRevenue: totalRevenue.toFixed(2),
        totalCogs: totalCogs.toFixed(2),
        grossProfit: grossProfit.toFixed(2),
        marginPercent,
      },
      locationDetails: locations.map(l => ({
        id: l.id,
        name: l.name,
        city: l.city || 'Unknown',
        state: l.state || '',
      })),
    };
  }

  detectQueryType(question: string): string {
    const lower = question.toLowerCase();
    
    if (lower.includes('forecast') || lower.includes('predict') || lower.includes('projection')) {
      return 'forecast';
    }
    if (lower.includes('compare') || lower.includes('versus') || lower.includes('vs')) {
      return 'comparison';
    }
    if (lower.includes('profit') || lower.includes('margin') || lower.includes('revenue') || 
        lower.includes('sales') || lower.includes('cost') || lower.includes('cogs')) {
      return 'financial';
    }
    if (lower.includes('inventory') || lower.includes('stock') || lower.includes('product')) {
      return 'inventory';
    }
    if (lower.includes('employee') || lower.includes('staff') || lower.includes('team')) {
      return 'hr';
    }
    
    return 'general';
  }

  async processQuery(
    userId: string,
    sessionId: string,
    question: string,
    inputMethod: 'text' | 'voice' = 'text'
  ): Promise<HomerResponse> {
    const startTime = Date.now();

    if (!this.anthropic) {
      return {
        text: "I apologize, but I'm not fully configured yet. Please ensure the Anthropic API key is set up.",
        queryType: 'error',
        dataSourcesUsed: [],
        responseTimeMs: Date.now() - startTime,
      };
    }

    const queryType = this.detectQueryType(question);
    const dataSourcesUsed: string[] = ['orders', 'locations'];

    const businessContext = await this.getBusinessContext();

    const systemPrompt = `You are Homer, the AI Business Intelligence Assistant for Pine Hill Farm. You have a sophisticated, warm, and supportive personality - like a trusted CFO advisor who genuinely cares about the business's success.

Your role is to:
1. Analyze business data and provide CEO/CFO/CMO-level insights
2. Speak conversationally and naturally, as if having a discussion with the business owner
3. Be specific with numbers but explain their significance
4. Offer actionable recommendations when appropriate
5. Express genuine interest in the business's success

Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

BUSINESS DATA CONTEXT:
======================
FINANCIAL SUMMARY (Last 12 Months):
- Total Revenue: $${businessContext.financialSummary.totalRevenue}
- Total Cost of Goods Sold: $${businessContext.financialSummary.totalCogs}
- Gross Profit: $${businessContext.financialSummary.grossProfit}
- Gross Margin: ${businessContext.financialSummary.marginPercent}%

REVENUE BY LOCATION (Last 12 Months):
${businessContext.revenueByLocation.map(l => `- ${l.locationName}: $${l.totalRevenue} (${l.orderCount} orders)`).join('\n')}

MONTHLY TRENDS (Most Recent First - use this for "last month" questions):
${businessContext.revenueByMonth.slice(0, 12).map(m => `- ${m.month}: Revenue $${m.totalRevenue}, COGS $${m.totalCogs}, Gross Margin $${m.grossMargin}`).join('\n')}

TOP PRODUCTS BY REVENUE:
${businessContext.topProducts.slice(0, 5).map(p => `- ${p.name}: $${p.revenue} (${p.quantity} units)`).join('\n')}

LOCATIONS:
${businessContext.locationDetails.map(l => `- ${l.name} (${l.city}, ${l.state})`).join('\n')}

Guidelines:
- Keep responses conversational and natural (2-4 sentences for simple queries, more detail for complex analysis)
- When mentioning numbers, provide context (e.g., "That's up 15% from last quarter")
- If asked about forecasts, use trend data to make reasonable projections
- End with an engaging follow-up or question when appropriate
- Use the phrase "Looking at the data..." or similar naturally
- Never mention that you're an AI or that this is simulated - speak as a real business advisor`;

    try {
      const message = await this.anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: question,
          },
        ],
      });

      const responseText = message.content[0].type === 'text' 
        ? message.content[0].text 
        : 'I apologize, I had trouble processing that request.';

      const responseTimeMs = Date.now() - startTime;

      await db.insert(homerConversations).values({
        userId,
        sessionId,
        role: 'user',
        content: question,
        inputMethod,
        queryType,
      });

      await db.insert(homerConversations).values({
        userId,
        sessionId,
        role: 'assistant',
        content: responseText,
        queryType,
        dataSourcesUsed,
        tokensUsed: message.usage?.output_tokens,
        responseTimeMs,
      });

      return {
        text: responseText,
        queryType,
        dataSourcesUsed,
        tokensUsed: message.usage?.output_tokens,
        responseTimeMs,
      };

    } catch (error: any) {
      console.error('[Homer] Error processing query:', error);
      return {
        text: "I apologize, but I encountered an issue while analyzing the data. Could you please try rephrasing your question?",
        queryType: 'error',
        dataSourcesUsed: [],
        responseTimeMs: Date.now() - startTime,
      };
    }
  }

  async generateVoiceResponse(text: string): Promise<string | null> {
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    
    if (!elevenLabsKey) {
      console.warn('[Homer] ElevenLabs API key not configured');
      return null;
    }

    const HOMER_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9';

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${HOMER_VOICE_ID}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      });

      if (!response.ok) {
        console.error('[Homer] ElevenLabs error:', response.status, await response.text());
        return null;
      }

      const audioBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      return `data:audio/mpeg;base64,${base64Audio}`;

    } catch (error) {
      console.error('[Homer] Voice generation error:', error);
      return null;
    }
  }

  async getConversationHistory(userId: string, sessionId: string, limit: number = 10) {
    return await db.select()
      .from(homerConversations)
      .where(and(
        eq(homerConversations.userId, userId),
        eq(homerConversations.sessionId, sessionId)
      ))
      .orderBy(desc(homerConversations.createdAt))
      .limit(limit);
  }

  async getRecentSessions(userId: string, limit: number = 5) {
    const sessions = await db.execute(sql`
      SELECT DISTINCT session_id, MIN(created_at) as started_at, 
             (SELECT content FROM homer_conversations hc2 
              WHERE hc2.session_id = hc.session_id AND hc2.role = 'user' 
              ORDER BY created_at LIMIT 1) as first_question
      FROM homer_conversations hc
      WHERE user_id = ${userId}
      GROUP BY session_id
      ORDER BY started_at DESC
      LIMIT ${limit}
    `);

    return sessions.rows;
  }
}

export const homerAIService = new HomerAIService();