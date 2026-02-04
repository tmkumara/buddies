import { Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import PersonIcon from '@mui/icons-material/Person';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { clearAuth } from '../../features/auth/authSlice';
import { logout } from '../../api/authApi';

const drawerWidth = 240;

const AppLayout = () => {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const menuItems = [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { label: 'My Profile', icon: <PersonIcon />, path: '/me' },
    { label: 'Users', icon: <PeopleIcon />, path: '/admin/users', permission: 'USER_READ' },
    { label: 'Roles', icon: <SecurityIcon />, path: '/admin/roles', permission: 'ROLE_READ' },
    { label: 'Permissions', icon: <VpnKeyIcon />, path: '/admin/permissions', permission: 'PERMISSION_READ' },
  ];

  const handleLogout = async () => {
    await logout();
    dispatch(clearAuth());
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, background: 'white', color: 'text.primary' }}
        elevation={0}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={700}>
            Buddies OMS
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {user?.fullName || user?.email}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.roles.join(', ') || 'User'}
              </Typography>
            </Box>
            <Avatar>{user?.email?.charAt(0)?.toUpperCase()}</Avatar>
            <Button variant="outlined" onClick={handleLogout}>
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems
              .filter((item) => !item.permission || user?.permissions.includes(item.permission))
              .map((item) => (
                <ListItemButton key={item.path} onClick={() => navigate(item.path)}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              ))}
          </List>
          <Divider />
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, backgroundColor: 'background.default', minHeight: '100vh' }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default AppLayout;
