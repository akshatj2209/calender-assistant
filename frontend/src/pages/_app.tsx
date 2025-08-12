import React from 'react';
import type { AppProps } from 'next/app';
import { AppProvider } from '../context/AppContext';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AppProvider>
      <Component {...pageProps} />
    </AppProvider>
  );
}