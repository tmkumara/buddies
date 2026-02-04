import { Card, CardContent, Grid, Typography } from '@mui/material';
import { useAppSelector } from '../app/hooks';

const DashboardHome = () => {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Welcome back
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {user?.fullName || user?.email}, you're signed in with {user?.roles.join(', ') || 'User'} access.
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Quick tips
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Use the navigation menu to manage users, roles, and permissions. Check your profile to review your
              current entitlements.
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default DashboardHome;
