import React from 'react';
import Head from 'next/head';
import ScheduledResponsesList from '../components/ScheduledResponses/ScheduledResponsesList';
import ProtectedRoute from '../components/Auth/ProtectedRoute';
import Header from '../components/Layout/Header';

export default function ScheduledResponsesPage() {
  return (
    <>
      <Head>
        <title>Scheduled Responses - Gmail Calendar Assistant</title>
        <meta name="description" content="Manage your scheduled email responses" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ProtectedRoute requireTokens={true}>
        <div className="min-h-screen bg-gray-50">
          <Header 
            onRefresh={() => window.location.reload()}
            activeTab="scheduled-responses"
            onTabChange={() => {}}
          />
          <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Scheduled Responses</h1>
              <p className="text-gray-600 mt-2">
                Manage and edit your upcoming email responses
              </p>
            </div>
            <ScheduledResponsesList />
          </main>
        </div>
      </ProtectedRoute>
    </>
  );
}