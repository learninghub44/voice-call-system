import type { NextPage } from 'next';
import Head from 'next/head';

const Home: NextPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <Head>
        <title>Voice Call System</title>
        <meta name="description" content="AI-powered voice call management system" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="text-center max-w-4xl">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          Voice Call System
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          AI-powered voice call management with Telnyx integration
        </p>

        <div className="grid md:grid-cols-2 gap-6 mt-12 text-left">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-white mb-4">API Endpoints</h2>
            <ul className="space-y-2 text-gray-400">
              <li>
                <code className="bg-gray-900 px-2 py-1 rounded">GET /api/agents</code> - List agents
              </li>
              <li>
                <code className="bg-gray-900 px-2 py-1 rounded">GET /api/calls</code> - List calls
              </li>
              <li>
                <code className="bg-gray-900 px-2 py-1 rounded">POST /api/calls/outbound</code> - Make outbound calls
              </li>
              <li>
                <code className="bg-gray-900 px-2 py-1 rounded">GET /api/queue</code> - Get queue status
              </li>
              <li>
                <code className="bg-gray-900 px-2 py-1 rounded">POST /api/sms/send</code> - Send SMS
              </li>
            </ul>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-white mb-4">Webhooks</h2>
            <ul className="space-y-2 text-gray-400">
              <li>
                <code className="bg-gray-900 px-2 py-1 rounded">POST /api/webhooks/telnyx-voice</code>
              </li>
              <li>
                <code className="bg-gray-900 px-2 py-1 rounded">POST /api/webhooks/telnyx-status</code>
              </li>
              <li>
                <code className="bg-gray-900 px-2 py-1 rounded">POST /api/webhooks/telnyx-recording</code>
              </li>
              <li>
                <code className="bg-gray-900 px-2 py-1 rounded">POST /api/webhooks/telnyx-sms</code>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 text-gray-500 text-sm">
          <p>Deployment successful ✓</p>
          <p className="mt-2">Build: {new Date().toISOString()}</p>
        </div>
      </main>
    </div>
  );
};

export default Home;