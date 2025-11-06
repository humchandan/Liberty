export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-600 via-blue-700 to-violet-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Platform Features</h1>
        <div className="space-y-6">
          <div className="bg-white/10 rounded-lg p-6 backdrop-blur">
            <h2 className="text-2xl font-bold mb-3">Stake & Earn</h2>
            <p>Stake your INRT tokens and earn competitive APR rewards.</p>
          </div>
          <div className="bg-white/10 rounded-lg p-6 backdrop-blur">
            <h2 className="text-2xl font-bold mb-3">Refer & Earn</h2>
            <p>Earn up to 15% referral rewards across 15 levels.</p>
          </div>
          <div className="bg-white/10 rounded-lg p-6 backdrop-blur">
            <h2 className="text-2xl font-bold mb-3">Track Progress</h2>
            <p>Monitor your investments and team growth in real-time.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
