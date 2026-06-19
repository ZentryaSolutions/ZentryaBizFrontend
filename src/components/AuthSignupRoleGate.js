import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { shopsPath } from '../utils/workspacePaths';
import SignupRoleModal from '../pages/auth/SignupRoleModal';

export default function AuthSignupRoleGate() {
  const { signupRolePrompt, completeSignupRole, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!signupRolePrompt) return null;

  return (
    <SignupRoleModal
      loading={loading}
      error={error}
      onConfirm={async (accountType) => {
        setLoading(true);
        setError('');
        try {
          await completeSignupRole(accountType);
          const uid = user?.id;
          if (uid) {
            navigate(shopsPath(uid), { replace: true });
          } else {
            navigate('/shops', { replace: true });
          }
        } catch (err) {
          const msg =
            err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Could not save. Try again.';
          setError(msg);
        } finally {
          setLoading(false);
        }
      }}
    />
  );
}
