import React from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { ClientForm } from '@/components/forms/ClientForm';
import { Navigate } from 'react-router-dom';

export default function ClientFormPage() {
  const { id } = useParams<{ id: string }>();
  const { getClient } = useData();
  const { canEdit } = useAuth();
  
  // Redirect if user can't edit
  if (!canEdit) {
    return <Navigate to="/clientes" replace />;
  }
  
  const isEditing = !!id;
  const client = id ? getClient(id) : undefined;
  
  // If editing but client not found
  if (isEditing && !client) {
    return <Navigate to="/clientes" replace />;
  }
  
  return (
    <ClientForm 
      client={client} 
      mode={isEditing ? 'edit' : 'create'} 
    />
  );
}
