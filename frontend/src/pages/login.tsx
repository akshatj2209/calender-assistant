import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Initiating Google OAuth...');
      
      // Get OAuth URL from backend
      const response = await fetch('http://localhost:3001/api/auth/url');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get OAuth URL');
      }

      console.log('✅ Redirecting to Google OAuth...');
      
      // Redirect to Google OAuth
      window.location.href = data.authUrl;
      
    } catch (err: any) {
      console.error('❌ Login failed:', err);
      setError(err.message || 'Failed to start Google login');
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Login - Gmail Calendar Assistant</title>
        <meta name="description" content="Sign in with Google to access your Gmail Calendar Assistant" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-2xl text-white">🤖</span>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Gmail Calendar Assistant
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in with Google to connect your Gmail and Calendar
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-lg shadow-md p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-red-800 text-sm">
                  <strong>Error:</strong> {error}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className={`w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              <div className="text-xs text-gray-500 text-center">
                By continuing, you agree to connect your Gmail and Calendar accounts
                to enable automated demo scheduling.
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">What you&apos;ll get:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <span className="mr-2 text-green-500">✓</span>
                Automated email monitoring for demo requests
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-green-500">✓</span>
                Smart scheduling based on your calendar availability
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-green-500">✓</span>
                AI-powered email responses and booking confirmations
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-green-500">✓</span>
                Dashboard to track all your demo meetings
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;