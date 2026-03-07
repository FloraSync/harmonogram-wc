import type { ValidationIssue } from './types.js';

const MAX_RENDERED_ISSUES = 8;

function formatIssues(issues: ValidationIssue[]): string {
  if (issues.length === 0) {
    return '';
  }

  const listed = issues
    .slice(0, MAX_RENDERED_ISSUES)
    .map((issue) => `- ${issue.path}: ${issue.message}`)
    .join('\n');
  const remainder = issues.length - MAX_RENDERED_ISSUES;
  const remainderLine = remainder > 0 ? `\n- ...and ${remainder} more issue(s)` : '';

  return `\n${listed}${remainderLine}`;
}

export class ValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(context: string, issues: ValidationIssue[]) {
    super(`${context}.${formatIssues(issues)}`);
    this.name = 'ValidationError';
    this.issues = [...issues];
  }
}
