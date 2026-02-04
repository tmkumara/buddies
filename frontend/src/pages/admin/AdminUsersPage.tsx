import { useEffect, useMemo, useState } from 'react';
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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { type AdminUser, createUser, fetchRoles, fetchUsers, toggleUser } from '../../api/adminApi';

const AdminUsersPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState({
    email: '',
    password: '',
    fullName: '',
    enabled: true,
    roleNames: [] as string[],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersResponse, rolesResponse] = await Promise.all([fetchUsers(), fetchRoles()]);
      setUsers(usersResponse);
      setRoles(rolesResponse.map((role) => role.name));
    } catch (error) {
      enqueueSnackbar('Failed to load users.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreate = async () => {
    try {
      const created = await createUser(formState);
      setUsers((prev) => [created, ...prev]);
      enqueueSnackbar('User created.', { variant: 'success' });
      setOpen(false);
    } catch (error) {
      enqueueSnackbar('Failed to create user.', { variant: 'error' });
    }
  };

  const handleToggle = async (id: number, enabled: boolean) => {
    try {
      const updated = await toggleUser(id, enabled);
      setUsers((prev) => prev.map((user) => (user.id === id ? updated : user)));
      enqueueSnackbar(`User ${enabled ? 'enabled' : 'disabled'}.`, { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to update user.', { variant: 'error' });
    }
  };

  const roleOptions = useMemo(() => roles.map((role) => (
    <MenuItem key={role} value={role}>
      {role}
    </MenuItem>
  )), [roles]);

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" fontWeight={700}>
            Users
          </Typography>
          <Button variant="contained" onClick={() => setOpen(true)}>
            Create user
          </Button>
        </Stack>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Full name</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.fullName || '—'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {user.roles.map((role) => (
                        <Chip key={role} label={role} size="small" />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>{user.enabled ? 'Active' : 'Disabled'}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => handleToggle(user.id, !user.enabled)}>
                      {user.enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create user</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, mt: 1 }}>
          <TextField
            label="Email"
            value={formState.email}
            onChange={(event) => setFormState({ ...formState, email: event.target.value })}
          />
          <TextField
            label="Password"
            type="password"
            value={formState.password}
            onChange={(event) => setFormState({ ...formState, password: event.target.value })}
          />
          <TextField
            label="Full name"
            value={formState.fullName}
            onChange={(event) => setFormState({ ...formState, fullName: event.target.value })}
          />
          <FormControl>
            <InputLabel id="roles-label">Roles</InputLabel>
            <Select
              labelId="roles-label"
              multiple
              value={formState.roleNames}
              label="Roles"
              onChange={(event) => setFormState({ ...formState, roleNames: event.target.value as string[] })}
            >
              {roleOptions}
            </Select>
          </FormControl>
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

export default AdminUsersPage;
