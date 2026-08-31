import apiClient from './client';

export type ExamStatus = 'draft' | 'published' | 'closed';
export type ExamReviewMode = 'none' | 'respondent_answers' | 'with_correct_answers';
export type ExamQuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'short_text';

export interface ExamListItem {
  id: string;
  title: string;
  description: string | null;
  status: ExamStatus;
  publicId: string;
  durationMinutes: number;
  preventFocusLoss: boolean;
  maxAttempts: number;
  updatedAt: string;
  attemptCount: number;
  archivedAt: string | null;
}

export interface ExamOption {
  id: string;
  label: string;
  position: number;
}

export interface ExamQuestion {
  id: string;
  examId: string;
  sectionId: string | null;
  type: ExamQuestionType;
  prompt: string;
  explanation: string | null;
  position: number;
  required: boolean;
  graded: boolean;
  points: number;
  pinned: boolean;
  maxTimeSeconds: number | null;
  correctAnswers: string[];
  options: ExamOption[];
}

export interface ExamSection {
  id: string;
  title: string;
  description: string | null;
  position: number;
  pinned: boolean;
}

export interface ExamDefinition {
  id: string;
  orgId: string;
  createdByUserId: string;
  title: string;
  description: string | null;
  status: ExamStatus;
  publicId: string;
  durationMinutes: number;
  oneQuestionAtATime: boolean;
  preventFocusLoss: boolean;
  maxAttempts: number;
  reviewMode: ExamReviewMode;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  requireEmail: boolean;
  requireIdentifier: boolean;
  startsAt: string | null;
  endsAt: string | null;
  archivedAt: string | null;
  archivedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  sections: ExamSection[];
  questions: ExamQuestion[];
  attemptCount: number;
}

export interface ExamOrgSettings {
  journeyMode: 'exam_first' | 'standard';
  visibleTopLevelApps: Array<'exams' | 'airunote'>;
}

export interface ExamOptionInput {
  id?: string;
  key?: string;
  label: string;
}

export interface ExamQuestionInput {
  id?: string;
  sectionId?: string | null;
  sectionKey?: string | null;
  type: ExamQuestionType;
  prompt: string;
  explanation?: string | null;
  position?: number;
  required?: boolean;
  graded?: boolean;
  points?: number;
  pinned?: boolean;
  maxTimeSeconds?: number | null;
  correctAnswers?: string[];
  options?: ExamOptionInput[];
}

export interface ExamSectionInput {
  id?: string;
  key?: string;
  title: string;
  description?: string | null;
  position?: number;
  pinned?: boolean;
}

export interface ExamInput {
  title: string;
  publicId?: string;
  description?: string | null;
  status?: ExamStatus;
  durationMinutes?: number;
  oneQuestionAtATime?: boolean;
  preventFocusLoss?: boolean;
  maxAttempts?: number;
  reviewMode?: ExamReviewMode;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  requireEmail?: boolean;
  requireIdentifier?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  sections?: ExamSectionInput[];
  questions?: ExamQuestionInput[];
}

export interface ExamReportRespondent {
  id: string;
  respondentName: string;
  respondentEmail: string | null;
  respondentIdentifier: string | null;
  attemptNumber: number;
  status: 'in_progress' | 'completed' | 'terminated' | 'timed_out' | 'abandoned' | 'void';
  classification: 'active' | 'inactive_stale' | 'focus_terminated' | 'timed_out' | 'abandoned' | 'submitted' | 'terminated' | 'void';
  terminationReason: string | null;
  focusViolationCount: number;
  startedAt: string;
  completedAt: string | null;
  endedAt: string | null;
  lastActiveAt: string;
  timeInExamSeconds: number;
  remainingSeconds: number;
  active: boolean;
  needsAdmin: boolean;
  eligibleForContinue: boolean;
  activeQuestionId: string | null;
  earnedPoints: number;
  possiblePoints: number;
  percentage: number | null;
  scoreIsProvisional: boolean;
  answers: Record<string, string[]>;
  isPreview: boolean;
  previewedByEmail: string | null;
  previewedByRole: string | null;
  voidedAt: string | null;
  voidReason: string | null;
}

