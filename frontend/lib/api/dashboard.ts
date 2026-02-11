import { apiClient } from './client';

export interface SuperAdminDashboardStats {
  totalOrgs: number;
  activeOrgs: number;
}

export interface RecentOrg {
  id: string;
  name: string;
  createdAt: string;
}

export interface SuperAdminDashboardData {
  stats: SuperAdminDashboardStats;
  recentOrgs: RecentOrg[];
}

export interface AdminDashboardStats {
  totalPages: number;
  totalMembers: number;
  totalPosts: number;
  totalCollections: number;
}

export interface RecentPost {
  id: string;
  title: string;
  createdAt: string;
  authorUserId: string;
}

export interface AdminDashboardData {
  stats: AdminDashboardStats;
  recentPosts: RecentPost[];
}

export const dashboardApi = {
  /**
   * Get super admin dashboard statistics
   */
  getSuperAdminStats: async (): Promise<SuperAdminDashboardData> => {
    const response = await apiClient.get('/dashboard/super-admin');
    return response.data.data;
  },

  /**
   * Get admin dashboard statistics
   */
  getAdminStats: async (orgId: string): Promise<AdminDashboardData> => {
    const response = await apiClient.get('/dashboard/admin', {
      params: { orgId },
    });
    return response.data.data;
  },

  /**
   * Get member dashboard statistics
   */
  getMemberStats: async (orgId: string): Promise<any> => {
    const response = await apiClient.get('/dashboard/member', {
      params: { orgId },
    });
    return response.data.data;
  },
};

