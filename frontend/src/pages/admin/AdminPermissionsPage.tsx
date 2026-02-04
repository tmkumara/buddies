import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
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
import { createPermission, fetchPermissions, Permission } from '../../api/adminApi';

const AdminPermissionsPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState({ code: '', description: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetchPermissions();
      setPermissions(response);
    } catch (error) {
      enqueueSnackbar('Failed to load permissions.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreate = async () => {
    try {
      const created = await createPermission(formState);
      setPermissions((prev) => [created, ...prev]);
      enqueueSnackbar('Permission created.', { variant: 'success' });
      setOpen(false);
    } catch (error) {
      enqueueSnackbar('Failed to create permission.', { variant: 'error' });
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" fontWeight={700}>
            Permissions
          </Typography>
          <Button variant="contained" onClick={() => setOpen(true)}>
            Create permission
          </Button>
        </Stack>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={1}>
            {permissions.map((permission) => (
              <Card key={permission.id} variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {permission.code}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {permission.description || 'No description'}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </CardContent>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create permission</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, mt: 1 }}>
          <TextField
            label="Code"
            value={formState.code}
            onChange={(event) => setFormState({ ...formState, code: event.target.value })}
          />
          <TextField
            label="Description"
            value={formState.description}
            onChange={(event) => setFormState({ ...formState, description: event.target.value })}
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

export default AdminPermissionsPage;
