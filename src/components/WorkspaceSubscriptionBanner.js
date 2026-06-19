import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { shopPickerAPI } from '../services/api';
import { hasPosBackendSession } from '../lib/appMode';
import {
  isStaffAccountRole,
  isWorkspaceAccessBlocked,
} from '../utils/planFeatures';

const bannerStyle = {
  margin: '0 16px',
  padding: '10px 14px',
  background: '#fef3c7',
  border: '1px solid #f59e0b',
  borderRadius: '8px',
  color: '#92400e',
  fontSize: '14px',
};

export default function WorkspaceSubscriptionBanner({ profile, activeShopId }) {
  const staff = isStaffAccountRole(profile?.role);

  const { data: shopPlan } = useQuery({
    queryKey: ['workspaceShopPlan', activeShopId],
    queryFn: async () => {
      const { data } = await shopPickerAPI.currentShopPlan();
      return data;
    },
    enabled: Boolean(staff && activeShopId && hasPosBackendSession()),
    staleTime: 60_000,
  });

  if (staff) {
    const access = shopPlan?.plan_access;
    if (!access || access.ok) return null;
    return (
      <div role="status" style={bannerStyle}>
        {access.message ||
          "This shop's subscription has expired. Please contact your shop administrator to renew the plan."}
      </div>
    );
  }

  if (!profile || !isWorkspaceAccessBlocked(profile)) return null;

  return (
    <div role="status" style={bannerStyle}>
      Your subscription is expired. Renew from pricing / billing to restore Growth and Business features.
    </div>
  );
}
