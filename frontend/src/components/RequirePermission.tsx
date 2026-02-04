import { ReactNode } from 'react';
import { Alert, Box } from '@mui/material';
import { useAppSelector } from '../app/hooks';

interface RequirePermissionProps {
  permission?: string;
  role?: string;
  children: ReactNode;
}

const RequirePermission = ({ permission, role, children }: RequirePermissionProps) => {
  const user = useAppSelector((state) => state.auth.user);

  if (!user) {
    return null;
  }

  const hasPermission = permission ? user.permissions.includes(permission) : true;
  const hasRole = role ? user.roles.includes(role) : true;

  if (!hasPermission || !hasRole) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">You do not have access to this section.</Alert>
      </Box>
    );
  }

  return <>{children}</>;
};

export default RequirePermission;
