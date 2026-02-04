import { Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { useAppSelector } from '../app/hooks';

const MePage = () => {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          My Profile
        </Typography>
        <Typography variant="body1">Email: {user?.email}</Typography>
        <Typography variant="body1">Full name: {user?.fullName || '—'}</Typography>
        <Typography variant="body1">Status: {user?.enabled ? 'Active' : 'Disabled'}</Typography>

        <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 3 }}>
          Roles
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {user?.roles.map((role) => (
            <Chip key={role} label={role} />
          ))}
        </Stack>

        <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 3 }}>
          Permissions
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {user?.permissions.map((permission) => (
            <Chip key={permission} label={permission} variant="outlined" />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default MePage;
