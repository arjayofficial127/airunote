/** Shared by JSON import, the editor, and API validation. No runtime dependencies. */
export interface SectionReference { id?: string; key?: string; position?: number }
export interface QuestionReference { sectionId?: string | null; sectionKey?: string | null; position?: number }
export const sectionReference = (section: SectionReference, index = 0) => section.id ?? section.key ?? `section-${index + 1}`;
export const questionReference = (question: QuestionReference) => question.sectionId ?? question.sectionKey ?? '';
export function sectionIssues(input: { sections?: SectionReference[]; questions?: QuestionReference[] }): string[] {
  const refs = new Map<string, number>();
  const errors: string[] = [];
  (input.sections ?? []).forEach((section, index) => {
    for (const ref of new Set([section.id, section.key ?? section.id ?? `section-${index + 1}`].filter(Boolean) as string[])) {
      if (refs.has(ref)) errors.push(`Section reference “${ref}” is duplicated.`);
      refs.set(ref, index);
    }
  });
  (input.questions ?? []).forEach((question, index) => {
    if (question.sectionId && !(input.sections ?? []).some(s => s.id === question.sectionId)) errors.push(`Question ${index + 1} references a section ID outside this exam.`);
    const ids = [question.sectionId, question.sectionKey].filter(Boolean) as string[];
    if (ids.some(ref => !refs.has(ref))) errors.push(`Question ${index + 1} references a section outside this exam.`);
    if (ids.length === 2 && refs.get(ids[0]) !== refs.get(ids[1])) errors.push(`Question ${index + 1} has conflicting section references.`);
  });
  return errors;
}
export function normalizeStructure<S extends SectionReference, Q extends QuestionReference>(sections: S[], questions: Q[]) {
  const sorted = [...sections].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const groups = new Map<string, Q[]>([['', []]]);
  sorted.forEach((section, i) => groups.set(sectionReference(section, i), []));
  [...questions].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).forEach(question => {
    const section = sorted.find((s, i) => [s.id, s.key, sectionReference(s, i)].includes(questionReference(question)));
    const ref = section ? sectionReference(section, sorted.indexOf(section)) : '';
    groups.get(ref)!.push(question);
  });
  return { sections: sorted.map((section, position) => ({ ...section, key: section.key ?? (section.id ? undefined : `section-${position + 1}`), position })), questions: [...groups.values()].flat().map((question, position) => ({ ...question, position })) };
}
export function removeSection<S extends SectionReference, Q extends QuestionReference>(sections: S[], questions: Q[], source: string, destination: string) {
  const sourceSection = sections.find((s, i) => sectionReference(s, i) === source);
  const target = sections.find((s, i) => sectionReference(s, i) === destination);
  if (!sourceSection || source === destination || (destination && !target)) throw new Error('Choose a valid destination.');
  const belongs = (q: Q) => questionReference(q) === source || (!!sourceSection.key && q.sectionKey === sourceSection.key);
  const moved = [...questions].filter(belongs).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const kept = questions.filter(q => !belongs(q));
  const end = Math.max(-1, ...questions.map(q => q.position ?? 0)) + 1;
  return normalizeStructure(sections.filter(s => s !== sourceSection), [...kept, ...moved.map((q, i) => ({ ...q, sectionId: target?.id ?? null, sectionKey: target?.id ? null : target?.key ?? (target ? destination : null), position: end + i }))]);
}
