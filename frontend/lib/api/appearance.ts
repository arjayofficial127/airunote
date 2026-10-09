import apiClient from "./client";
import type { Appearance } from "@/lib/exam-appearance";
export interface ExamTemplate {
  id: string;
  name: string;
  config: Appearance;
  revision: number;
  archivedAt: string | null;
}
export interface ExamAppearance {
  config: Appearance;
  templateId: string | null;
  revision: number;
}
export const appearanceApi = {
  list: async (
    org: string,
  ): Promise<{ templates: ExamTemplate[]; defaultTemplateId: string | null }> =>
    (await apiClient.get(`/orgs/${org}/appearance/templates`)).data.data,
  create: async (
    org: string,
    name: string,
    config: Appearance,
  ): Promise<ExamTemplate> =>
    (
      await apiClient.post(`/orgs/${org}/appearance/templates`, {
        name,
        config,
      })
    ).data.data,
  update: async (org: string, template: ExamTemplate): Promise<ExamTemplate> =>
    (
      await apiClient.put(`/orgs/${org}/appearance/templates/${template.id}`, {
        name: template.name,
        config: template.config,
        revision: template.revision,
      })
    ).data.data,
  archive: async (org: string, id: string) =>
    apiClient.post(`/orgs/${org}/appearance/templates/${id}/archive`),
  setDefault: async (org: string, templateId: string | null) =>
    apiClient.put(`/orgs/${org}/appearance/default`, { templateId }),
  get: async (org: string, exam: string): Promise<ExamAppearance> =>
    (await apiClient.get(`/orgs/${org}/appearance/exams/${exam}`)).data.data,
  save: async (
    org: string,
    exam: string,
    value: ExamAppearance,
  ): Promise<ExamAppearance> =>
    (await apiClient.put(`/orgs/${org}/appearance/exams/${exam}`, value)).data
      .data,
};
export function apiError(error: unknown): string {
  const e = error as {
    response?: { data?: { error?: { message?: string } } };
    message?: string;
  };
  return e.response?.data?.error?.message || e.message || "Please try again.";
}
