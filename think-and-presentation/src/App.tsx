import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import styled from 'styled-components';
import Home from './pages/Home';
import Discussion from './pages/Discussion';
import Share from './pages/Share';
import Settings from './pages/Settings';
import './App.css';

const AppContainer = styled.div`
  min-height: 100vh;
  background-color: #0f172a;
  color: #f8fafc;
`;

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#3b82f6',
          colorBgBase: '#1e293b',
          colorTextBase: '#f8fafc',
          borderRadius: 6,
        },
      }}
    >
      <AppContainer>
        <BrowserRouter>
          <div className="app">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/discussion" element={<Discussion />} />
              <Route path="/share" element={<Share />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </BrowserRouter>
      </AppContainer>
    </ConfigProvider>
  );
}

export default App;
