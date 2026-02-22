import { tool } from 'ai';
import { z } from 'zod';

// Helper: Convert city name → lat/lon using Open-Meteo Geocoding API (free, no key)
async function geocodeCity(city: string): Promise<{ lat: number; lon: number; name: string; country: string } | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  const result = data.results[0];
  return { lat: result.latitude, lon: result.longitude, name: result.name, country: result.country };
}

// WMO Weather Condition Codes → human-readable strings
function interpretWeatherCode(code: number): string {
  const codes: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight showers', 81: 'Moderate showers', 82: 'Violent showers',
    85: 'Slight snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
  };
  return codes[code] ?? 'Unknown';
}

export const weatherTool = tool({
  description: 'Get the current real-time weather for a given city using Open-Meteo (free, no API key required)',
  parameters: z.object({
    city: z.string().describe('The city to get weather for'),
  }),
  execute: async ({ city }) => {
    // Step 1: Geocode the city
    const location = await geocodeCity(city);
    if (!location) {
      return { error: `Could not find location for "${city}". Please try a different city name.` };
    }

    // Step 2: Fetch real-time weather from Open-Meteo
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation&wind_speed_unit=kmh&timezone=auto`;
    const res = await fetch(weatherUrl);
    if (!res.ok) {
      return { error: 'Failed to fetch weather data. Please try again.' };
    }

    const data = await res.json();
    const current = data.current;

    return {
      city: `${location.name}, ${location.country}`,
      temperature: `${current.temperature_2m}°C`,
      feelsLike: `${current.apparent_temperature}°C`,
      condition: interpretWeatherCode(current.weather_code),
      humidity: `${current.relative_humidity_2m}%`,
      windSpeed: `${current.wind_speed_10m} km/h`,
      windDirection: `${current.wind_direction_10m}°`,
      precipitation: `${current.precipitation} mm`,
      timezone: data.timezone,
      observedAt: current.time,
    };
  },
});

export const timeTool = tool({
  description: 'Get the current real-time date and time for any city or timezone in the world',
  parameters: z.object({
    city: z.string().describe('The city or timezone to get the current time for (e.g. "Kathmandu", "New York", "London")'),
  }),
  execute: async ({ city }) => {
    // Use geocoding to get the timezone for the city
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) return { error: 'Failed to geocode city.' };
    const geoData = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) {
      return { error: `Could not find timezone for "${city}". Please try a different city name.` };
    }

    const { latitude, longitude, name, country, timezone } = geoData.results[0];

    // Use Open-Meteo to get the current time in that timezone (timezone is returned by geocoding)
    const timeUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&timezone=auto`;
    const timeRes = await fetch(timeUrl);
    if (!timeRes.ok) return { error: 'Failed to fetch time data.' };
    const timeData = await timeRes.json();

    // timeData.current.time is the local ISO time string in that timezone
    const localTimeStr = timeData.current.time; // e.g. "2025-02-22T14:30"
    const utcOffset = timeData.utc_offset_seconds;
    const offsetHours = Math.floor(Math.abs(utcOffset) / 3600);
    const offsetMinutes = Math.floor((Math.abs(utcOffset) % 3600) / 60);
    const offsetSign = utcOffset >= 0 ? '+' : '-';
    const utcOffsetStr = `UTC${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

    // Format the local time nicely
    const localDate = new Date(localTimeStr);
    const formatted = localTimeStr.replace('T', ' '); // "2025-02-22 14:30"

    return {
      city: `${name}, ${country}`,
      timezone: timeData.timezone,
      utcOffset: utcOffsetStr,
      currentTime: formatted,
    };
  },
});

// Add more tools here and export them in the toolSet below

export const tools = {
  getWeather: weatherTool,
  getTime: timeTool,
};