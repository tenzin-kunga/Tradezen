'use client';

import { useState } from 'react';
import { getWeeklyReport, downloadCSV as downloadCSVApi } from '../../lib/api';

interface WeeklyReport {
  period: string;
  summary: {
    totalTrades: number;
    totalPnl: number;
    winRate: number;
    profitFactor: number;
    expectancy: number;
  };
  behavioral: {
    fomoScore: number;
    discipline: number;
    consistency: number;
  };
  coaching: {
    message: string;
    severity: string;
  } | null;
  topInsights: string[];
}

export default function ReportsPage() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchWeeklyReport = async () => {
    setLoading(true);
    try {
      const data = await getWeeklyReport();
      setReport(data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = async () => {
    try {
      const blob = await downloadCSVApi();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'trades.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download CSV:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Reports</h1>

        <div className="flex gap-4 mb-8">
          <button
            onClick={fetchWeeklyReport}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Weekly Report'}
          </button>
          <button
            onClick={downloadCSV}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
          >
            Download CSV
          </button>
        </div>

        {report && (
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4">Weekly Summary: {report.period}</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <div className="text-sm text-gray-400">Trades</div>
                  <div className="text-xl font-bold">{report.summary.totalTrades}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">PnL</div>
                  <div className={`text-xl font-bold ${report.summary.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${report.summary.totalPnl.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Win Rate</div>
                  <div className="text-xl font-bold">{report.summary.winRate}%</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Profit Factor</div>
                  <div className="text-xl font-bold">{report.summary.profitFactor}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Expectancy</div>
                  <div className="text-xl font-bold">${report.summary.expectancy.toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4">Behavioral Scores</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-400">FOMO</div>
                  <div className={`text-xl font-bold ${report.behavioral.fomoScore > 70 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {report.behavioral.fomoScore}/100
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Discipline</div>
                  <div className={`text-xl font-bold ${report.behavioral.discipline < 50 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {report.behavioral.discipline}/100
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Consistency</div>
                  <div className={`text-xl font-bold ${report.behavioral.consistency < 60 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {report.behavioral.consistency}/100
                  </div>
                </div>
              </div>
            </div>

            {report.coaching && (
              <div className={`rounded-lg p-6 border ${
                report.coaching.severity === 'critical' ? 'bg-red-900/20 border-red-800' :
                report.coaching.severity === 'medium' ? 'bg-yellow-900/20 border-yellow-800' :
                'bg-gray-900 border-gray-800'
              }`}>
                <h2 className="text-lg font-semibold mb-2">Coaching ({report.coaching.severity})</h2>
                <p className="text-gray-300">{report.coaching.message}</p>
              </div>
            )}

            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4">Key Insights</h2>
              <ul className="space-y-2">
                {report.topInsights.map((insight, i) => (
                  <li key={i} className="text-gray-300">• {insight}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
