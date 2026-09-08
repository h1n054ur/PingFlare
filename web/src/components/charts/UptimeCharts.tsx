import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export function UptimeBarChart({ data }: { data: Array<{ date: string; color: string; uptime: number }> }) {
  const chartData = {
    labels: data.map((d) => d.date.slice(5)),
    datasets: [
      {
        label: "Uptime",
        data: data.map((d) => d.uptime),
        backgroundColor: data.map((d) => d.color),
        borderRadius: 2,
        barPercentage: 1,
        categoryPercentage: 0.9,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.parsed.y.toFixed(2)}% uptime`,
        } as any,
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
      y: { min: 90, max: 100, grid: { color: "rgba(0,0,0,0.05)" }, ticks: { callback: (v: any) => `${v}%` } },
    },
  };

  return (
    <div style={{ height: "180px" }}>
      <Bar data={chartData} options={options as any} />
    </div>
  );
}

export function LatencyLineChart({ data }: { data: Array<{ date: string; avg_response_time: number }> }) {
  const chartData = {
    labels: data.map((d) => d.date.slice(5)),
    datasets: [
      {
        label: "Response Time (ms)",
        data: data.map((d) => d.avg_response_time),
        borderColor: "#228be6",
        backgroundColor: "rgba(34, 139, 230, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
      y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" } },
    },
  };

  return (
    <div style={{ height: "180px" }}>
      <Line data={chartData} options={options as any} />
    </div>
  );
}
