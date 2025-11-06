'use client';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import Link from 'next/link';

const roadmapItems = [
  {
    phase: "Phase 1",
    title: "Initial DEX Testnet Deployed",
    description: "Alpha release of DEX, DeFi protocol development, Core Team formation, Smart contract architecture design",
    date: "Jan 2024",
    status: "completed",
    color: "fuchsia",
  },
  {
    phase: "Phase 2",
    title: "Relaunching On Arbitrum",
    description: "DEX release on Arbitrum Testnet, DAO formation, Commodity Lending Engine design, Community building initiatives",
    date: "Aug 2024",
    status: "completed",
    color: "blue",
  },
  {
    phase: "Phase 3",
    title: "Microfunding Engine Launch",
    description: "Launch and security audit of Microfunding Engine, Partner integrations, Enhanced staking rewards",
    date: "Q4 2024",
    status: "in-progress",
    color: "violet",
  },
  {
    phase: "Phase 4",
    title: "Multi-Chain Expansion",
    description: "Cross-chain bridge implementation, Support for additional networks, Advanced analytics dashboard",
    date: "Q1 2025",
    status: "upcoming",
    color: "purple",
  },
  {
    phase: "Phase 5",
    title: "Governance & DAO",
    description: "Full DAO governance implementation, Community voting mechanisms, Treasury management tools",
    date: "Q2 2025",
    status: "upcoming",
    color: "indigo",
  },
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-5 h-5" />;
    case 'in-progress':
      return <Clock className="w-5 h-5" />;
    case 'upcoming':
      return <Sparkles className="w-5 h-5" />;
    default:
      return <Calendar className="w-5 h-5" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-500';
    case 'in-progress':
      return 'bg-yellow-500';
    case 'upcoming':
      return 'bg-blue-500';
    default:
      return 'bg-gray-500';
  }
};

const getColorClasses = (color: string) => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    fuchsia: { bg: 'bg-fuchsia-500', text: 'text-fuchsia-300', border: 'border-fuchsia-500' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-300', border: 'border-blue-500' },
    violet: { bg: 'bg-violet-500', text: 'text-violet-300', border: 'border-violet-500' },
    purple: { bg: 'bg-purple-500', text: 'text-purple-300', border: 'border-purple-500' },
    indigo: { bg: 'bg-indigo-500', text: 'text-indigo-300', border: 'border-indigo-500' },
  };
  return colors[color] || colors.fuchsia;
};

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-600 via-blue-700 to-violet-900 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold hover:text-fuchsia-300 transition">
            ← Liberty Staking
          </Link>
          <Link href="/dashboard" className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition">
            Dashboard
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="py-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
            Project Roadmap
          </h1>
          <p className="text-xl text-fuchsia-100 max-w-2xl mx-auto">
            Follow our journey as we build the future of DeFi staking and lending
          </p>
        </motion.div>
      </div>

      {/* Roadmap Timeline */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-fuchsia-500 via-blue-500 to-violet-500"></div>

          {/* Timeline Items */}
          <div className="space-y-12">
            {roadmapItems.map((item, index) => {
              const colors = getColorClasses(item.color);
              return (
                <motion.div
                  key={item.phase}
                  initial={{ opacity: 0, x: -60 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                  viewport={{ once: true }}
                  className="relative pl-20"
                >
                  {/* Timeline Dot */}
                  <div className={`absolute left-[22px] w-8 h-8 ${colors.bg} rounded-full ring-4 ring-white shadow-lg flex items-center justify-center`}>
                    {getStatusIcon(item.status)}
                  </div>

                  {/* Content Card */}
                  <div className={`bg-white/10 backdrop-blur rounded-xl p-6 border-l-4 ${colors.border} hover:bg-white/15 transition`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-sm font-semibold text-fuchsia-200">{item.phase}</span>
                        <h3 className="text-2xl font-bold mt-1">{item.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.status)} text-white`}>
                          {item.status === 'completed' && 'Completed'}
                          {item.status === 'in-progress' && 'In Progress'}
                          {item.status === 'upcoming' && 'Upcoming'}
                        </span>
                      </div>
                    </div>
                    <p className="text-fuchsia-100 mb-3">{item.description}</p>
                    <div className="flex items-center gap-2 text-sm text-fuchsia-200">
                      <Calendar size={16} />
                      <span>{item.date}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mt-16 bg-gradient-to-r from-fuchsia-600/30 to-blue-600/30 backdrop-blur rounded-2xl p-8 text-center border border-white/10"
        >
          <h2 className="text-2xl font-bold mb-3">Want to be part of our journey?</h2>
          <p className="text-fuchsia-100 mb-6">Join our community and stay updated on all developments</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Start Staking
            </Link>
            <a
              href="https://twitter.com/libertyfinance"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-white/10 rounded-lg hover:bg-white/20 transition font-semibold"
            >
              Follow Us
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
