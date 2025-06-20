import '../styles/globals.css';

import Head from 'next/head';
import { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { Space_Grotesk } from 'next/font/google';
import { createTheme, MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Toaster } from 'react-hot-toast';
import { WebSocketProvider } from '../components/WebSocketProvider';

const globalFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--global-font',
});

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: globalFont.style.fontFamily,
});

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <>
      <Head>
        <title>Forum</title>
        <meta name="description" content="simple forum for asking questions" />
        <link rel="shortcut icon" href="/favicon.png" />
        <ColorSchemeScript />
      </Head>
      <SessionProvider session={pageProps.session}>
        <WebSocketProvider>
          <MantineProvider theme={theme}>
            <Component {...pageProps} />
            <Toaster position="top-center" />
          </MantineProvider>
        </WebSocketProvider>
      </SessionProvider>
    </>
  );
};

export default App;
