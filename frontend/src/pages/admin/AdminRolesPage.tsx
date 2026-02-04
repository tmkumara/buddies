import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { createRole, fetchPermissions, fetchRoles, type Role } from '../../api/adminApi';

const AdminRolesPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState({ name: '', description: '', permissionCodes: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [roleResponse, permissionResponse] = await Promise.all([fetchRoles(), fetchPermissions()]);
      setRoles(roleResponse);
      setPermissionCodes(permissionResponse.map((permission) => permission.code));
    } catch (error) {
      enqueueSnackbar('Failed to load roles.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreate = async () => {
    try {
      const created = await createRole({
        name: formState.name,
        description: formState.description,
        permissionCodes: formState.permissionCodes
          ? formState.permissionCodes.split(',').map((code) => code.trim())
          : [],
      });
      setRoles((prev) => [created, ...prev]);
      enqueueSnackbar('Role created.', { variant: 'success' });
      setOpen(false);
    } catch (error) {
      enqueueSnackbar('Failed to create role.', { variant: 'error' });
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" fontWeight={700}>
            Roles
          </Typography>
          <Button variant="contained" onClick={() => setOpen(true)}>
            Create role
          </Button>
        </Stack>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2}>
            {roles.map((role) => (
              <Card key={role.id} variant="outlined">
                <CardContent>
                  <Typography variant="h6" fontWeight={600}>
                    {role.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {role.description || 'No description'}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" mt={2}>
                    {role.permissions.map((permission) => (
                      <Chip key={permission} label={permission} size="small" />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </CardContent>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create role</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, mt: 1 }}>
          <TextField
            label="Role name"
            value={formState.name}
            onChange={(event) => setFormState({ ...formState, name: event.target.value })}
          />
          <TextField
            label="Description"
            value={formState.description}
            onChange={(event) => setFormState({ ...formState, description: event.target.value })}
          />
          <TextField
            label="Permissions (comma separated)"
            helperText={`Available: ${permissionCodes.join(', ')}`}
            value={formState.permissionCodes}
            onChange={(event) => setFormState({ ...formState, permissionCodes: event.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default AdminRolesPage;
