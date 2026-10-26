import React from 'react';
import s from './companyPage.module.css';

/**
 * Error boundary for one page section. Admin content is data, and a shape the
 * renderer did not expect must cost one section — never the whole page, the
 * cart or the reader around it. The failure is logged with the section type so
 * it can be found, and the student sees a short notice with a retry.
 */
export class SectionBoundary extends React.Component<
  { label: string; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`[CompanyPage] section "${this.props.label}" failed to render`, error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className={s.wrap}>
        <div className={s.sectionError} role="status">
          This part of the page couldn’t load.{' '}
          <button type="button" className={s.textLink} onClick={() => this.setState({ failed: false })}>
            Try again
          </button>
        </div>
      </div>
    );
  }
}
