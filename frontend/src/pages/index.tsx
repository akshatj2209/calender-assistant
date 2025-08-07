import React from 'react';
import Head from 'next/head';
import Dashboard from '../components/Dashboard/Dashboard';
import ProtectedRoute from '../components/Auth/ProtectedRoute';

export default function Home() {
  return (
    <>
      <Head>
        <title>Gmail Calendar Assistant</title>
        <meta name="description" content="AI-powered calendar assistant for sales demo scheduling" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ProtectedRoute requireTokens={true}>
        <main className="min-h-screen bg-gray-50">
          <Dashboard />
        </main>
      </ProtectedRoute>
    </>
  );
}