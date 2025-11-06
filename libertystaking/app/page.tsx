'use client';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignMessage } from 'wagmi';
import { useEffect, useState } from 'react';
import { ArrowRight, Menu, X, TrendingUp, Users, Shield } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function LandingPage() {
  const { isAuthenticated, setAuthData, isLoading: authLoading } = useAuth();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleLogin = async () => {
    if (!address || !isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    try {
      const nonceRes = await fetch('/api/v1/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });
      
      const nonceData = await nonceRes.json();
      if (!nonceData.success) throw new Error('Failed to get nonce');

      const signature = await signMessageAsync({ message: nonceData.nonce });

      const verifyRes = await fetch('/api/v1/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, signature, nonce: nonceData.nonce }),
      });

      const verifyData = await verifyRes.json();

      if (verifyData.success && !verifyData.user.isNewUser) {
        const profileRes = await fetch('/api/v1/users/profile', {
          headers: { 'Authorization': `Bearer ${verifyData.token}` },
        });
        
        const profileData = await profileRes.json();
        
        if (profileData.success) {
          setAuthData(profileData.user, verifyData.token);
          router.push('/dashboard');
        }
      } else if (verifyData.user?.isNewUser) {
        alert('New user detected! Please complete signup.');
        router.push('/signup');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      alert(`Login failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d4ff] mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0e27] text-white">      
      {/* Navbar - LibFi Style */}
      <motion.nav
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.15, type: "spring", stiffness: 80 }}
        className="w-full fixed left-0 top-0 z-30 bg-[#0f1435]/95 backdrop-blur-xl border-b border-white/5 shadow-xl"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <span 
            className="font-extrabold text-xl sm:text-2xl tracking-tight bg-gradient-to-r from-[#00d4ff] to-[#0084ff] bg-clip-text text-transparent"
            style={{ fontFamily: 'Paytone One, cursive' }}
          >
            Liberty Staking
          </span>
          
          <nav className="hidden md:flex space-x-6 text-gray-300 font-medium ml-auto mr-0">
            <a href="#features" className="hover:text-[#00d4ff] transition">Features</a>
            <a href="#stats" className="hover:text-[#00d4ff] transition">Stats</a>
            <a href="#roadmap" className="hover:text-[#00d4ff] transition">Roadmap</a>
            <a href="#team" className="hover:text-[#00d4ff] transition">Team</a>
            <a href="#faq" className="hover:text-[#00d4ff] transition">FAQ</a>
          </nav>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white p-2"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#0f1435]/95 border-t border-white/5"
          >
            <nav className="flex flex-col space-y-2 px-4 py-4 font-medium text-gray-300">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="hover:text-[#00d4ff] transition py-2">Features</a>
              <a href="#stats" onClick={() => setMobileMenuOpen(false)} className="hover:text-[#00d4ff] transition py-2">Stats</a>
              <a href="#roadmap" onClick={() => setMobileMenuOpen(false)} className="hover:text-[#00d4ff] transition py-2">Roadmap</a>
              <a href="#team" onClick={() => setMobileMenuOpen(false)} className="hover:text-[#00d4ff] transition py-2">Team</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="hover:text-[#00d4ff] transition py-2">FAQ</a>
            </nav>
          </motion.div>
        )}
      </motion.nav>

      {/* Hero Section - LibFi Style */}
      <section className="w-full pt-36 pb-20 overflow-hidden relative">
        {/* Background gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e27] via-[#0f1435] to-[#0a0e27]"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00d4ff]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#0084ff]/10 rounded-full blur-3xl"></div>
        
        <motion.div 
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 px-4"
        >
          <motion.div
            initial={{ x: -70, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1, type: "spring" }}
            className="flex-1 flex flex-col gap-6"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-[#00d4ff] to-[#0084ff] bg-clip-text text-transparent">
                Liberty Finance
              </span>
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed">
              Stake INRT tokens and earn up to <span className="font-bold text-[#00d4ff]">17% APR</span>. The next-gen DeFi staking and rewards protocol.
            </p>
            
            {/* Button Container */}
            <div className="flex flex-wrap gap-4 mt-4">
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                href="/docs/whitepaper.pdf"
                className="px-8 py-4 bg-gradient-to-r from-[#00d4ff] to-[#0084ff] text-white font-semibold rounded-xl shadow-lg hover:shadow-[#00d4ff]/50 transition"
              >
                Read White Paper
              </motion.a>
              <div className="flex flex-col gap-2">
                <div className="[&>div>button]:!bg-[#1a1f3a] [&>div>button]:!text-white [&>div>button]:!rounded-xl [&>div>button]:!px-6 [&>div>button]:!py-4 [&>div>button]:!font-semibold [&>div>button]:!border [&>div>button]:!border-[#00d4ff]/30 hover:[&>div>button]:!bg-[#00d4ff]/10">
                  <ConnectButton />
                </div>
                {isConnected && !isAuthenticated && (
                  <motion.button
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleLogin}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#00d4ff] to-[#0084ff] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#00d4ff]/30 transition disabled:opacity-50"
                  >
                    {isLoading ? 'Signing In...' : 'Sign In to Dashboard'}
                    {!isLoading && <ArrowRight size={20} />}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
          
          {/* Hero Image */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1.1, type: "spring" }}
            className="flex-1 flex justify-center"
          >
            <div className="relative w-full max-w-[450px]">
              <div className="absolute inset-0 bg-gradient-to-r from-[#00d4ff]/20 to-[#0084ff]/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-[#1a1f3a]/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#00d4ff]/20 p-8">
                <img 
                  src="/images/hero.svg" 
                  alt="Liberty Staking" 
                  className="w-full h-auto"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats - LibFi Style */}
      <section id="stats" className="w-full py-20 bg-[#0f1435]/50">
        <div className="max-w-6xl mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-center mb-12"
          >
            Platform Statistics
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: TrendingUp, label: "Total Value Locked", value: "$2.5M+" },
              { icon: Users, label: "Active Users", value: "5,000+" },
              { icon: Shield, label: "Security Audits", value: "3" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                viewport={{ once: true }}
                className="bg-[#1a1f3a]/80 backdrop-blur-xl rounded-2xl p-8 text-center border border-[#00d4ff]/10 hover:border-[#00d4ff]/30 transition"
              >
                <stat.icon className="w-12 h-12 mx-auto mb-4 text-[#00d4ff]" />
                <div className="text-3xl font-bold mb-2">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features - LibFi Style */}
      <section id="features" className="w-full py-20">
        <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-center mb-12"
          >
            Features
          </motion.h2>
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-8">
          {[
            { title: "Stake & Earn", text: "Stake your INRT tokens for competitive APR.", color: "from-[#00d4ff] to-[#0084ff]" },
            { title: "Refer & Earn", text: "Earn up to 15% referral rewards on 15 levels.", color: "from-[#0084ff] to-[#006eff]" },
            { title: "Track Progress", text: "Monitor your investments and team growth.", color: "from-[#006eff] to-[#0054ff]" },
          ].map((f, i) => (            
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: i * 0.15 }}
              viewport={{ once: true }}
              className="relative group"             
            >              
              <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-10 rounded-2xl blur-xl group-hover:opacity-20 transition`}></div>
              <div className="relative bg-grey/80 backdrop-blur-xl rounded-2xl p-8 border border-[#00d4ff]/10 hover:border-[#00d4ff]/30 transition">
                <h3 className="text-2xl font-bold mb-3">{f.title}</h3>
                <p className="text-gray-400">{f.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Partners Section - WORKING VERSION */}
<section className="w-full py-20 bg-[#0f1435]/50">
  <div className="max-w-6xl mx-auto px-4">
    <motion.h2
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="text-3xl sm:text-4xl font-bold text-center text-white mb-12"
    >
      Our Partners
    </motion.h2>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
      {[
        { name: "Avalanche", logo: "/images/partners/avalanche.png" },
        { name: "Chainlink", logo: "/images/partners/openzep.svg" },
        { name: "CoinGecko", logo: "/images/partners/coingecko.svg" },
        { name: "Ares", logo: "/images/partners/Ares.svg" },
      ].map((partner, i) => (
        <motion.div
          key={partner.name}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: i * 0.1 }}
          viewport={{ once: true }}
          className="bg-[#1a1f3a]/80 backdrop-blur-xl rounded-xl p-6 flex flex-col items-center justify-center border border-[#00d4ff]/10 hover:border-[#00d4ff]/30 transition h-32 group relative"
        >
          {/* Image */}
          <img 
            src={partner.logo} 
            alt={`${partner.name} logo`}
            className="max-w-[150px] max-h-[90px] object-contain opacity-70 group-hover:opacity-100 transition"
            onError={(e) => {
              // Show partner name if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const text = document.createElement('div');
              text.className = 'text-gray-400 font-semibold text-center';
              text.textContent = partner.name;
              target.parentElement?.appendChild(text);
            }}
          />
         {/* Fallback text (hidden if image loads) */}
          <span className="text-sm text-gray-500 mt-2 hidden group-hover:block absolute bottom-2">
            {partner.name}
          </span>
        </motion.div>
      ))}
    </div>
  </div>
</section>



      {/* Roadmap - LibFi Style */}
      <section id="roadmap" className="w-full py-20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Project Roadmap</h2>
          <ol className="relative border-l-2 border-[#00d4ff] pl-8 space-y-12">
            {[
              { title: "Initial DEX Testnet Deployed", desc: "Alpha release of DEX, DeFi protocol development", date: "2023", color: "bg-[#00d4ff]" },
              { title: "Relaunching On Arbitrum", desc: "DEX release on Arbitrum Testnet, DAO formation", date: "2024 Q1", color: "bg-[#0084ff]" },
              { title: "Microfunding Engine Launch", desc: "Launch and security audit", date: "2024 Q2", color: "bg-[#006eff]" },
            ].map((item, i) => (
              <motion.li 
                key={i} 
                initial={{ x: -60, opacity: 0 }} 
                whileInView={{ x: 0, opacity: 1 }} 
                transition={{ duration: 0.6, delay: i * 0.15 }} 
                viewport={{ once: true }}
                className="relative"
              >
                <span className={`absolute left-[-38px] flex items-center justify-center w-8 h-8 ${item.color} rounded-full ring-8 ring-[#0a0e27]`}></span>
                <div className="bg-[#1a1f3a]/80 backdrop-blur-xl rounded-xl p-6 border border-[#00d4ff]/10">
                  <div className="text-sm text-[#00d4ff] font-semibold mb-2">{item.date}</div>
                  <h4 className="font-bold text-xl mb-2">{item.title}</h4>
                  <p className="text-gray-400">{item.desc}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="w-full py-20 bg-[#0f1435]/50">
        <div className="max-w-5xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold mb-4">Meet the Team</h2>
          <p className="text-lg text-gray-400 mb-12">
            Passionate DeFi builders reimagining digital lending.
          </p>
          <div className="flex flex-wrap justify-center gap-10">
            {[
              { name: "Chandan Shaw", role: "Lead Developer" },
              { name: "Jane Doe", role: "Product Manager" },
            ].map((member, i) => (
              <motion.div 
                key={member.name} 
                initial={{ y: 60, opacity: 0 }} 
                whileInView={{ y: 0, opacity: 1 }} 
                transition={{ duration: 0.55, delay: i * 0.18 }} 
                viewport={{ once: true }} 
                className="w-48"
              >
                <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-[#00d4ff] to-[#0084ff] shadow-lg mb-4 flex items-center justify-center text-5xl border-4 border-[#1a1f3a]">
                  👤
                </div>
                <div className="font-bold text-lg">{member.name}</div>
                <div className="text-gray-400 text-sm">{member.role}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="w-full py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "What is Liberty Finance?", a: "A next-gen DeFi lending & staking platform." },
              { q: "How do I stake?", a: "Connect your wallet, sign in, and use the dashboard." },
              { q: "Is it safe?", a: "Yes—our contracts are public and under audit." },
            ].map((faq, i) => (
              <motion.details 
                key={i} 
                className="bg-[#1a1f3a]/80 backdrop-blur-xl rounded-xl p-6 border border-[#00d4ff]/10 group" 
                initial={{ opacity: 0, y: 25 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.45, delay: i * 0.1 }} 
                viewport={{ once: true }}
              >
                <summary className="cursor-pointer text-lg font-semibold text-gray-200 group-open:text-[#00d4ff] transition list-none flex justify-between items-center">
                  {faq.q}
                  <span className="text-[#00d4ff]">+</span>
                </summary>
                <div className="mt-4 text-gray-400 pl-4 border-l-2 border-[#00d4ff]/30">{faq.a}</div>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f1435] text-gray-400 py-10 px-4 text-center mt-20 border-t border-[#00d4ff]/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <span>&copy; {new Date().getFullYear()} Liberty Finance. All rights reserved.</span>
          <div className="flex space-x-8">
            <a href="/terms" className="hover:text-[#00d4ff] transition">Terms</a>
            <a href="/privacy" className="hover:text-[#00d4ff] transition">Privacy</a>
            <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer" className="hover:text-[#00d4ff] transition">Twitter</a>
            <a href="mailto:support@liberty.finance" className="hover:text-[#00d4ff] transition">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