export interface ExamReport {
  exam: ExamDefinition;
  generatedAt: string;
  summary: { totalAttempts: number; completed: number; inProgress: number; terminated: number; needsAdmin: number; activeNow: number; inactiveStale: number; timedOut: number; voided: number; previews: number };
  respondents: ExamReportRespondent[];
  questionPerformance: Array<{
    questionId: string;
    prompt: string;
    graded: boolean;
    points: number;
    answeredCount: number;
    skippedCount: number;
    correctCount: number;
    incorrectCount: number;
    averageResponseSeconds: number | null;
    correctPercentage: number | null;
    correctRespondents: Array<{ id: string; name: string }>;
    incorrectRespondents: Array<{ id: string; name: string }>;
    optionPerformance: Array<{ optionId: string; label: string; selectedCount: number; selectedPercentage: number; correct: boolean; respondents: Array<{ id: string; name: string }> }>;
  }>;
  recentEvents: Array<{ id: string; attemptId: string; eventType: string; metadata: Record<string, unknown>; createdAt: string }>;
}

export interface PublicExamOverview {
  publicId: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  oneQuestionAtATime: boolean;
  preventFocusLoss: boolean;
  maxAttempts: number;
  requireEmail: boolean;
  requireIdentifier: boolean;
  availability: 'open' | 'upcoming' | 'ended' | 'unavailable';
  startsAt: string | null;
  endsAt: string | null;
  serverTime: string;
  questionCount: number;
  totalPoints: number;
}

export interface PublicAttemptQuestion {
  id: string;
  sectionId: string | null;
  type: ExamQuestionType;
  prompt: string;
  position: number;
  required: boolean;
  points: number;
  maxTimeSeconds: number | null;
  timeStartedAt: string | null;
  timeRemainingSeconds: number | null;
  timedOut: boolean;
  options: Array<{ id: string; label: string }>;
  selectedAnswers: string[];
  correctAnswers?: string[];
  explanation?: string | null;
}

export interface PublicAttempt {
  id: string;
  publicId: string;
  title: string;
  description: string | null;
  status: 'in_progress' | 'completed' | 'terminated' | 'timed_out' | 'abandoned' | 'void';
  terminationReason: string | null;
  attemptNumber: number;
  startedAt: string;
  completedAt: string | null;
  endedAt: string | null;
  isPreview: boolean;
  previewedByEmail: string | null;
  previewedByRole: string | null;
  remainingSeconds: number;
  durationMinutes: number;
  oneQuestionAtATime: boolean;
  preventFocusLoss: boolean;
  reviewMode: ExamReviewMode;
  startsAt: string | null;
  endsAt: string | null;
  sections: ExamSection[];
  questions: PublicAttemptQuestion[];
}

function unwrap<T>(response: { data: { success: boolean; data: T } }): T {
  return response.data.data;
}

