import { TrendingUp, Users, Shield } from 'lucide-react';

export default function StatsPage() {
  const stats = [
    { icon: TrendingUp, label: "Total Value Locked", value: "$2.5M+" },
    { icon: Users, label: "Active Users", value: "5,000+" },
    { icon: Shield, label: "Security Audits", value: "3" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-600 via-blue-700 to-violet-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Platform Statistics</h1>
        <div className="grid md:grid-cols-3 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white/10 rounded-2xl p-8 text-center backdrop-blur">
              <stat.icon className="w-12 h-12 mx-auto mb-4 text-fuchsia-300" />
              <div className="text-3xl font-bold mb-2">{stat.value}</div>
              <div className="text-fuchsia-100">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
