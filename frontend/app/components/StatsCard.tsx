import { ReactNode } from "react";

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  color: "green" | "yellow" | "blue";
}

const colorClasses = {
  green: "text-neon-green border-neon-green",
  yellow: "text-neon-yellow border-neon-yellow",
  blue: "text-neon-blue border-neon-blue",
};

export function StatsCard({ icon, label, value, color }: StatsCardProps) {
  return (
    <div className={`terminal-window flex items-center space-x-4 border ${colorClasses[color]}`}>
      <div className={`p-3 rounded-full bg-cyber-black border ${colorClasses[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-400 font-mono">{label}</p>
        <p className={`text-2xl font-bold font-mono ${colorClasses[color]}`}>{value}</p>
      </div>
    </div>
  );
}