export interface Job {
  id: string;
  title: string;
  zipCode: string;
  createdAt: string;
}

export interface WeatherDay {
  date: string;
  highTemp: number;
  lowTemp: number;
  precipitation: number;
  condition: string;
}

export interface WeatherData {
  jobId: string;
  jobTitle: string;
  zipCode: string;
  startDate: string;
  endDate: string;
  days: WeatherDay[];
}