export const examsApi = {
  list: async (orgId: string, archived = false): Promise<ExamListItem[]> => unwrap(await apiClient.get(`/orgs/${orgId}/exams`, { params: archived ? { archived: 'true' } : undefined })),
  get: async (orgId: string, examId: string): Promise<ExamDefinition> => unwrap(await apiClient.get(`/orgs/${orgId}/exams/${examId}`)),
  create: async (orgId: string, input: ExamInput): Promise<ExamDefinition> => unwrap(await apiClient.post(`/orgs/${orgId}/exams`, input)),
  importJson: async (orgId: string, input: ExamInput): Promise<ExamDefinition> => unwrap(await apiClient.post(`/orgs/${orgId}/exams/import`, input)),
  update: async (orgId: string, examId: string, input: Partial<Omit<ExamInput, 'questions' | 'sections'>>): Promise<ExamDefinition> => unwrap(await apiClient.patch(`/orgs/${orgId}/exams/${examId}`, input)),
  replaceDefinition: async (orgId: string, examId: string, input: ExamInput): Promise<ExamDefinition> => unwrap(await apiClient.put(`/orgs/${orgId}/exams/${examId}/definition`, input)),
  archive: async (orgId: string, examId: string): Promise<void> => { await apiClient.post(`/orgs/${orgId}/exams/${examId}/archive`); },
  restore: async (orgId: string, examId: string): Promise<void> => { await apiClient.post(`/orgs/${orgId}/exams/${examId}/restore`); },
  duplicate: async (orgId: string, examId: string): Promise<ExamDefinition> => unwrap(await apiClient.post(`/orgs/${orgId}/exams/${examId}/duplicate`)),
  preview: async (orgId: string, examId: string): Promise<{ accessToken: string; publicId: string; path: string }> => unwrap(await apiClient.post(`/orgs/${orgId}/exams/${examId}/preview`)),
  getSettings: async (orgId: string): Promise<ExamOrgSettings> => unwrap(await apiClient.get(`/orgs/${orgId}/exams/settings`)),
  updateSettings: async (orgId: string, input: ExamOrgSettings): Promise<ExamOrgSettings> => unwrap(await apiClient.put(`/orgs/${orgId}/exams/settings`, input)),
  updateQuestionGrading: async (orgId: string, examId: string, questionId: string, input: { graded: boolean; points: number; correctAnswers: string[]; explanation?: string | null }): Promise<ExamDefinition> =>
    unwrap(await apiClient.patch(`/orgs/${orgId}/exams/${examId}/questions/${questionId}/grading`, input)),
  report: async (orgId: string, examId: string): Promise<ExamReport> => unwrap(await apiClient.get(`/orgs/${orgId}/exams/${examId}/report`)),
  continueAttempt: async (orgId: string, examId: string, attemptId: string, additionalMinutes: number): Promise<{ accessToken: string; publicId: string; path: string }> =>
    unwrap(await apiClient.post(`/orgs/${orgId}/exams/${examId}/attempts/${attemptId}/continue`, { additionalMinutes })),
  voidAttempt: async (orgId: string, examId: string, attemptId: string, reason: string): Promise<void> => {
    await apiClient.post(`/orgs/${orgId}/exams/${examId}/attempts/${attemptId}/void`, { reason });
  },
};

function attemptHeaders(accessToken: string) {
  return { headers: { 'x-exam-attempt-token': accessToken } };
}

export const publicExamsApi = {
  overview: async (publicId: string): Promise<PublicExamOverview> => unwrap(await apiClient.get(`/public/exams/${publicId}`)),
  start: async (publicId: string, input: { respondentName: string; respondentEmail?: string | null; respondentIdentifier?: string | null; deviceId: string }): Promise<{ accessToken: string; attempt: PublicAttempt }> =>
    unwrap(await apiClient.post(`/public/exams/${publicId}/start`, input)),
  current: async (accessToken: string): Promise<PublicAttempt> => unwrap(await apiClient.get('/public/exams/attempts/current', attemptHeaders(accessToken))),
  activateQuestion: async (accessToken: string, questionId: string): Promise<PublicAttempt> =>
    unwrap(await apiClient.post(`/public/exams/attempts/current/questions/${questionId}/activate`, {}, attemptHeaders(accessToken))),
  expireQuestion: async (accessToken: string, questionId: string, answer: string[]): Promise<PublicAttempt> =>
    unwrap(await apiClient.post(`/public/exams/attempts/current/questions/${questionId}/expire`, { answer }, attemptHeaders(accessToken))),
  saveAnswer: async (accessToken: string, questionId: string, answer: string[]): Promise<{ savedAt: string }> =>
    unwrap(await apiClient.put(`/public/exams/attempts/current/answers/${questionId}`, { answer }, attemptHeaders(accessToken))),
  event: async (accessToken: string, eventType: 'focus_lost' | 'heartbeat', metadata: Record<string, unknown> = {}): Promise<PublicAttempt> =>
    unwrap(await apiClient.post('/public/exams/attempts/current/events', { eventType, metadata }, attemptHeaders(accessToken))),
  submit: async (accessToken: string): Promise<PublicAttempt> => unwrap(await apiClient.post('/public/exams/attempts/current/submit', {}, attemptHeaders(accessToken))),
};
