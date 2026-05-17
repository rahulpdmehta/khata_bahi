import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Button,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Receipt as ReceiptIcon,
  MoneyOff as MoneyOffIcon,
  AccountBalance as AccountBalanceIcon,
  EditNote as EditNoteIcon,
  BarChart as ReportsIcon,
  ManageAccounts as ManageIcon,
  EnergySavingsLeaf as EcoIcon,
  Logout as LogoutIcon,
  Assessment as AssessmentIcon,
  PeopleAlt as PeopleAltIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { logout } from '../../features/auth/authSlice';

const SIDEBAR_WIDTH = 260;

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { label: 'Transactions', icon: <ReceiptIcon />, path: '/transactions' },
  { label: 'Expenses', icon: <MoneyOffIcon />, path: '/expenses' },
  { label: 'Settlements', icon: <AccountBalanceIcon />, path: '/settlements' },
  { label: 'Approvals', icon: <EditNoteIcon />, path: '/edit-requests' },
  { label: 'Reports', icon: <AssessmentIcon />, path: '/reports' },
  { label: 'Customers', icon: <PeopleAltIcon />, path: '/customers', adminOnly: true },
  { label: 'Management', icon: <ManageIcon />, path: '/admin/users', adminOnly: true },
];

interface SidebarContentProps {
  onClose?: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({ onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === 'ADMIN';

  const handleNav = (path: string) => {
    navigate(path);
    onClose?.();
  };

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  return (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8fafc',
        borderRight: '1px solid #e2e8f0',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          px: 3,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #000666 0%, #1a237e 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <EcoIcon sx={{ color: '#94f0df', fontSize: 22 }} />
        </Box>
        <Box>
          <Typography
            variant="subtitle2"
            sx={{ color: '#0f172a', fontWeight: 700, lineHeight: 1.2, fontSize: '0.85rem' }}
          >
            Insurance Zone
          </Typography>
          <Typography variant="caption" sx={{ color: '#334155', fontSize: '0.73rem' }}>
            {isAdmin
              ? 'Admin Portal'
              : user?.centers?.[0]?.centerName || 'Staff Portal'}
          </Typography>
        </Box>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, py: 2, px: 1.5 }}>
        <Typography
          variant="caption"
          sx={{
            color: '#475569',
            fontWeight: 700,
            fontSize: '0.68rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            px: 1.5,
            mb: 1,
            display: 'block',
          }}
        >
          Main Menu
        </Typography>
        <List dense disablePadding>
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;

            const isActive =
              item.path === '/dashboard'
                ? location.pathname === '/dashboard'
                : location.pathname.startsWith(item.path);

            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleNav(item.path)}
                  sx={{
                    borderRadius: '10px',
                    py: 1,
                    px: 1.5,
                    transition: 'all 0.15s ease',
                    backgroundColor: isActive ? '#ffffff' : 'transparent',
                    boxShadow: isActive
                      ? '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
                      : 'none',
                    '&:hover': {
                      backgroundColor: isActive ? '#ffffff' : 'rgba(0,0,0,0.04)',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 34,
                      color: isActive ? '#000666' : '#475569',
                    }}
                  >
                    {React.cloneElement(item.icon as React.ReactElement, {
                      sx: { fontSize: 19 },
                    })}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#0f172a' : '#334155',
                    }}
                  />
                  {isActive && (
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: '#000666',
                        ml: 0.5,
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        <Divider sx={{ borderColor: '#e2e8f0', my: 2 }} />

        {/* Generate Report Button */}
        <Box sx={{ px: 0.5 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<ReportsIcon sx={{ fontSize: 18 }} />}
            onClick={() => handleNav('/reports')}
            sx={{
              background: 'linear-gradient(135deg, #000666 0%, #006b5e 100%)',
              color: '#fff',
              borderRadius: '10px',
              py: 1.1,
              fontWeight: 700,
              fontSize: '0.82rem',
              boxShadow: '0 4px 14px rgba(0,6,102,0.25)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1a237e 0%, #006b5e 100%)',
                boxShadow: '0 6px 18px rgba(0,6,102,0.3)',
              },
            }}
          >
            Generate Report
          </Button>
        </Box>
      </Box>

      {/* Bottom Links */}
      <Box sx={{ borderTop: '1px solid #e2e8f0', px: 1.5, py: 2 }}>
        {/* User info */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 1.5,
            py: 1,
            mb: 1,
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #000666 0%, #006b5e 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.85rem',
              flexShrink: 0,
            }}
          >
            {user?.username?.charAt(0).toUpperCase()}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{ color: '#0f172a', fontWeight: 600, fontSize: '0.8rem' }}
              noWrap
            >
              {user?.username}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: isAdmin ? '#000666' : '#006b5e',
                fontSize: '0.65rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.3,
              }}
            >
              {user?.role}
            </Typography>
          </Box>
        </Box>

        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: '10px',
            py: 0.8,
            px: 1.5,
            color: '#ef4444',
            '&:hover': { backgroundColor: 'rgba(239,68,68,0.08)' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 30, color: '#ef4444' }}>
            <LogoutIcon sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText
            primary="Logout"
            primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500 }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );
};

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onMobileClose }) => {
  return (
    <>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, border: 'none' },
        }}
      >
        <SidebarContent onClose={onMobileClose} />
      </Drawer>

      {/* Desktop Permanent Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, border: 'none' },
        }}
      >
        <SidebarContent />
      </Drawer>
    </>
  );
};
