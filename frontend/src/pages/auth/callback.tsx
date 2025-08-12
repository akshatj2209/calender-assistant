import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const AuthCallback: React.FC = () => {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { success, userId, email, error } = router.query;

        // Handle error from backend redirect
        if (error) {
          throw new Error(`Authentication error: ${error}`);
        }

        // Handle success from backend redirect
        if (success === 'true' && userId && email) {
          setStatus('success');
          setMessage('Authentication successful! Redirecting to dashboard...');

          localStorage.setItem('gmail_assistant_user_id', userId as string);
          localStorage.setItem('gmail_assistant_user_email', email as string);

          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
          return;
        }

        // If no success parameter, something went wrong
        throw new Error('Authentication did not complete successfully');

      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Authentication failed');
      }
    };

    // Only run when router is ready and has query params
    if (router.isReady) {
      handleCallback();
    }
  }, [router.isReady, router.query]);

  const handleRetry = () => {
    router.push('/login');
  };

  return (
    <>
      <Head>
        <title>Authenticating - Gmail Calendar Assistant</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            {status === 'loading' && (
              <>
                <LoadingSpinner size="lg" />
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  Connecting Your Account
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {message}
                </p>
                <div className="mt-4 text-xs text-gray-500">
                  This may take a few moments...
                </div>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl text-green-600">✅</span>
                </div>
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  Success!
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {message}
                </p>
                <div className="mt-4 text-xs text-gray-500">
                  Your Gmail and Calendar are now connected.
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl text-red-600">❌</span>
                </div>
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  Authentication Failed
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {message}
                </p>
                <div className="mt-6">
                  <button
                    onClick={handleRetry}
                    className="btn-primary"
                  >
                    Try Again
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthCallback;