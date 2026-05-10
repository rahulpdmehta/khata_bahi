import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  InputBase,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  NotificationsOutlined as NotificationsIcon,
  SettingsOutlined as SettingsIcon,
  Search as SearchIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { logout } from '../../features/auth/authSlice';

const SIDEBAR_WIDTH = 260;

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMobileMenuToggle }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchValue, setSearchValue] = useState('');

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    handleMenuClose();
    await dispatch(logout());
    navigate('/login');
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
        ml: { md: `${SIDEBAR_WIDTH}px` },
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        zIndex: (theme) => theme.zIndex.drawer - 1,
      }}
    >
      <Toolbar sx={{ px: { xs: 2, sm: 3 }, gap: 2, minHeight: { xs: 56, sm: 64 } }}>
        {/* Mobile menu toggle */}
        <IconButton
          edge="start"
          onClick={onMobileMenuToggle}
          sx={{ display: { md: 'none' }, color: '#64748b' }}
        >
          <MenuIcon />
        </IconButton>

        {/* Title */}
        <Typography
          variant="subtitle1"
          sx={{
            color: '#0f172a',
            fontWeight: 700,
            fontSize: { xs: '0.9rem', sm: '1rem' },
            whiteSpace: 'nowrap',
            display: { xs: 'none', sm: 'block' },
          }}
        >
          Pollution Center Management
        </Typography>

        {/* Search bar */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            px: { xs: 0, sm: 2 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              borderRadius: '9999px',
              px: 2,
              py: 0.6,
              width: '100%',
              maxWidth: 420,
              transition: 'background 0.2s',
              '&:focus-within': {
                backgroundColor: '#e8eef7',
                outline: `2px solid #000666`,
                outlineOffset: '-2px',
              },
            }}
          >
            <SearchIcon sx={{ color: '#94a3b8', fontSize: 18, mr: 1, flexShrink: 0 }} />
            <InputBase
              placeholder="Search transactions, expenses…"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              sx={{
                flex: 1,
                fontSize: '0.85rem',
                color: '#0f172a',
                '& input::placeholder': { color: '#94a3b8' },
              }}
            />
          </Box>
        </Box>

        {/* Right Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <Tooltip title="Notifications">
            <IconButton sx={{ color: '#000666' }}>
              <Badge badgeContent={3} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', minWidth: 16, height: 16 } }}>
                <NotificationsIcon sx={{ fontSize: 22 }} />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Settings">
            <IconButton sx={{ color: '#000666' }}>
              <SettingsIcon sx={{ fontSize: 22 }} />
            </IconButton>
          </Tooltip>

          {/* User Avatar */}
          <Tooltip title={user?.username || 'User'}>
            <Avatar
              onClick={handleMenuOpen}
              sx={{
                width: 36,
                height: 36,
                background: 'linear-gradient(135deg, #000666 0%, #006b5e 100%)',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                ml: 0.5,
                transition: 'opacity 0.15s',
                '&:hover': { opacity: 0.85 },
              }}
            >
              {user?.username?.charAt(0).toUpperCase()}
            </Avatar>
          </Tooltip>
        </Box>
      </Toolbar>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: { mt: 0.5, minWidth: 180, borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
        }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f1f5f9' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
            {user?.username}
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            {user?.role}
          </Typography>
        </Box>
        <MenuItem onClick={handleMenuClose} sx={{ gap: 1.5, mt: 0.5 }}>
          <PersonIcon fontSize="small" sx={{ color: '#64748b' }} />
          <Typography variant="body2">Profile</Typography>
        </MenuItem>
        <MenuItem onClick={handleLogout} sx={{ gap: 1.5, color: '#ef4444' }}>
          <LogoutIcon fontSize="small" />
          <Typography variant="body2">Logout</Typography>
        </MenuItem>
      </Menu>
    </AppBar>
  );
};
