import React from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <h1
          className="font-heading"
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#F9FAFB',
            margin: 0,
          }}
        >
          {title}
        </h1>
        <p
          className="font-description"
          style={{
            fontSize: 13,
            color: '#9CA3AF',
            margin: '4px 0 0',
          }}
        >
          {description}
        </p>
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}
