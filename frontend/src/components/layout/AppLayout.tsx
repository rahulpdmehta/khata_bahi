import React, { useState } from 'react';
import { Box, IconButton, AppBar, Toolbar, Typography } from '@mui/material';
import { Menu as MenuIcon, EnergySavingsLeaf as EcoIcon } from '@mui/icons-material';
import { Sidebar } from './Sidebar';

const SIDEBAR_WIDTH = 260;

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9f9f9' }}>
      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { md: SIDEBAR_WIDTH }, flexShrink: { md: 0 } }}
      >
        <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      </Box>

      {/* Main content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
          minWidth: 0,
        }}
      >
        {/* Mobile top bar */}
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            display: { xs: 'flex', md: 'none' },
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar sx={{ minHeight: '56px !important', px: 2, gap: 1.5 }}>
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ color: '#000666', mr: 0.5 }}
            >
              <MenuIcon />
            </IconButton>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #000666 0%, #1a237e 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <EcoIcon sx={{ color: '#94f0df', fontSize: 16 }} />
            </Box>
            <Typography
              variant="subtitle2"
              sx={{ color: '#0f172a', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '-0.01em' }}
            >
              Insurance Zone
            </Typography>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3 },
            pt: { xs: '72px', md: 3 },
            overflowX: 'hidden',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};
