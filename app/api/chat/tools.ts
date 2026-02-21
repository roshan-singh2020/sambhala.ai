import { tool } from 'ai';
import { z } from 'zod';

const DEFAULTS = {
  NEWS_COUNT: 3,
  TIMEZONE: 'UTC',
} as const;

// 1. WEATHER TOOL
export const weatherTool = tool({
  description: 'Get current real-time weather for any city worldwide',
  parameters: z.object({
    city: z.string().describe('City name (e.g., Kathmandu, Tokyo, New York)'),
  }),
  execute: async ({ city }): Promise<string> => {
    try {
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (!apiKey) {
        return 'Weather API key not configured.';
      }

      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
      );

      if (!res.ok) throw new Error('City not found');

      const data = await res.json();
      return `${data.name}, ${data.sys.country}: ${Math.round(data.main.temp)}°C (feels like ${Math.round(data.main.feels_like)}°C), ${data.weather[0].description}. Humidity: ${data.main.humidity}%, Wind: ${data.wind.speed} m/s`;
    } catch (error) {
      return `Couldn't fetch weather for "${city}". Please check the city name.`;
    }
  },
});

// 2. TIME TOOL
export const timeTool = tool({
  description: 'Get current date and time for any timezone or city',
  parameters: z.object({
    timezone: z.string().optional().describe('Timezone (e.g., Asia/Kathmandu, America/New_York). Leave empty for local time.'),
  }),
  execute: async ({ timezone }): Promise<string> => {
    try {
      const tz = timezone || DEFAULTS.TIMEZONE;
      const now = new Date();

      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      });

      return `${formatter.format(now)} (${tz})`;
    } catch (error) {
      return 'Invalid timezone. Examples: Asia/Kathmandu, America/New_York, Europe/London';
    }
  },
});

// 3. CURRENCY TOOL
export const currencyTool = tool({
  description: 'Convert currency with real-time exchange rates',
  parameters: z.object({
    amount: z.number().describe('Amount to convert'),
    from: z.string().describe('Source currency code (e.g., USD, EUR, NPR)'),
    to: z.string().describe('Target currency code (e.g., NPR, USD, INR)'),
  }),
  execute: async ({ amount, from, to }): Promise<string> => {
    try {
      const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${from.toUpperCase()}`);
      const data = await res.json();
      const rate = data.rates[to.toUpperCase()];

      if (!rate) throw new Error('Currency not found');

      const converted = (amount * rate).toFixed(2);
      return `${amount} ${from.toUpperCase()} = ${converted} ${to.toUpperCase()} (Rate: 1 ${from.toUpperCase()} = ${rate} ${to.toUpperCase()})`;
    } catch (error) {
      return "Couldn't fetch exchange rate. Try: USD, EUR, GBP, INR, NPR, JPY";
    }
  },
});

// 4. NEWS TOOL
interface NewsArticle {
  title: string;
  publishedAt: string;
}

export const newsTool = tool({
  description: 'Get latest news headlines on any topic',
  parameters: z.object({
    topic: z.string().describe('News topic or keyword (e.g., AI, technology, Nepal, stocks)'),
    count: z.number().optional().describe('Number of headlines (1-5)').default(DEFAULTS.NEWS_COUNT),
  }),
  execute: async ({ topic, count }): Promise<string> => {
    try {
      const apiKey = process.env.NEWS_API_KEY;
      if (!apiKey) {
        return 'News API key not configured.';
      }

      const articleCount = Math.min(Math.max(count || DEFAULTS.NEWS_COUNT, 1), 5);
      const res = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&sortBy=publishedAt&pageSize=${articleCount}&apiKey=${apiKey}`
      );

      const data = await res.json();

      if (!data.articles?.length) {
        return `No recent news found for "${topic}".`;
      }

      const headlines = data.articles
        .map((a: NewsArticle, i: number) => `${i + 1}. ${a.title} (${new Date(a.publishedAt).toLocaleDateString()})`)
        .join('\n');

      return `Latest news on "${topic}":\n${headlines}`;
    } catch (error) {
      return 'News service temporarily unavailable.';
    }
  },
});

// 5. STOCK TOOL
interface StockChart {
  chart?: {
    result?: Array<{
      meta: {
        regularMarketPrice: number;
        regularMarketChange: number;
        regularMarketChangePercent: number;
      };
    }>;
  };
}

export const stockTool = tool({
  description: 'Get real-time stock/crypto prices',
  parameters: z.object({
    symbol: z.string().describe('Stock symbol (e.g., AAPL, TSLA, GOOGL, BTCUSD)'),
  }),
  execute: async ({ symbol }): Promise<string> => {
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}`);
      const data: StockChart = await res.json();

      if (!data.chart?.result?.[0]) {
        return `Stock "${symbol}" not found. Try: AAPL, MSFT, GOOGL, TSLA, AMZN`;
      }

      const meta = data.chart.result[0].meta;
      const price = meta.regularMarketPrice;
      const change = meta.regularMarketChange;
      const changePercent = meta.regularMarketChangePercent;

      const sign = change >= 0 ? '+' : '';

      return `${symbol.toUpperCase()}: $${price.toFixed(2)} (${sign}${change.toFixed(2)}, ${changePercent.toFixed(2)}%)`;
    } catch (error) {
      return "Couldn't fetch stock data.";
    }
  },
});

// 6. LOCATION TOOL
interface LocationData {
  city: string;
  region: string;
  country_name: string;
  country_code: string;
  ip: string;
  timezone: string;
  currency: string;
}

export const locationTool = tool({
  description: 'Get user location details based on IP (no parameters needed)',
  parameters: z.object({}),
  execute: async (): Promise<string> => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data: LocationData = await res.json();

      return `Location: ${data.city}, ${data.region}, ${data.country_name} (${data.country_code})\nIP: ${data.ip}\nTimezone: ${data.timezone}\nCurrency: ${data.currency}`;
    } catch (error) {
      return "Couldn't detect location.";
    }
  },
});

// 7. CALCULATOR TOOL
export const calculatorTool = tool({
  description: 'Perform mathematical calculations',
  parameters: z.object({
    expression: z.string().describe('Math expression (e.g., 2+2, sqrt(16), 10*5)'),
  }),
  execute: async ({ expression }): Promise<string> => {
    try {
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
      const result = new Function('return ' + sanitized)();
      return `${expression} = ${result}`;
    } catch (error) {
      return 'Invalid expression. Use: +, -, *, /, sqrt(), parentheses';
    }
  },
});

// EXPORT ALL TOOLS
export const tools = {
  getWeather: weatherTool,
  getTime: timeTool,
  convertCurrency: currencyTool,
  getNews: newsTool,
  getStockPrice: stockTool,
  getLocation: locationTool,
  calculate: calculatorTool,
};
