import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { store } from './app/store';
import App from './App';
import './index.css';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a73e8',
    },
    background: {
      default: '#f6f8fb',
    },
  },
  shape: {
    borderRadius: 10,
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider maxSnack={3} autoHideDuration={3000}>
          <App />
        </SnackbarProvider>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
