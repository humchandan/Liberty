'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ContractService } from '@/lib/contracts';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  AlertTriangle,
  Download,
  RefreshCw
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface AnalyticsData {
  overview: {
    totalValueLocked: string;
    totalUsers: number;
    activeUsers: number;
    totalInvestments: number;
    activeInvestments: number;
    healthScore: number;
    healthStatus: string;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    newSignups: number;
    growthData: any[];
  };
  investments: {
    total: number;
    active: number;
    matured: number;
    paid: number;
    averageSize: string;
    byToken: any[];
    volumeData: any[];
  };
  payouts: {
    pending: number;
    pendingValue: string;
    overdue: number;
  };
  referrals: {
    totalEarnings: string;
    claimed: string;
    pending: string;
    topReferrers: any[];
  };
  epochs: {
    current: number;
    history: any[];
  };
}

interface ContractData {
  treasury: string;
  totalStaked: string;
  apr: number;
  maturity: number;
  isPaused: boolean;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function AnalyticsDashboardPage() {
  const { user, token } = useAuth();
  const { address } = useAccount();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [timeRange, setTimeRange] = useState(30);
  const [exporting, setExporting] = useState(false);

  const isAdmin = user?.walletAddress?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchAnalytics();
    fetchContractData();

    const interval = setInterval(() => {
      fetchAnalytics();
      fetchContractData();
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAdmin, token, timeRange]);

  const fetchAnalytics = async () => {
    if (!token) return;
    
    setRefreshing(true);
    try {
      const res = await fetch(`/api/v1/admin/analytics?days=${timeRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const fetchContractData = async () => {
    if (!window.ethereum || !address) return;

    try {
      const contractService = new ContractService(window.ethereum);
      const stakingContract = contractService.getStakingContract();
      const stats = await contractService.getPlatformStats();

      const [apr, maturity, paused] = await Promise.all([
        stakingContract.currentAPR(),
        stakingContract.currentMaturityDuration(),
        stakingContract.stakingPaused()
      ]);

      setContractData({
        treasury: stats.treasury,
        totalStaked: stats.totalStaked,
        apr: apr.toNumber() / 100,
        maturity: maturity.toNumber() / 86400,
        isPaused: paused
      });
    } catch (error) {
      console.error('Failed to fetch contract data:', error);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const element = document.getElementById('analytics-dashboard');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      pdf.save(`analytics-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = () => {
    if (!analytics) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Users', analytics.overview.totalUsers],
      ['Active Users', analytics.overview.activeUsers],
      ['Total Value Locked', analytics.overview.totalValueLocked],
      ['Total Investments', analytics.overview.totalInvestments],
      ['Active Investments', analytics.overview.activeInvestments],
      ['Health Score', analytics.overview.healthScore],
      ['Pending Payouts', analytics.payouts.pending],
      ['Overdue Payouts', analytics.payouts.overdue]
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (!isAdmin) return null;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!analytics) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">No analytics data available</p>
        </div>
      </DashboardLayout>
    );
  }

  const healthScore = analytics.overview.healthScore;
  const healthColor = healthScore >= 80 ? 'text-green-600' : 
                     healthScore >= 60 ? 'text-yellow-600' : 'text-red-600';

  const healthBg = healthScore >= 80 ? 'bg-green-50' : 
                   healthScore >= 60 ? 'bg-yellow-50' : 'bg-red-50';

  const userGrowthData = analytics.users.growthData.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    users: parseInt(item.count)
  }));

  const volumeData = analytics.investments.volumeData.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    volume: parseFloat(item.volume),
    count: parseInt(item.count)
  }));

  const investmentStatusData = [
    { name: 'Active', value: analytics.investments.active },
    { name: 'Matured', value: analytics.investments.matured },
    { name: 'Paid', value: analytics.investments.paid }
  ];

  const userStatusData = [
    { name: 'Active', value: analytics.users.active },
    { name: 'Inactive', value: analytics.users.inactive }
  ];

  const tokenData = analytics.investments.byToken.map((item: any) => ({
    name: item.tokenSymbol,
    value: parseFloat(item._sum.amount || 0),
    count: item._count
  }));

  return (
    <DashboardLayout>
      <div id="analytics-dashboard">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600">Platform performance and health metrics</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(parseInt(e.target.value))}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={180}>Last 6 months</option>
              </select>

              <button
                onClick={() => {
                  fetchAnalytics();
                  fetchContractData();
                }}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>

              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                <Download size={16} />
                CSV
              </button>

              <button
                onClick={exportToPDF}
                disabled={exporting}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                <Download size={16} />
                {exporting ? 'Exporting...' : 'PDF'}
              </button>
            </div>
          </div>
        </div>

        {/* Risk Alerts */}
        {(analytics.payouts.overdue > 0 || healthScore < 70 || contractData?.isPaused) && (
          <div className="mb-6 space-y-3">
            {contractData?.isPaused && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="text-red-600 shrink-0" size={20} />
                <div>
                  <p className="font-bold text-red-900">Platform Paused</p>
                  <p className="text-sm text-red-700">Staking is currently paused. New investments cannot be created.</p>
                </div>
              </div>
            )}

            {analytics.payouts.overdue > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="text-yellow-600 shrink-0" size={20} />
                <div>
                  <p className="font-bold text-yellow-900">Overdue Payouts</p>
                  <p className="text-sm text-yellow-700">
                    {analytics.payouts.overdue} payout(s) are overdue by more than 7 days.
                  </p>
                </div>
              </div>
            )}

            {healthScore < 70 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="text-orange-600 shrink-0" size={20} />
                <div>
                  <p className="font-bold text-orange-900">Platform Health Warning</p>
                  <p className="text-sm text-orange-700">
                    Health score is {healthScore}/100. Action may be required.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Overview Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 sm:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm opacity-90">Total Value Locked</h3>
              <DollarSign size={20} />
            </div>
            <p className="text-2xl sm:text-3xl font-bold">
              {parseFloat(analytics.overview.totalValueLocked).toFixed(2)}
            </p>
            <p className="text-xs sm:text-sm opacity-90 mt-1">INRT</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 sm:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm opacity-90">Total Users</h3>
              <Users size={20} />
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{analytics.overview.totalUsers}</p>
            <p className="text-xs sm:text-sm opacity-90 mt-1">
              {analytics.overview.activeUsers} active
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 sm:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm opacity-90">Investments</h3>
              <TrendingUp size={20} />
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{analytics.overview.activeInvestments}</p>
            <p className="text-xs sm:text-sm opacity-90 mt-1">
              of {analytics.overview.totalInvestments} total
            </p>
          </div>

          <div className={`${healthBg} rounded-lg p-4 sm:p-6`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm opacity-90">Health Score</h3>
              <Activity size={20} className={healthColor} />
            </div>
            <p className={`text-2xl sm:text-3xl font-bold ${healthColor}`}>
              {healthScore}
            </p>
            <p className={`text-xs sm:text-sm ${healthColor} mt-1`}>
              {analytics.overview.healthStatus}
            </p>
          </div>
        </div>

        {/* Contract Health Metrics */}
        {contractData && (
          <div className="bg-white rounded-lg border p-4 sm:p-6 mb-6">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Smart Contract Health</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Treasury Balance</p>
                <p className="text-lg sm:text-xl font-bold">{parseFloat(contractData.treasury).toFixed(2)} INRT</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Total Staked</p>
                <p className="text-lg sm:text-xl font-bold">{parseFloat(contractData.totalStaked).toFixed(2)} INRT</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Current APR</p>
                <p className="text-lg sm:text-xl font-bold">{contractData.apr}%</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Maturity</p>
                <p className="text-lg sm:text-xl font-bold">{contractData.maturity} days</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Solvency Ratio (Treasury / Staked)</span>
                <span className="font-bold">
                  {((parseFloat(contractData.treasury) / parseFloat(contractData.totalStaked)) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    (parseFloat(contractData.treasury) / parseFloat(contractData.totalStaked)) >= 1.1
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      ((parseFloat(contractData.treasury) / parseFloat(contractData.totalStaked)) * 100),
                      100
                    )}%`
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {(parseFloat(contractData.treasury) / parseFloat(contractData.totalStaked)) >= 1.1
                  ? '✅ Treasury is healthy (>110% coverage)'
                  : '⚠️ Warning: Treasury below recommended threshold'}
              </p>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg border p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold mb-4">User Growth</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="users" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg border p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Staking Volume</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="volume" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg border p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Investment Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={investmentStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {investmentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg border p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold mb-4">User Activity</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Token Distribution & Top Referrers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg border p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Token Distribution</h2>
            {tokenData.length > 0 ? (
              <div className="space-y-3">
                {tokenData.map((token: any, index: number) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{token.name}</p>
                      <p className="text-sm text-gray-600">{token.count} investments</p>
                    </div>
                    <p className="text-lg font-bold">{token.value.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No token data available</p>
            )}
          </div>

          <div className="bg-white rounded-lg border p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Top Referrers</h2>
            {analytics.referrals.topReferrers.length > 0 ? (
              <div className="space-y-3">
                {analytics.referrals.topReferrers.slice(0, 5).map((referrer: any, index: number) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{referrer.fullName}</p>
                      <p className="text-sm text-gray-600 font-mono text-xs truncate">
                        {referrer.walletAddress.slice(0, 8)}...{referrer.walletAddress.slice(-6)}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-bold text-green-600">{parseFloat(referrer.totalEarnings).toFixed(2)}</p>
                      <p className="text-xs text-gray-600">{referrer.totalReferrals} refs</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No referral data available</p>
            )}
          </div>
        </div>

        {/* Payout & Referral Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-600 mb-1">Pending Payouts</p>
            <p className="text-2xl font-bold">{analytics.payouts.pending}</p>
            <p className="text-xs text-gray-600 mt-1">
              {parseFloat(analytics.payouts.pendingValue).toFixed(2)} INRT
            </p>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-600 mb-1">Overdue Payouts</p>
            <p className="text-2xl font-bold text-red-600">{analytics.payouts.overdue}</p>
            <p className="text-xs text-red-600 mt-1">Requires attention</p>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-600 mb-1">Total Referral Earnings</p>
            <p className="text-2xl font-bold">
              {parseFloat(analytics.referrals.totalEarnings).toFixed(2)}
            </p>
            <p className="text-xs text-gray-600 mt-1">INRT</p>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-600 mb-1">Pending Rewards</p>
            <p className="text-2xl font-bold text-orange-600">
              {parseFloat(analytics.referrals.pending).toFixed(2)}
            </p>
            <p className="text-xs text-gray-600 mt-1">INRT</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
