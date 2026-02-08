"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Job, WeatherData } from "./types";
import { fetchWeatherData, formatWeatherEmail } from "./weatherService";

export default function WeatherDays() {
  const [apiKey, setApiKey] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobZipCode, setNewJobZipCode] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load API key and jobs from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem("weatherApiKey");
    if (savedApiKey) setApiKey(savedApiKey);

    const savedJobs = localStorage.getItem("weatherJobs");
    if (savedJobs) setJobs(JSON.parse(savedJobs));
  }, []);

  // Save API key to localStorage
  const handleSaveApiKey = () => {
    localStorage.setItem("weatherApiKey", apiKey);
  };

  // Save jobs to localStorage
  const saveJobs = (updatedJobs: Job[]) => {
    setJobs(updatedJobs);
    localStorage.setItem("weatherJobs", JSON.stringify(updatedJobs));
  };

  // Create new job
  const handleCreateJob = () => {
    if (!newJobTitle || !newJobZipCode) {
      setError("Please enter both job title and zip code");
      return;
    }

    const newJob: Job = {
      id: Date.now().toString(),
      title: newJobTitle,
      zipCode: newJobZipCode,
      createdAt: new Date().toISOString(),
    };

    saveJobs([...jobs, newJob]);
    setNewJobTitle("");
    setNewJobZipCode("");
    setError(null);
  };

  // Delete job
  const handleDeleteJob = (jobId: string) => {
    saveJobs(jobs.filter((j) => j.id !== jobId));
    if (selectedJob?.id === jobId) {
      setSelectedJob(null);
      setWeatherData(null);
    }
  };

  // Fetch weather data
  const handleFetchWeather = async () => {
    if (!apiKey) {
      setError("Please enter your WeatherAPI.com API key");
      return;
    }

    if (!selectedJob) {
      setError("Please select a job");
      return;
    }

    if (!startDate || !endDate) {
      setError("Please enter both start and end dates");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchWeatherData(apiKey, selectedJob, startDate, endDate);
      setWeatherData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch weather data");
    } finally {
      setLoading(false);
    }
  };

  // Copy email to clipboard
  const handleCopyEmail = () => {
    if (!weatherData) return;
    const emailBody = formatWeatherEmail(weatherData);
    navigator.clipboard.writeText(emailBody);
  };

  return (
    <main className="min-h-screen p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 text-sm mb-4"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Weather Days for Job Sites
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Track historical weather data for your job sites
          </p>
        </div>

        {/* API Key Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold mb-4">WeatherAPI.com API Key</h2>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your WeatherAPI.com API key"
              className="flex-1 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSaveApiKey}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Save Key
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Get your free API key at{" "}
            <a
              href="https://www.weatherapi.com/signup.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              weatherapi.com
            </a>
          </p>
        </div>

        {/* Job Management Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold mb-4">Create New Job</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newJobTitle}
              onChange={(e) => setNewJobTitle(e.target.value)}
              placeholder="Job Title (e.g., Main St Construction)"
              className="flex-1 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              value={newJobZipCode}
              onChange={(e) => setNewJobZipCode(e.target.value)}
              placeholder="Zip Code"
              className="w-32 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleCreateJob}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              ➕ Create Job
            </button>
          </div>

          {/* Jobs List */}
          {jobs.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold mb-2">Your Jobs:</h3>
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedJob?.id === job.id
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                      : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                  onClick={() => setSelectedJob(job)}
                >
                  <div>
                    <div className="font-semibold">{job.title}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Zip: {job.zipCode}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteJob(job.id);
                    }}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-3 py-1"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weather Fetch Section */}
        {selectedJob && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6 border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold mb-4">
              Fetch Weather for: {selectedJob.title}
            </h2>
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleFetchWeather}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Loading..." : "🌤️ Fetch Weather"}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Weather Data Display */}
        {weatherData && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold">Weather Report</h2>
              <button
                onClick={handleCopyEmail}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                📋 Copy Email
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <strong>Job:</strong> {weatherData.jobTitle}
                  <br />
                  <strong>Zip Code:</strong> {weatherData.zipCode}
                  <br />
                  <strong>Date Range:</strong>{" "}
                  {new Date(weatherData.startDate).toLocaleDateString()} -{" "}
                  {new Date(weatherData.endDate).toLocaleDateString()}
                  <br />
                  <strong>Total Days:</strong> {weatherData.days.length}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-sm whitespace-pre-wrap overflow-x-auto">
                {formatWeatherEmail(weatherData)}
              </div>

              {/* Detailed Weather Cards */}
              <div className="mt-6">
                <h3 className="text-lg font-bold mb-3">Daily Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {weatherData.days.map((day, index) => (
                    <div
                      key={index}
                      className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div className="font-semibold text-lg mb-2">
                        {new Date(day.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 space-y-1">
                        <div className="flex justify-between">
                          <span>High:</span>
                          <span className="font-semibold text-red-600 dark:text-red-400">
                            {day.highTemp.toFixed(0)}°F
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Low:</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {day.lowTemp.toFixed(0)}°F
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Precip:</span>
                          <span className="font-semibold">
                            {day.precipitation.toFixed(2)}"
                          </span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-sm">
                          {day.condition}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
