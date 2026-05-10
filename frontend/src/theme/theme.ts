import { createTheme } from '@mui/material/styles';

// MD3 color tokens matching Stitch design exactly
export const colors = {
  primary: '#000666',           // deep navy
  primaryContainer: '#1a237e',  // navy gradient end
  primaryFixed: '#e0e0ff',
  onPrimary: '#ffffff',
  secondary: '#006b5e',         // teal
  secondaryContainer: '#94f0df',
  onSecondary: '#ffffff',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  surface: '#f9f9f9',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f3f3f3',
  surfaceContainer: '#eeeeee',
  surfaceContainerHigh: '#e8e8e8',
  onSurface: '#1a1c1c',
  onSurfaceVariant: '#454652',
  outline: '#767683',
  outlineVariant: '#c6c5d4',
};

export const theme = createTheme({
  palette: {
    primary: {
      main: colors.primary,
      light: '#343d96',
      dark: '#00044a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: colors.secondary,
      light: '#3d9b8f',
      dark: '#003d36',
      contrastText: '#ffffff',
    },
    error: {
      main: colors.error,
      light: '#de4444',
      dark: '#8c0000',
      contrastText: '#ffffff',
    },
    success: {
      main: '#006b5e',
    },
    background: {
      default: colors.surface,
      paper: colors.surfaceContainerLowest,
    },
    text: {
      primary: colors.onSurface,
      secondary: colors.onSurfaceVariant,
    },
    divider: colors.outlineVariant,
  },
  shape: {
    borderRadius: 4,
  },
  typography: {
    fontFamily: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'].join(','),
    h1: { fontFamily: 'Manrope, sans-serif', fontWeight: 800 },
    h2: { fontFamily: 'Manrope, sans-serif', fontWeight: 800 },
    h3: { fontFamily: 'Manrope, sans-serif', fontWeight: 700 },
    h4: { fontFamily: 'Manrope, sans-serif', fontWeight: 700 },
    h5: { fontFamily: 'Manrope, sans-serif', fontWeight: 700 },
    h6: { fontFamily: 'Manrope, sans-serif', fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { fontWeight: 700, letterSpacing: 0.3, fontFamily: 'Manrope, sans-serif' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: colors.surface, fontFamily: 'Inter, sans-serif' },
        'h1,h2,h3,h4,h5,h6': { fontFamily: 'Manrope, sans-serif' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '8px 20px',
          boxShadow: 'none',
          fontFamily: 'Manrope, sans-serif',
          fontWeight: 700,
          '&:hover': { boxShadow: '0 2px 8px rgba(0,6,102,0.2)' },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryContainer} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, #1a237e 0%, #283593 100%)`,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
          border: 'none',
          backgroundColor: colors.surfaceContainerLowest,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 16 },
        elevation1: { boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)' },
        elevation2: { boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          color: colors.onSurface,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.primary },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 4, fontWeight: 700, fontFamily: 'Manrope, sans-serif' } },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: 'transparent',
            fontWeight: 700,
            color: colors.onSurfaceVariant,
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontFamily: 'Manrope, sans-serif',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child td': { borderBottom: 0 },
          '&:hover': { backgroundColor: 'rgba(0,6,102,0.02)' },
        },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 16 } },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 9999, height: 8, backgroundColor: '#f1f5f9' },
        bar: { borderRadius: 9999 },
      },
    },
  },
});
