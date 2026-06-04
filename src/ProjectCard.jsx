import React from 'react';

// Den här funktionen tar emot "props" (data) och ritar ut ett kort
function ProjectCard({ name, date, cost, category }) {
  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>{name}</h3>
        <span style={{ fontSize: '14px', color: '#666' }}>{date}</span>
        <div style={{ marginTop: '8px' }}>
          <span style={{
            backgroundColor: '#f0f0f0',
            padding: '4px 8px',
            borderRadius: '20px',
            fontSize: '12px',
            color: '#333'
          }}>{category}</span>
        </div>
      </div>
      <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
        {cost > 0 ? `${cost.toLocaleString()} kr` : '0 kr'}
      </div>
    </div>
  );
}

export default ProjectCard;