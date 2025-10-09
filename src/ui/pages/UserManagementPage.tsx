import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import UserManagement from './UserManagement';

export default function UserManagementPage() {
  const { authState, logout } = useAuth();

  return (
    <UserManagement />
  );
}