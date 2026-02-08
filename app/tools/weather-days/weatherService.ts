import { WeatherDay, WeatherData, Job } from "./types";

const WEATHER_API_BASE = "https://api.weatherapi.com/v1/history.json";

export async function fetchWeatherData(
  apiKey: string,
  job: Job,
  startDate: string,
  endDate: string
): Promise<WeatherData> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days: WeatherDay[] = [];

  // Iterate through each day in the range
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split("T")[0]; // YYYY-MM-DD format

    try {
      const response = await fetch(
        `${WEATHER_API_BASE}?key=${apiKey}&q=${job.zipCode}&dt=${dateStr}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch weather for ${dateStr}: ${response.statusText}`);
      }

      const data = await response.json();

      // Extract the day data
      const dayData = data.forecast.forecastday[0].day;

      days.push({
        date: dateStr,
        highTemp: dayData.maxtemp_f,
        lowTemp: dayData.mintemp_f,
        precipitation: dayData.totalprecip_in,
        condition: dayData.condition.text,
      });
    } catch (error) {
      console.error(`Error fetching weather for ${dateStr}:`, error);
      throw error;
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    jobId: job.id,
    jobTitle: job.title,
    zipCode: job.zipCode,
    startDate,
    endDate,
    days,
  };
}

export function formatWeatherEmail(weatherData: WeatherData): string {
  let email = `Weather Report for ${weatherData.jobTitle}\n`;
  email += `Zip Code: ${weatherData.zipCode}\n`;
  email += `Date Range: ${new Date(weatherData.startDate).toLocaleDateString()} - ${new Date(weatherData.endDate).toLocaleDateString()}\n\n`;

  email += `Date       | High | Low  | Precip (in) | Condition\n`;
  email += `${"-".repeat(11)}|${"-".repeat(6)}|${"-".repeat(6)}|${"-".repeat(13)}|${"-".repeat(20)}\n`;

  weatherData.days.forEach((day) => {
    const dateFormatted = new Date(day.date).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
    const datePadded = dateFormatted.padEnd(10);
    const highPadded = `${day.highTemp.toFixed(0)}°F`.padStart(5);
    const lowPadded = `${day.lowTemp.toFixed(0)}°F`.padStart(5);
    const precipPadded = day.precipitation.toFixed(2).padStart(12);
    const condition = day.condition.padEnd(19);

    email += `${datePadded} | ${highPadded} | ${lowPadded} | ${precipPadded} | ${condition}\n`;
  });

  return email;
}
