import type { NextPage } from 'next';
import Head from 'next/head';
import { useState } from 'react';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
}

const Home: NextPage = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const apiEndpoints: ApiEndpoint[] = [
    { method: 'GET', path: '/api/agents', description: 'List all agents' },
    { method: 'GET', path: '/api/agents/[id]', description: 'Get agent by ID' },
    { method: 'PUT', path: '/api/agents/availability', description: 'Update agent availability' },
    { method: 'GET', path: '/api/calls', description: 'List all calls' },
    { method: 'GET', path: '/api/calls/[id]', description: 'Get call details' },
    { method: 'POST', path: '/api/calls/outbound', description: 'Initiate outbound call' },
    { method: 'GET', path: '/api/queue', description: 'Get queue status' },
    { method: 'GET', path: '/api/queue/[id]', description: 'Get specific queue' },
    { method: 'POST', path: '/api/queue/hold', description: 'Place call on hold' },
    { method: 'POST', path: '/api/sms/send', description: 'Send SMS message' },
    { method: 'POST', path: '/api/campaigns', description: 'Create campaign' },
    { method: 'POST', path: '/api/campaigns/[id]/run', description: 'Run campaign' },
    { method: 'POST', path: '/api/ivr/dtmf', description: 'Handle DTMF input' },
  ];

  const webhookEndpoints = [
    { path: '/api/webhooks/telnyx-voice', description: 'Voice call events' },
    { path: '/api/webhooks/telnyx-status', description: 'Call status updates' },
    { path: '/api/webhooks/telnyx-recording', description: 'Recording events' },
    { path: '/api/webhooks/telnyx-sms', description: 'SMS events' },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-600';
      case 'POST': return 'bg-blue-600';
      case 'PUT': return 'bg-orange-600';
      case 'DELETE': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Head>
        <title>Voice Call System - AI-Powered Communication Platform</title>
        <meta name="description" content="Enterprise-grade AI voice call management system with Telnyx integration" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
        
        <div className="max-w-7xl mx-auto px-6 py-24 relative">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-2xl">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 tracking-tight">
              Voice Call System
            </h1>
            <p className="text-2xl text-purple-200 mb-8 max-w-3xl mx-auto leading-relaxed">
              Enterprise-grade AI-powered voice call management platform with intelligent routing, 
              real-time analytics, and seamless Telnyx integration.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-green-300 text-sm font-medium">System Operational</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-full">
                <span className="text-blue-300 text-sm font-medium">v2.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pb-24">
        {/* Quick Actions */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <button 
              onClick={() => window.open('/api/agents', '_blank')}
              className="group p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl hover:bg-white/10 hover:border-purple-500/50 transition-all duration-300"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Manage Agents</h3>
              <p className="text-gray-400">View and manage agent availability and status</p>
            </button>

            <button 
              onClick={() => window.open('/api/calls', '_blank')}
              className="group p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl hover:bg-white/10 hover:border-purple-500/50 transition-all duration-300"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">View Calls</h3>
              <p className="text-gray-400">Monitor active and historical call records</p>
            </button>

            <button 
              onClick={() => window.open('/api/queue', '_blank')}
              className="group p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl hover:bg-white/10 hover:border-purple-500/50 transition-all duration-300"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Queue Status</h3>
              <p className="text-gray-400">Check real-time queue metrics and wait times</p>
            </button>
          </div>
        </section>

        {/* API Endpoints */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">API Endpoints</h2>
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Endpoint</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {apiEndpoints.map((endpoint) => (
                    <tr key={endpoint.path} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white ${getMethodColor(endpoint.method)}`}>
                          {endpoint.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-purple-300 font-mono text-sm">{endpoint.path}</code>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {endpoint.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => copyToClipboard(endpoint.path)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="Copy endpoint"
                        >
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Webhooks */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">Webhook Endpoints</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {webhookEndpoints.map((webhook) => (
              <div key={webhook.path} className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl hover:border-purple-500/50 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white bg-orange-600">
                        WEBHOOK
                      </span>
                      <code className="text-orange-300 font-mono text-sm">{webhook.path}</code>
                    </div>
                    <p className="text-gray-400 text-sm">{webhook.description}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(webhook.path)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors ml-4"
                    title="Copy webhook URL"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Active and ready to receive events</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* System Status */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-8">System Status</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl">
              <div className="text-sm text-gray-400 mb-2">Platform</div>
              <div className="text-2xl font-bold text-white">Next.js 14</div>
            </div>
            <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl">
              <div className="text-sm text-gray-400 mb-2">Runtime</div>
              <div className="text-2xl font-bold text-white">Node.js 20+</div>
            </div>
            <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl">
              <div className="text-sm text-gray-400 mb-2">Telephony</div>
              <div className="text-2xl font-bold text-white">Telnyx API</div>
            </div>
            <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl">
              <div className="text-sm text-gray-400 mb-2">Database</div>
              <div className="text-2xl font-bold text-white">PostgreSQL</div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-gray-500 text-sm">
            Voice Call System v2.0.0 • Built with Next.js & Telnyx • 
            Deployed on Vercel
          </p>
          <p className="text-gray-600 text-xs mt-2">
            Last deployed: {new Date().toLocaleString()}
          </p>
        </div>
      </footer>

      {/* Toast Notification */}
      {copied && (
        <div className="fixed bottom-8 right-8 px-6 py-3 bg-green-600 text-white rounded-lg shadow-lg animate-fade-in">
          Copied to clipboard!
        </div>
      )}
    </div>
  );
};

export default Home;