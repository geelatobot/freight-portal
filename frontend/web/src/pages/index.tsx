import { useState } from 'react';
import Head from 'next/head';

export default function Home() {
  const [containerNo, setContainerNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSearch = async () => {
    if (!containerNo) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/shipments/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerNo }),
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>货代门户 - 货物查询</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-cyan-400">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold text-white text-center mb-8">
              货代客户门户
            </h1>
            
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={containerNo}
                  onChange={(e) => setContainerNo(e.target.value)}
                  placeholder="请输入集装箱号"
                  className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? '查询中...' : '查询'}
                </button>
              </div>
              
              {result && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
